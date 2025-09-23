import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../styles/designSystem';
import { useAuth } from '../contexts/AuthContext';

interface ModernSidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

const ModernSidebar: React.FC<ModernSidebarProps> = ({
  currentRoute,
  onNavigate,
}) => {
  const { session } = useAuth();

  const navigationItems = [
    { key: 'CourseList', label: 'Cursos', icon: 'school' },
    { key: 'Library', label: 'Biblioteca', icon: 'library-books' },
    { key: 'Media', label: 'Mídia', icon: 'photo-library' },
    { key: 'People', label: 'Pessoas', icon: 'people' },
    { key: 'Settings', label: 'Definições', icon: 'settings' },
  ];

  return (
    <View style={styles.sidebar}>
      <View>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>GG</Text>
          </View>
          <View>
            <Text style={styles.appName}>Galeguia</Text>
            <Text style={styles.appSubtitle}>Editor de Cursos</Text>
          </View>
        </View>
        
        <View style={styles.nav}>
          {navigationItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.navItem,
                currentRoute === item.key && styles.navItemActive
              ]}
              onPress={() => onNavigate(item.key)}
            >
              <MaterialIcons 
                name={item.icon as any} 
                size={20} 
                color={currentRoute === item.key ? COLORS.text : COLORS.muted} 
              />
              <Text style={[
                styles.navText,
                currentRoute === item.key && styles.navTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.user}>
        <Text style={styles.userText}>
          Sessão: <Text style={styles.userEmail}>{session?.user?.email}</Text>
        </Text>
        <Text style={styles.userRole}>Papel: Admin</Text>
        <View style={styles.spacer} />
        <TouchableOpacity style={styles.themeButton}>
          <Text style={styles.themeButtonText}>Alternar tema</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: COLORS.bg2,
    borderRightWidth: 1,
    borderRightColor: COLORS.line,
    padding: 16,
    width: 260,
    height: '100vh' as any,
    position: 'sticky' as any,
    top: 0,
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: COLORS.text,
  },
  appSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
  },
  nav: {
    gap: 6,
    marginTop: 16,
  },
  navItem: {
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
  },
  navText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  navTextActive: {
    color: COLORS.text,
  },
  user: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    borderStyle: 'dashed',
    paddingTop: 12,
  },
  userText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  userEmail: {
    fontWeight: '600',
    color: COLORS.text,
  },
  userRole: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  spacer: {
    height: 16,
  },
  themeButton: {
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg2,
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
  },
  themeButtonText: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
  },
});

export default ModernSidebar;