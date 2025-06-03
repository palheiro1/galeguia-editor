import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, ICON_SIZES } from '../styles/designSystem';
import { IconButton } from './UIComponents';

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
          <View style={styles.userAvatar}>
            <MaterialIcons name="account-circle" size={ICON_SIZES.xl} color={COLORS.primary} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.username}>{displayName}</Text>
            <Text style={styles.role}>{displayRole}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <IconButton
            icon="edit"
            onPress={handleUpdateProfile}
            size="sm"
            backgroundColor={COLORS.gray100}
            color={COLORS.textSecondary}
            style={styles.actionButton}
          />
          <IconButton
            icon="logout"
            onPress={signOut}
            size="sm"
            backgroundColor={COLORS.error}
            color={COLORS.white}
            style={styles.actionButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    marginRight: SPACING.md,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  role: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionButton: {
    marginLeft: 0,
  },
});

export default TopBar;