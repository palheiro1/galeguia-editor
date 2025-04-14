import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import Auth from './src/components/Auth';
import CourseListScreen from './src/screens/CourseListScreen';
import CourseEditScreen from './src/screens/CourseEditScreen';
import ModuleEditScreen from './src/screens/ModuleEditScreen';
import LessonEditScreen from './src/screens/LessonEditScreen';
import { supabase } from './src/lib/supabase';

// Define the stack navigator types
type RootStackParamList = {
  CourseList: undefined;
  CourseEdit: { courseId: string | null; refresh?: boolean };
  ModuleEdit: { courseId: string; moduleId: string | null; refresh?: boolean };
  LessonEdit: { moduleId: string; lessonId: string | null; refresh?: boolean };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Component to handle auth redirects from email confirmations
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setAuthChecked(true);
      return;
    }

    const handleAuthFromUrl = async () => {
      try {
        await supabase.auth.getSession();

        if (window.location.hash && window.location.hash.includes('access_token')) {
          const cleanUrl = window.location.href.split('#')[0];
          window.history.replaceState(null, '', cleanUrl);
        }
      } catch (error) {
        console.error("Error handling auth from URL:", error);
      }

      setAuthChecked(true);
    };

    handleAuthFromUrl();
  }, []);

  if (!authChecked && Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Processing authentication...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

// Main content component that shows different screens based on auth state
function MainContent() {
  const { session, isLoading, profile, signOut } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (session && !profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading user profile.</Text>
        <Text style={styles.infoText}>
          Could not retrieve profile information. Please contact support or try signing out and back in.
        </Text>
        <TouchableOpacity style={styles.signOutButtonContainer} onPress={signOut}>
          <Text style={styles.signOutButton}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="CourseList">
        <Stack.Screen 
          name="CourseList" 
          component={CourseListScreen} 
          options={{
            title: "My Courses",
            headerRight: () => (
              <Text style={styles.signOutButton} onPress={signOut}> 
                Sign Out
              </Text>
            ),
          }}
        />
        <Stack.Screen 
          name="CourseEdit" 
          component={CourseEditScreen} 
          options={({ route }) => ({
            title: route.params?.courseId ? "Edit Course" : "Create Course",
          })}
        />
        <Stack.Screen 
          name="ModuleEdit" 
          component={ModuleEditScreen} 
          options={({ route }) => ({
            title: route.params?.moduleId ? "Edit Module" : "Create Module",
          })}
        />
        <Stack.Screen 
          name="LessonEdit" 
          component={LessonEditScreen} 
          options={({ route }) => ({
            title: route.params?.lessonId ? "Edit Lesson" : "Create Lesson",
          })}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

// Main App component with AuthProvider wrapper and AuthRedirect
export default function App() {
  return (
    <AuthRedirect> 
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </AuthRedirect>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  infoText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#555',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ea4335',
    marginBottom: 10,
    textAlign: 'center',
  },
  signOutButtonContainer: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fce8e6',
    borderRadius: 5,
  },
  signOutButton: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: 'bold',
    padding: Platform.OS === 'web' ? 10 : 0,
    marginRight: Platform.OS === 'web' ? 10 : 0,
  },
});