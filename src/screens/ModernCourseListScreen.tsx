import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../styles/designSystem';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ModernSidebar from '../components/ModernSidebar';
import ModernTopBar from '../components/ModernTopBar';
import ModernCourseCard from '../components/ModernCourseCard';

interface Course {
  id: string;
  title: string;
  description: string;
  author_email: string;
  published: boolean;
  cover_image_url?: string;
  created_at: string;
  modules_count?: number;
  pages_count?: number;
  progress?: number;
}

const ModernCourseListScreen: React.FC = () => {
  const navigation = useNavigation();
  const { session } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'cards' | 'table'>('cards');
  const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Erro', 'Não foi possível carregar os cursos');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.author_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || 
                         (activeFilter === 'published' && course.published) ||
                         (activeFilter === 'draft' && !course.published);
    
    return matchesSearch && matchesFilter;
  });

  const handleNewCourse = () => {
    (navigation as any).navigate('CourseEdit', { courseId: null });
  };

  const handleEditCourse = (courseId: string) => {
    (navigation as any).navigate('CourseBuilder', { courseId });
  };

  const handleViewCourse = (courseId: string) => {
    // For now, same as edit - could be preview in the future
    (navigation as any).navigate('CourseBuilder', { courseId });
  };

  const handleNavigate = (route: string) => {
    if (route === 'CourseList') return; // Already here
    (navigation as any).navigate(route);
  };

  const renderFilters = () => (
    <View style={styles.filters}>
      <TouchableOpacity
        style={[styles.chip, activeFilter === 'all' && styles.chipActive]}
        onPress={() => setActiveFilter('all')}
      >
        <Text style={[styles.chipText, activeFilter === 'all' && styles.chipTextActive]}>
          Todos
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.chip, styles.chipSuccess, activeFilter === 'published' && styles.chipActive]}
        onPress={() => setActiveFilter('published')}
      >
        <Text style={[styles.chipText, styles.chipSuccessText, activeFilter === 'published' && styles.chipTextActive]}>
          Publicados
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.chip, styles.chipWarning, activeFilter === 'draft' && styles.chipActive]}
        onPress={() => setActiveFilter('draft')}
      >
        <Text style={[styles.chipText, styles.chipWarningText, activeFilter === 'draft' && styles.chipTextActive]}>
          Rascunhos
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCards = () => (
    <View style={styles.grid}>
      {filteredCourses.map((course) => (
        <View key={course.id} style={styles.cardWrapper}>
          <ModernCourseCard
            course={course}
            onEdit={handleEditCourse}
            onView={handleViewCourse}
          />
        </View>
      ))}
    </View>
  );

  const renderTable = () => (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderText}>Título</Text>
        <Text style={styles.tableHeaderText}>Autor</Text>
        <Text style={styles.tableHeaderText}>Estado</Text>
        <Text style={styles.tableHeaderText}>Data</Text>
        <Text style={styles.tableHeaderText}>Progresso</Text>
        <Text style={styles.tableHeaderText}></Text>
      </View>
      
      {filteredCourses.map((course) => (
        <View key={course.id} style={styles.tableRow}>
          <Text style={styles.tableCellTitle}>{course.title}</Text>
          <Text style={styles.tableCell}>{course.author_email}</Text>
          <Text style={[
            styles.tableCell,
            course.published ? styles.tableCellPublished : styles.tableCellDraft
          ]}>
            {course.published ? 'Publicado' : 'Rascunho'}
          </Text>
          <Text style={styles.tableCell}>
            {new Date(course.created_at).toLocaleDateString('pt-PT')}
          </Text>
          <Text style={styles.tableCell}>
            {course.progress ? `${course.progress}%` : '—'}
          </Text>
          <TouchableOpacity
            style={styles.tableButton}
            onPress={() => handleEditCourse(course.id)}
          >
            <Text style={styles.tableButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando cursos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.app}>
      <ModernSidebar
        currentRoute="CourseList"
        onNavigate={handleNavigate}
      />
      
      <View style={styles.main}>
        <ModernTopBar
          onNewCourse={handleNewCourse}
          onToggleView={setCurrentView}
          currentView={currentView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        <ScrollView style={styles.content}>
          <View style={styles.sectionHeader}>
            {renderFilters()}
            <Text style={styles.tipText}>
              Dica: use ⌘/Ctrl+K para a paleta de comandos.
            </Text>
          </View>
          
          {currentView === 'cards' ? renderCards() : renderTable()}
        </ScrollView>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  app: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100vh' as any,
  },
  main: {
    flex: 1,
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 6,
    marginVertical: 14,
    paddingHorizontal: 16,
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  chipWarning: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  chipText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: 'white',
  },
  chipSuccessText: {
    color: COLORS.success,
  },
  chipWarningText: {
    color: COLORS.warning,
  },
  tipText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 16,
  },
  cardWrapper: {
    width: width < 1100 ? '100%' : '48%',
    minWidth: 300,
    maxWidth: width < 1100 ? '100%' : '48%',
  },
  // Table styles
  tableContainer: {
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.xl,
    margin: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray50,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  tableCellTitle: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  tableCellPublished: {
    color: COLORS.success,
  },
  tableCellDraft: {
    color: COLORS.warning,
  },
  tableButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
  },
  tableButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    marginTop: SPACING.md,
  },
});

export default ModernCourseListScreen;