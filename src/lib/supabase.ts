import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';

// Use fixed values if environment variables are not available
// In production, these should be set in your deployment environment
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-supabase-project-url.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

// Use a web-compatible AsyncStorage adapter
const isWeb = typeof window !== 'undefined' && !!window.localStorage;

const AsyncStorageAdapter = isWeb
  ? {
      getItem: async (key: string) => {
        try {
          return window.localStorage.getItem(key);
        } catch (error) {
          console.error('Error getting item from localStorage:', error);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          window.localStorage.setItem(key, value);
        } catch (error) {
          console.error('Error setting item in localStorage:', error);
        }
      },
      removeItem: async (key: string) => {
        try {
          window.localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing item from localStorage:', error);
        }
      },
    }
  : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
    flowType: 'pkce',
    storageKey: 'galeguia-auth',
  }
});
