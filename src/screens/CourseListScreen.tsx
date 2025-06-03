import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const COLORS = {
  primary: '#6366f1',
  secondary: '#4f46e5',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  published: boolean;
  created_at: string;
  creator_id: string;
  creator_username?: string;
  modules_count?: number | null;
  lessons_per_module?: number | null;
  pages_per_lesson?: number | null;
  structure_created?: boolean;
  completion?: {
    modules: { current: number; total: number };
    lessons: { current: number; total: number };
    pages: { current: number; total: number };
    grains: { current: number; total: number; percentage: number };
  };
};

export default function CourseListScreen({ navigation }: any) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { profile } = useAuth();

  const fetchCourses = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      let query = supabase.from('courses').select('*');

      if (profile.role !== 'admin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq('creator_id', user.id);
        } else {
          setCourses([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const coursesWithCompletion = await Promise.all(
          data.map(async (course: any) => {
            // Get completion metrics
            const completion = await calculateCourseCompletion(course.id);
            
            // Get creator username for admins
            let creator_username;
            if (profile.role === 'admin') {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('username')
                .eq('user_id', course.creator_id)
                .maybeSingle();
              creator_username = profileData?.username || 'Desconhecido';
            }
            
            return {
              ...course,
              creator_username,
              completion,
            };
          })
        );
        setCourses(coursesWithCompletion);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar cursos.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateCourseCompletion = async (courseId: string) => {
    try {
      // Get all modules for the course with their lessons, pages, and grains
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select(`
          id,
          lessons (
            id,
            pages (
              id,
              grains (
                id,
                content
              )
            )
          )
        `)
        .eq('course_id', courseId);

      if (modulesError) throw modulesError;

      const totalModules = modules?.length || 0;

      if (totalModules === 0) {
        return {
          modules: { current: 0, total: 0 },
          lessons: { current: 0, total: 0 },
          pages: { current: 0, total: 0 },
          grains: { current: 0, total: 0, percentage: 0 },
        };
      }

      let totalLessons = 0;
      let totalPages = 0;
      let totalGrains = 0;
      let completedGrains = 0;
      let completedPages = 0;
      let completedLessons = 0;
      let completedModules = 0;

      // Helper function to check if a grain is completed
      const isGrainCompleted = (grain: any) => {
        if (!grain.content) return false;
        const content = grain.content;
        
        // Check for meaningful content based on grain type
        if (content.text && content.text.trim().length > 0) return true;
        if (content.question && content.question.trim().length > 0) return true;
        if (content.correctAnswer && content.correctAnswer.trim().length > 0) return true;
        if (content.imageUrl && content.imageUrl.trim().length > 0) return true;
        if (content.audioUrl && content.audioUrl.trim().length > 0) return true;
        if (content.pairs && Array.isArray(content.pairs) && content.pairs.length > 0) {
          return content.pairs.some((pair: any) => 
            (pair.left && pair.left.trim().length > 0) || 
            (pair.right && pair.right.trim().length > 0)
          );
        }
        if (content.options && Array.isArray(content.options) && content.options.length > 0) {
          return content.options.some((option: any) => option && option.trim().length > 0);
        }
        
        return false;
      };

      // Process each module
      for (const module of modules) {
        const lessons = module.lessons || [];
        totalLessons += lessons.length;
        
        let moduleCompletedLessons = 0;

        // Process each lesson in the module
        for (const lesson of lessons) {
          const pages = lesson.pages || [];
          totalPages += pages.length;
          
          let lessonCompletedPages = 0;

          // Process each page in the lesson
          for (const page of pages) {
            const grains = page.grains || [];
            totalGrains += grains.length;
            
            let pageCompletedGrains = 0;

            // Count completed grains in this page
            for (const grain of grains) {
              if (isGrainCompleted(grain)) {
                completedGrains++;
                pageCompletedGrains++;
              }
            }

            // Page is completed only if ALL its grains are completed
            if (grains.length > 0 && pageCompletedGrains === grains.length) {
              completedPages++;
              lessonCompletedPages++;
            }
          }

          // Lesson is completed only if ALL its pages are completed
          if (pages.length > 0 && lessonCompletedPages === pages.length) {
            completedLessons++;
            moduleCompletedLessons++;
          }
        }

        // Module is completed only if ALL its lessons are completed
        if (lessons.length > 0 && moduleCompletedLessons === lessons.length) {
          completedModules++;
        }
      }

      const grainPercentage = totalGrains > 0 ? Math.round((completedGrains / totalGrains) * 100) : 0;

      return {
        modules: { current: completedModules, total: totalModules },
        lessons: { current: completedLessons, total: totalLessons },
        pages: { current: completedPages, total: totalPages },
        grains: { current: completedGrains, total: totalGrains, percentage: grainPercentage },
      };
    } catch (error) {
      console.error('Error calculating course completion:', error);
      return {
        modules: { current: 0, total: 0 },
        lessons: { current: 0, total: 0 },
        pages: { current: 0, total: 0 },
        grains: { current: 0, total: 0, percentage: 0 },
      };
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchCourses();
    }, [profile])
  );

  const deleteCourse = async (id: string) => {
    const confirmMessage = 'Eliminar este curso? Isso não pode ser desfeito.';
    const performDelete = async () => {
      try {
        setLoading(true);
        await supabase.from('courses').delete().eq('id', id);
        Alert.alert('Sucesso', 'Curso eliminado');
        fetchCourses();
      } catch {
        Alert.alert('Erro', 'Erro ao eliminar curso');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) await performDelete();
    } else {
      Alert.alert('Confirmação', confirmMessage, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  const createNewCourse = () => navigation.navigate('CourseEdit', { courseId: null });
  const editCourse = (courseId: string) => navigation.navigate('CourseEdit', { courseId });

  const renderCourseItem = ({ item }: { item: Course }) => (
    <View style={styles.courseCard}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, item.published ? styles.publishedBadge : styles.draftBadge]}>
            <MaterialIcons name={item.published ? 'public' : 'drafts'} size={14} color={item.published ? COLORS.success : COLORS.warning} />
            <Text style={styles.statusText}>{item.published ? 'Publicado' : 'Rascunho'}</Text>
          </View>
        </View>
        {item.description && <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>}
        
        {/* Completion Metrics */}
        {item.completion && (
          <View style={styles.completionContainer}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionTitle}>Progresso do Curso</Text>
              <Text style={styles.completionPercentage}>{item.completion.grains.percentage}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${item.completion.grains.percentage}%` }]} />
            </View>
            <View style={styles.completionMetrics}>
              <View style={styles.metricItem}>
                <MaterialIcons name="folder" size={16} color={COLORS.textSecondary} />
                <Text style={styles.metricText}>
                  {item.completion.modules.current}/{item.completion.modules.total} módulos
                </Text>
              </View>
              <View style={styles.metricItem}>
                <MaterialIcons name="book" size={16} color={COLORS.textSecondary} />
                <Text style={styles.metricText}>
                  {item.completion.lessons.current}/{item.completion.lessons.total} lições
                </Text>
              </View>
              <View style={styles.metricItem}>
                <MaterialIcons name="description" size={16} color={COLORS.textSecondary} />
                <Text style={styles.metricText}>
                  {item.completion.pages.current}/{item.completion.pages.total} páginas
                </Text>
              </View>
              <View style={styles.metricItem}>
                <MaterialIcons name="grain" size={16} color={COLORS.textSecondary} />
                <Text style={styles.metricText}>
                  {item.completion.grains.current}/{item.completion.grains.total} grãos
                </Text>
              </View>
            </View>
          </View>
        )}

        {profile?.role === 'admin' && item.creator_username && (
          <View style={styles.authorContainer}>
            <MaterialIcons name="person" size={14} color={COLORS.textSecondary} />
            <Text style={styles.authorText}>{item.creator_username}</Text>
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.createdDate}>Criado em: {new Date(item.created_at).toLocaleDateString()}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.iconButton, styles.editButton]} onPress={() => editCourse(item.id)}>
              <MaterialIcons name="edit" size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, styles.deleteButton]} onPress={() => deleteCourse(item.id)}>
              <MaterialIcons name="delete" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={styles.headerTitle}>Meus Cursos</Text>
        <TouchableOpacity style={styles.createButton} onPress={createNewCourse}>
          <MaterialIcons name="add" size={24} color="white" />
          <Text style={styles.createButtonText}>Novo Curso</Text>
        </TouchableOpacity>
      </LinearGradient>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : courses.length === 0 ? (
        <Text style={{ textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 }}>Ainda não há cursos.</Text>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchCourses} colors={[COLORS.primary]} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingVertical: Platform.OS === 'web' ? 24 : 20,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  courseCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  publishedBadge: {
    backgroundColor: '#dcfce7',
  },
  draftBadge: {
    backgroundColor: '#fef9c3',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  authorText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  createdDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
  },
  list: {
    paddingBottom: 40,
  },
  // Completion metrics styles
  completionContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  completionPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  completionMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
