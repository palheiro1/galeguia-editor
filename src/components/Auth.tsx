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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  buttonDisabled: {
    backgroundColor: '#a0c4ff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
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
