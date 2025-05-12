import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import Auth from './src/components/Auth';
import CourseListScreen from './src/screens/CourseListScreen';
import CourseEditScreen from './src/screens/CourseEditScreen';
import ModuleEditScreen from './src/screens/ModuleEditScreen';
import LessonEditScreen from './src/screens/LessonEditScreen';
import ProfileEditScreen from './src/screens/ProfileEditScreen'; // Import the new screen
import TopBar from './src/components/TopBar'; // Import the TopBar component
import { supabase } from './src/lib/supabase';

// Define the stack navigator types
type RootStackParamList = {
  CourseList: undefined;
  CourseEdit: { courseId: string | null; refresh?: boolean };
  ModuleEdit: { courseId: string; moduleId: string | null; refresh?: boolean };
  LessonEdit: { moduleId: string; lessonId: string | null; refresh?: boolean };
  ProfileEdit: undefined; // Add ProfileEditScreen to the list
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Component to handle auth redirects from email confirmations
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const [authChecked, setAuthChecked] = useState(false);
  
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Skip this logic for native platforms
      setAuthChecked(true);
      return;
    }

    // For Netlify and other web hosts, detect auth in URL
    const handleAuthFromUrl = async () => {
      try {
        // This will parse the URL for auth info, if present
        await supabase.auth.getSession();
        
        // Remove any hash fragments that may contain auth tokens
        if (window.location.hash && window.location.hash.includes('access_token')) {
          // Create clean URL without the hash fragments
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
        <ActivityIndicator size="large" color="#007BFF" />
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
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If no session, show the login/signup screen
  if (!session) {
    return <Auth />;
  }

  // If logged in but profile not loaded yet
  if (!profile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#007BFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // User is logged in - show the main app navigation
  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        <TopBar />
        <Stack.Navigator
          initialRouteName="CourseList"
          screenOptions={{
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: '#212529',
            headerTitleStyle: { fontWeight: '600', fontSize: 18 },
            headerBackTitleVisible: false,
          }}
        >
          <Stack.Screen
            name="CourseList"
            component={CourseListScreen}
            options={{
              title: "Meus Cursos", // This title is overridden by the component's header
              // headerRight is removed as Sign Out is now in TopBar
            }}
          />
          <Stack.Screen
            name="CourseEdit"
            component={CourseEditScreen}
            options={({ route }) => ({
              title: route.params?.courseId ? "Editar Curso" : "Criar Curso",
            })}
          />
          <Stack.Screen
            name="ModuleEdit"
            component={ModuleEditScreen}
            options={({ route }) => ({
              title: route.params?.moduleId ? "Editar Módulo" : "Criar Módulo",
            })}
          />
          <Stack.Screen
            name="LessonEdit"
            component={LessonEditScreen}
            options={({ route }) => ({
              title: route.params?.lessonId ? "Editar Lição" : "Criar Lição",
            })}
          />
          <Stack.Screen
            name="ProfileEdit"
            component={ProfileEditScreen}
            options={{ title: "Editar Perfil" }}
          />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </View>
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
    backgroundColor: '#F8F9FA', // Updated background
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6C757D', // Updated text color
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  roleText: {
    fontSize: 16,
    marginBottom: 8,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#007BFF', // Updated highlight color
  },
  infoText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#6C757D',
  },
});
