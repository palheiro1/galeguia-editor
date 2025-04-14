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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        refreshProfile();
      }
      setIsLoading(false);
    });

    // Set up listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        
        // Only refresh profile on specific events
        if (newSession && ['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) {
          await refreshProfile();
        } else if (!newSession) {
          setProfile(null);
        }
      }
    );

    // Setup app state change listener to manage token refresh
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    // Start auto refresh when component mounts
    supabase.auth.startAutoRefresh();

    // Cleanup function
    return () => {
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