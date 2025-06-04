import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { AppState } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Define the shape of our profile data
type ProfileData = {
  username: string | null;
  role: 'admin' | 'creator';
};

// Define the context type
type AuthContextType = {
  session: Session | null;
  profile: ProfileData | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props for the provider component
type AuthProviderProps = {
  children: ReactNode;
};

// Create the provider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch user profile data
  async function getProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error, status } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('user_id', user.id)
        .single();
      
      if (error && status !== 406) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as ProfileData;
    } catch (error) {
      console.error('Error getting profile:', error);
      return null;
    }
  }

  // Refresh profile information
  async function refreshProfile() {
    const profileData = await getProfile();
    setProfile(profileData);
  }

  // Sign out function
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      setProfile(null);
    }
  }

  // Set up auth state management
  useEffect(() => {
    let mounted = true;

    // Get initial session with better error handling
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error fetching initial session:", error);
          // Try to refresh the session if there's an error
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          if (mounted) {
            setSession(refreshedSession);
            if (refreshedSession) {
              await refreshProfile();
            }
          }
        } else {
          if (mounted) {
            setSession(initialSession);
            if (initialSession) {
              await refreshProfile();
            }
          }
        }
      } catch (error) {
        console.error("Error in auth initialization:", error);
        if (mounted) {
          setSession(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event, !!newSession);
        
        if (mounted) {
          setSession(newSession);
          
          // Handle different auth events
          if (newSession && ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
            await refreshProfile();
          } else if (!newSession && event === 'SIGNED_OUT') {
            setProfile(null);
          }
        }
      }
    );

    // Setup app state change listener to manage token refresh
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
        // Try to refresh session when app becomes active
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (mounted && session) {
            setSession(session);
          }
        }).catch(error => {
          console.error('Error refreshing session on app active:', error);
        });
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    // Start auto refresh when component mounts
    supabase.auth.startAutoRefresh();

    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
      appStateSubscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  // Provide the auth context
  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isLoading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};