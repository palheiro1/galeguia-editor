import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { AppState } from 'react-native';

// Setup automatic token refresh when app comes to foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Get the current URL for redirects (web platform only)
  const getURL = () => {
    if (Platform.OS !== 'web') return undefined;
    const url = window.location.href;
    const baseUrl = url.split('#')[0]; // Remove any hash/fragment
    return baseUrl;
  };

  async function signInWithEmail() {
    setLoading(true);
    setErrorMsg(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        Alert.alert('Error', error.message);
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setErrorMsg('An unexpected error occurred');
      Alert.alert('Error', 'An unexpected error occurred during sign in');
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithEmail() {
    if (!email || !password) {
      setErrorMsg('Please provide both email and password');
      Alert.alert('Error', 'Please provide both email and password');
      return;
    }
    
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    
    // Include redirect URLs for web platform
    const options = Platform.OS === 'web' 
      ? {
          emailRedirectTo: getURL(),
        } 
      : {};
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          ...options,
          data: { 
            role: 'creator' // Default role for new users
          }
        }
      });

      if (error) {
        setErrorMsg(error.message);
        Alert.alert('Error', error.message);
      } else if (data?.user) {
        Alert.alert(
          'Success', 
          'Account created successfully! Please check your email for confirmation.'
        );
        // Switch to login view after successful signup
        setIsLogin(true);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setErrorMsg('An unexpected error occurred');
      Alert.alert('Error', 'An unexpected error occurred during signup');
    } finally {
      setLoading(false);
    }
  }

  // Session recovery function
  async function recoverSession() {
    setLoading(true);
    setErrorMsg(null);
    
    try {
      console.log('Attempting session recovery...');
      
      // Try to refresh the current session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error);
        
        // If refresh fails, try to get the session from storage
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session retrieval failed:', sessionError);
          setErrorMsg('Session recovery failed. Please sign in again.');
          Alert.alert('Session Recovery Failed', 'Unable to recover your session. Please sign in again.');
        } else if (sessionData.session) {
          console.log('Session recovered from storage');
          Alert.alert('Session Recovered', 'Your session has been restored.');
        } else {
          setErrorMsg('No valid session found. Please sign in.');
          Alert.alert('No Session Found', 'No valid session found. Please sign in.');
        }
      } else if (data.session) {
        console.log('Session refreshed successfully');
        Alert.alert('Session Recovered', 'Your session has been refreshed.');
      }
    } catch (err) {
      console.error('Session recovery error:', err);
      setErrorMsg('Session recovery failed. Please try signing in.');
      Alert.alert('Recovery Error', 'Unable to recover session. Please try signing in.');
    } finally {
      setLoading(false);
    }
  }

  // Clear storage and reset
  async function clearStorageAndReset() {
    setLoading(true);
    setErrorMsg(null);
    
    try {
      console.log('Clearing storage and resetting...');
      
      // Sign out to clear any existing session
      await supabase.auth.signOut();
      
      // For web, also clear localStorage
      if (Platform.OS === 'web') {
        try {
          window.localStorage.removeItem('galeguia-auth');
          Object.keys(window.localStorage).forEach(key => {
            if (key.startsWith('supabase.auth.token')) {
              window.localStorage.removeItem(key);
            }
          });
        } catch (storageError) {
          console.error('Error clearing localStorage:', storageError);
        }
      }
      
      setEmail('');
      setPassword('');
      Alert.alert('Storage Cleared', 'Authentication storage has been cleared. Please sign in again.');
    } catch (err) {
      console.error('Clear storage error:', err);
      setErrorMsg('Failed to clear storage.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.header}>
          {isLogin ? 'Sign In to Galeguia Editor' : 'Create an Account'}
        </Text>
        
        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : null}
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(text) => setEmail(text)}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          secureTextEntry={true}
          autoCapitalize="none"
          onChangeText={(text) => setPassword(text)}
        />

        <TouchableOpacity 
          style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
          onPress={() => isLogin ? signInWithEmail() : signUpWithEmail()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? 'Sign In' : 'Sign Up'}
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Session Recovery Buttons - Only show on login screen */}
        {isLogin && (
          <View style={styles.recoveryContainer}>
            <Text style={styles.recoveryTitle}>Having trouble signing in?</Text>
            
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={recoverSession}
              disabled={loading}
            >
              <Text style={styles.buttonSecondaryText}>Recover Session</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.buttonDanger]}
              onPress={clearStorageAndReset}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Clear Storage & Reset</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => {
            setIsLogin(!isLogin);
            setErrorMsg(null);
            setEmail('');
            setPassword('');
          }}
          disabled={loading}
        >
          <Text style={styles.switchText}>
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    // Replace shadow* properties with boxShadow for web
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)', // Use boxShadow for web
      }
    }),
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#fff',
  },
  button: {
    height: 50,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonPrimary: {
    backgroundColor: '#4285F4',
  },
  buttonSecondary: {
    backgroundColor: '#6c757d',
  },
  buttonDanger: {
    backgroundColor: '#dc3545',
  },
  buttonDisabled: {
    backgroundColor: '#a0c4ff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonSecondaryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  recoveryContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  recoveryTitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  switchButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  switchText: {
    color: '#4285F4',
  },
  errorText: {
    color: '#ea4335',
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
  },
});
