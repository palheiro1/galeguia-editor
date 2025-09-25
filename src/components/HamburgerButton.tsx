import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../styles/designSystem';
import { useSidebar } from '../contexts/SidebarContext';

const HamburgerButton: React.FC = () => {
  const { isMobile, toggleSidebar } = useSidebar();

  // Only show on mobile
  if (!isMobile) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.hamburger} onPress={toggleSidebar}>
      <MaterialIcons name="menu" size={24} color={COLORS.text} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  hamburger: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
    marginRight: 8,
  },
});

export default HamburgerButton;