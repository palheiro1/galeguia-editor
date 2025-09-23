import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileEditScreen from './src/screens/ProfileEditScreen'; // Import the new screen
import TopBar from './src/components/TopBar'; // Import the TopBar component
import { supabase } from './src/lib/supabase'; // Import supabase
import CourseListScreen from './src/screens/CourseListScreen';
import ModernCourseListScreen from './src/screens/ModernCourseListScreen'; // New modern design
import CourseEditScreen from './src/screens/CourseEditScreen';
import ModuleEditScreen from './src/screens/ModuleEditScreen';
import LessonEditScreen from './src/screens/LessonEditScreen';
import EditPageScreen from './src/screens/PageEditScreen'; // Import EditPageScreen
import ModernPageEditScreen from './src/screens/ModernPageEditScreen'; // Modern PageEdit design
import GrainEditScreen from './src/screens/GrainEditScreen'; // Import GrainEditScreen
import PageTestScreen from './src/screens/PageTestScreen'; // Import PageTestScreen
import CourseBuilderScreen from './src/screens/CourseBuilderScreen'; // Import new CourseBuilderScreen
import ModernCourseBuilderScreen from './src/screens/ModernCourseBuilderScreen'; // Modern CourseBuilder
import ImprovedGrainEditorScreen from './src/screens/ImprovedGrainEditorScreen'; // Import improved grain editor
import Auth from './src/components/Auth';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';


// Define the stack navigator types
type RootStackParamList = {
  CourseList: undefined;
  ModernCourseList: undefined; // New modern design
  CourseEdit: { courseId: string | null; refresh?: boolean };
  CourseBuilder: { courseId: string; refresh?: boolean }; // New improved course builder
  ModuleEdit: { courseId: string; moduleId: string | null; refresh?: boolean };
  LessonEdit: { moduleId: string; lessonId: string | null; refresh?: boolean };
  PageEdit: { lessonId: string; pageId?: string | null; refresh?: boolean }; // Add PageEditScreen
  GrainEdit: { pageId: string; grainId?: string | null; position?: number; refresh?: boolean }; // Add GrainEditScreen
  ImprovedGrainEdit: { pageId: string; grainId?: string | null; position?: number; expectedGrainType?: string; pageType?: string; refresh?: boolean }; // New improved grain editor
  PageTest: { pageId: string; pageTitle?: string }; // Add PageTestScreen for "Provar Página" feature
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

    // For Netlify and other web hosts, detect auth in URL and handle session restoration
    const processAuthRedirect = async () => {
      try {
        const currentUrl = window.location.href;
        console.log('Processing auth redirect for URL:', currentUrl);

        // Check if this is an auth callback URL
        const isAuthCallback = currentUrl.includes('#access_token') || 
                              currentUrl.includes('access_token=') ||
                              currentUrl.includes('refresh_token=') ||
                              currentUrl.includes('error=');

        if (isAuthCallback) {
          console.log('Detected auth callback, processing...');
          
          // Let Supabase handle the auth callback
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error processing auth callback:', error);
          } else {
            console.log('Auth callback processed successfully:', !!data.session);
          }
          
          // Clean up the URL by removing hash parameters
          const cleanUrl = window.location.href.split('#')[0];
          window.history.replaceState(null, '', cleanUrl);
        } else {
          // Just check if we have a valid session
          console.log('No auth callback detected, checking existing session...');
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error checking session:', error);
          } else {
            console.log('Session check result:', !!data.session);
          }
        }
      } catch (error) {
        console.error("Error processing auth redirect:", error);
      } finally {
        setAuthChecked(true);
      }
    };

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(processAuthRedirect, 100);
    
    return () => clearTimeout(timer);
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
          }}
        >
          <Stack.Screen
            name="CourseList"
            component={ModernCourseListScreen}
            options={{
              title: "Meus Cursos",
              headerShown: false, // Hide header for modern design
            }}
          />
          <Stack.Screen
            name="ModernCourseList"
            component={ModernCourseListScreen}
            options={{
              title: "Meus Cursos",
              headerShown: false, // Hide header for modern design
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
            name="PageEdit"
            component={ModernPageEditScreen}
            options={({ route }) => ({
              title: route.params?.pageId ? "Editar Página" : "Criar Página",
              headerShown: false, // Hide header for modern design
            })}
          />
          <Stack.Screen
            name="GrainEdit"
            component={GrainEditScreen}
            options={({ route }) => ({
              title: route.params?.grainId ? "Editar Grain" : "Criar Grain",
            })}
          />
          <Stack.Screen
            name="PageTest"
            component={PageTestScreen}
            options={{ title: "Provar Página" }}
          />
          <Stack.Screen
            name="CourseBuilder"
            component={ModernCourseBuilderScreen}
            options={{ 
              title: "Construtor de Curso",
              headerShown: false, // Hide header for modern design
            }}
          />
          <Stack.Screen
            name="ImprovedGrainEdit"
            component={ImprovedGrainEditorScreen}
            options={({ route }) => ({
              title: route.params?.grainId ? "Editar Exercício" : "Criar Exercício",
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
    <ErrorBoundary>
      <AuthRedirect>
        <AuthProvider>
          <MainContent />
        </AuthProvider>
      </AuthRedirect>
    </ErrorBoundary>
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
