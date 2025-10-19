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
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../styles/designSystem';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import ModernSidebar from '../components/ModernSidebar';
import ModernTopBar from '../components/ModernTopBar';
import ModernCourseCard from '../components/ModernCourseCard';

interface Course {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  author_name?: string;
  author_display_name?: string;
  author_email?: string;
  published: boolean;
  cover_image_url?: string;
  created_at: string;
  modules_count?: number;
  pages_count?: number;
  progress?: number;
  canManage?: boolean;
}

const ModernCourseListScreen: React.FC = () => {
  const navigation = useNavigation();
  const { session, profile } = useAuth();
  const { isMobile } = useSidebar();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'cards' | 'table'>('table');
  const [activeFilter, setActiveFilter] = useState<'all' | 'published' | 'draft' | 'mine'>('all');
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  
  // Use cards view on mobile for better UX
  const effectiveView = isMobile ? 'cards' : currentView;

  useEffect(() => {
    if (!session) return;
    fetchCourses();
  }, [session?.user?.id, profile?.role]);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      
      // Get courses first
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Get current user info for filtering
      let currentUserEmail = session?.user?.email || '';

      // Transform the data to include proper author information
      const coursesWithAuthorInfo: Course[] = (coursesData || []).map((course: any) => {
        const canManageCourse = Boolean(
          (session?.user?.id && course.creator_id === session.user.id) ||
          profile?.role === 'admin'
        );

        return {
          ...course,
          author_display_name: course.author_name || 'Autor desconhecido',
          author_email: course.creator_id === session?.user?.id ? currentUserEmail : '',
          canManage: canManageCourse,
        };
      });
      
      setCourses(coursesWithAuthorInfo);
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Erro', 'Não foi possível carregar os cursos');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (course.author_display_name && course.author_display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (course.author_name && course.author_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = activeFilter === 'all' || 
                         (activeFilter === 'published' && course.published) ||
                         (activeFilter === 'draft' && !course.published) ||
                         (activeFilter === 'mine' && course.creator_id === session?.user?.id);
    
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

  const confirmDeleteCourse = async (courseId: string) => {
    try {
      console.log('Deleting course', courseId);
      setDeletingCourseId(courseId);
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) {
        console.error('Erro ao eliminar curso:', error);
        Alert.alert('Erro', 'Não foi possível eliminar o curso.');
        return;
      }

      setCourses(prev => prev.filter(course => course.id !== courseId));
      Alert.alert('Sucesso', 'Curso eliminado com sucesso.');
    } catch (err) {
      console.error('Erro inesperado ao eliminar curso:', err);
      Alert.alert('Erro', 'Ocorreu um erro inesperado.');
    } finally {
      setDeletingCourseId(null);
    }
  };

  const handleDeleteCourse = (course: Course) => {
    if (!course.canManage) {
      Alert.alert('Sem permissão', 'Precisa de ser administrador ou autor do curso para o eliminar.');
      return;
    }

    const confirmMessage = `Tem a certeza que deseja eliminar "${course.title}"? Esta ação não pode ser desfeita.`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        confirmDeleteCourse(course.id);
      }
      return;
    }

    Alert.alert(
      'Eliminar curso',
      confirmMessage,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => confirmDeleteCourse(course.id),
        },
      ]
    );
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
        style={[styles.chip, activeFilter === 'mine' && styles.chipActive]}
        onPress={() => setActiveFilter('mine')}
      >
        <Text style={[styles.chipText, activeFilter === 'mine' && styles.chipTextActive]}>
          Só os meus Cursos
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
            onDelete={() => handleDeleteCourse(course)}
            isDeleting={deletingCourseId === course.id}
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
        <Text style={styles.tableHeaderText}>Ações</Text>
      </View>
      
      {filteredCourses.map((course) => (
        <View key={course.id} style={styles.tableRow}>
          <Text style={styles.tableCellTitle}>{course.title}</Text>
          <Text style={styles.tableCell}>{course.author_display_name}</Text>
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
          <View style={styles.tableActions}>
            <TouchableOpacity
              style={styles.tableButton}
              onPress={() => handleEditCourse(course.id)}
            >
              <Text style={styles.tableButtonText}>Editar</Text>
            </TouchableOpacity>
            {course.canManage && (
              <TouchableOpacity
                style={[styles.tableButton, styles.tableButtonDanger, deletingCourseId === course.id && styles.tableButtonDisabled]}
                onPress={() => handleDeleteCourse(course)}
                disabled={deletingCourseId === course.id}
              >
                <Text style={[styles.tableButtonText, styles.tableButtonTextDanger]}>
                  {deletingCourseId === course.id ? 'A eliminar…' : 'Eliminar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
          isMobile={isMobile}
        />
        
        <ScrollView style={styles.content}>
          <View style={[styles.sectionHeader, isMobile && styles.sectionHeaderMobile]}>
            {renderFilters()}
            {!isMobile && (
              <Text style={styles.tipText}>
                Dica: use ⌘/Ctrl+K para a paleta de comandos.
              </Text>
            )}
          </View>
          
          {effectiveView === 'cards' ? renderCards() : renderTable()}
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
  sectionHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 12,
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
  tableActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
  },
  tableButtonDanger: {
    backgroundColor: COLORS.error,
  },
  tableButtonDisabled: {
    opacity: 0.6,
  },
  tableButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  tableButtonTextDanger: {
    color: 'white',
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