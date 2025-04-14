import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import Auth from './src/components/Auth';
import CourseListScreen from './src/screens/CourseListScreen';
import CourseEditScreen from './src/screens/CourseEditScreen';
import ModuleEditScreen from './src/screens/ModuleEditScreen';
import LessonEditScreen from './src/screens/LessonEditScreen';

// Define the stack navigator types
type RootStackParamList = {
  CourseList: undefined;
  CourseEdit: { courseId: string | null; refresh?: boolean };
  ModuleEdit: { courseId: string; moduleId: string | null; refresh?: boolean };
  LessonEdit: { moduleId: string; lessonId: string | null; refresh?: boolean };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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

  // If no session, show the login/signup screen
  if (!session) {
    return <Auth />;
  }

  // If logged in but profile not loaded yet
  if (!profile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#4285F4" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // User is logged in - show the main app navigation
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

// Main App component with AuthProvider wrapper
export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
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
    color: '#777',
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
    color: '#4285F4',
  },
  infoText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#555',
  },
  signOutButton: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 10,
  },
});
