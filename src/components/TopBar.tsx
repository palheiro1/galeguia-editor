import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Assuming your RootStackParamList is defined in App.tsx or a types file
type RootStackParamList = {
  CourseList: undefined;
  CourseEdit: { courseId: string | null; refresh?: boolean };
  ModuleEdit: { courseId: string; moduleId: string | null; refresh?: boolean };
  LessonEdit: { moduleId: string; lessonId: string | null; refresh?: boolean };
  ProfileEdit: undefined; // Added ProfileEditScreen
};

type TopBarNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfileEdit'>;

const TopBar = () => {
  const { profile, signOut } = useAuth();
  const navigation = useNavigation<TopBarNavigationProp>();

  if (!profile) {
    return null; // Or a loading indicator, though App.tsx should prevent this state
  }

  const handleUpdateProfile = () => {
    navigation.navigate('ProfileEdit');
  };

  const displayName = profile.username || 'User';
  const displayRole = profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'No Role';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{displayName}</Text>
          <Text style={styles.role}>{displayRole}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleUpdateProfile} style={styles.button}>
            <Text style={styles.buttonText}>Update Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={[styles.button, styles.signOutButton]}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DEE2E6',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'android' ? 12 : 10, // Adjust padding for Android status bar
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
  },
  userInfo: {
    flexShrink: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  role: {
    fontSize: 12,
    color: '#6C757D',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
  },
  button: {
    marginLeft: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#007BFF',
    borderRadius: 6,
  },
  signOutButton: {
    backgroundColor: '#6C757D', // A more subtle color for sign out
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default TopBar;