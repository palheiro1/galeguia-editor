import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../styles/designSystem';
import HamburgerButton from './HamburgerButton';

interface ModernTopBarProps {
  onNewCourse: () => void;
  onToggleView: (view: 'cards' | 'table') => void;
  currentView: 'cards' | 'table';
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isMobile?: boolean;
}

const ModernTopBar: React.FC<ModernTopBarProps> = ({
  onNewCourse,
  onToggleView,
  currentView,
  searchQuery,
  onSearchChange,
  isMobile = false,
}) => {
  return (
    <View style={styles.topbar}>
      <View style={styles.topbarInner}>
        <View style={styles.leftSection}>
          <HamburgerButton />
          <View style={styles.search}>
            <MaterialIcons name="search" size={20} color={COLORS.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar cursos por título, autor, estado…"
              placeholderTextColor={COLORS.muted}
              value={searchQuery}
              onChangeText={onSearchChange}
            />
          </View>
        </View>
        
        <View style={styles.toolbar}>
          {!isMobile && (
            <View style={styles.segmentedControl}>
              <TouchableOpacity 
                style={[
                  styles.segButton, 
                  currentView === 'cards' && styles.segButtonActive
                ]}
                onPress={() => onToggleView('cards')}
              >
                <Text style={[
                  styles.segButtonText,
                  currentView === 'cards' && styles.segButtonTextActive
                ]}>
                  Cartões
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.segButton, 
                  currentView === 'table' && styles.segButtonActive
                ]}
                onPress={() => onToggleView('table')}
              >
                <Text style={[
                  styles.segButtonText,
                  currentView === 'table' && styles.segButtonTextActive
                ]}>
                  Tabela
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {!isMobile && (
            <>
              <TouchableOpacity style={styles.btn}>
                <Text style={styles.btnText}>Estado ▾</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.btn}>
                <Text style={styles.btnText}>Ordenar ▾</Text>
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity style={styles.btnPrimary} onPress={onNewCourse}>
            <MaterialIcons name="add" size={20} color="white" />
            <Text style={[styles.btnPrimaryText, isMobile && styles.btnPrimaryTextMobile]}>
              {isMobile ? "Novo" : "Novo Curso"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topbar: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 10,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  topbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 8,
    paddingHorizontal: 10,
    maxWidth: 680,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontSize: 14,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  segButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  segButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  segButtonText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '400',
  },
  segButtonTextActive: {
    color: COLORS.text,
  },
  btn: {
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnText: {
    color: COLORS.text,
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...SHADOWS.sm,
  },
  btnPrimaryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  btnPrimaryTextMobile: {
    fontSize: 12,
  },
});

export default ModernTopBar;