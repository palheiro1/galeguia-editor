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
  Dimensions,
  Image,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS, LAYOUT } from '../styles/designSystem';
import { Card, Button, Badge, EmptyState, ProgressBar } from '../components/UIComponents';

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
  const { width: screenWidth } = Dimensions.get('window');

  const getGridColumns = () => {
    if (Platform.OS !== 'web') return 1;
    if (screenWidth >= 1200) return 3;
    if (screenWidth >= 768) return 2;
    return 1;
  };

  const getCardWidth = () => {
    if (Platform.OS !== 'web') return undefined;
    const columns = getGridColumns();
    if (columns === 1) return undefined;
    
    const containerPadding = SPACING.md * 2; // left and right padding
    const gridRowPadding = SPACING.sm * 2; // left and right padding
    const gapSpace = SPACING.md * (columns - 1); // gaps between cards
    const availableWidth = screenWidth - containerPadding - gridRowPadding - gapSpace;
    const cardWidth = availableWidth / columns;
    return Math.floor(cardWidth);
  };

  const fetchCourses = async () => {
    if (!profile) {
      return;
    }
    
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

      if (error) {
        throw error;
      }
      
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

  // Safety timeout to ensure loading doesn't get stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [loading]);

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
  const editCourse = (courseId: string) => navigation.navigate('CourseBuilder', { courseId });

  const renderCourseItem = ({ item }: { item: Course }) => {
    const completion = item.completion;
    const progressPercentage = completion?.grains?.percentage || 0;
    const authorName = item.creator_username || 'Autor Desconhecido';
    const cardWidth = getCardWidth();
    
    const containerStyle = [
      styles.courseCardContainer,
      ...(cardWidth ? [{ width: cardWidth }] : [])
    ];
    
    return (
      <View style={containerStyle}>
        <Card style={styles.courseCard}>
          {/* Course Image with Gradient Overlay */}
          <View style={styles.imageContainer}>
            {item.cover_image_url ? (
              Platform.OS === 'web' ? (
                <img 
                  src={item.cover_image_url} 
                  style={styles.courseImage}
                  alt={item.title}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <Image 
                  source={{ uri: item.cover_image_url }}
                  style={styles.courseImage}
                  resizeMode="cover"
                />
              )
            ) : (
              <LinearGradient 
                colors={[COLORS.primary, COLORS.secondary, COLORS.blue500]} 
                style={styles.placeholderImage}
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name="school" size={48} color={COLORS.white} />
              </LinearGradient>
            )}
            
            {/* Status Badge */}
            <View style={[styles.statusBadge, item.published ? styles.publishedBadge : styles.draftBadge]}>
              <MaterialIcons 
                name={item.published ? 'visibility' : 'visibility-off'} 
                size={12} 
                color={item.published ? COLORS.success : COLORS.warning} 
              />
              <Text style={[styles.statusText, { color: item.published ? COLORS.success : COLORS.warning }]}>
                {item.published ? 'Publicado' : 'Rascunho'}
              </Text>
            </View>
          </View>

          {/* Card Content */}
          <View style={styles.cardContent}>
            {/* Course Title */}
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>

            {/* Author Information */}
            {profile?.role === 'admin' && (
              <View style={styles.authorContainer}>
                <MaterialIcons name="person" size={16} color={COLORS.gray500} />
                <Text style={styles.authorText}>
                  {authorName}
                </Text>
              </View>
            )}

            {/* Course Description */}
            {item.description && (
              <Text style={styles.cardDescription} numberOfLines={3}>
                {item.description}
              </Text>
            )}

            {/* Progress Section */}
            {completion && completion.grains.total > 0 && (
              <View style={styles.completionContainer}>
                <View style={styles.completionHeader}>
                  <Text style={styles.completionTitle}>Progresso</Text>
                  <Text style={styles.completionPercentage}>{progressPercentage}%</Text>
                </View>
                <ProgressBar 
                  progress={progressPercentage / 100} 
                  style={styles.progressBar}
                />
                <View style={styles.completionMetrics}>
                  <View style={styles.metricItem}>
                    <MaterialIcons name="folder" size={14} color={COLORS.primary} />
                    <Text style={styles.metricText}>
                      {completion.modules.current}/{completion.modules.total} módulos
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <MaterialIcons name="article" size={14} color={COLORS.secondary} />
                    <Text style={styles.metricText}>
                      {completion.pages.current}/{completion.pages.total} páginas
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Card Footer */}
            <View style={styles.cardFooter}>
              <Text style={styles.createdDate}>
                {new Date(item.created_at).toLocaleDateString('pt-BR')}
              </Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.iconButton, styles.editButton]}
                  onPress={() => editCourse(item.id)}
                >
                  <MaterialIcons name="edit" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, styles.deleteButton]}
                  onPress={() => deleteCourse(item.id)}
                >
                  <MaterialIcons name="delete" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Card>
      </View>
    );
  };

  // Create responsive content based on screen size
  const renderContent = () => {
    if (Platform.OS === 'web') {
      const columns = getGridColumns();
      
      if (columns === 1) {
        // Single column layout
        return (
          <FlatList
            data={courses}
            renderItem={renderCourseItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.singleColumnList}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchCourses} colors={[COLORS.primary]} />}
          />
        );
      } else {
        // Multi-column grid layout
        return (
          <FlatList
            data={courses}
            renderItem={renderCourseItem}
            keyExtractor={(item) => item.id}
            numColumns={columns}
            key={`grid-${columns}`}
            contentContainerStyle={styles.gridList}
            columnWrapperStyle={styles.gridRow}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchCourses} colors={[COLORS.primary]} />}
          />
        );
      }
    } else {
      // Mobile single column
      return (
        <FlatList
          data={courses}
          renderItem={renderCourseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.singleColumnList}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchCourses} colors={[COLORS.primary]} />}
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={styles.headerTitle}>Meus Cursos</Text>
        <Button
          title="Novo Curso"
          onPress={createNewCourse}
          variant="ghost"
          icon="add"
          style={styles.createButton}
          textStyle={styles.createButtonText}
        />
      </LinearGradient>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : courses.length === 0 ? (
        <EmptyState 
          icon="school"
          title="Nenhum curso encontrado"
          description="Comece criando seu primeiro curso"
          action={{
            title: "Criar Curso",
            onPress: createNewCourse
          }}
        />
      ) : (
        renderContent()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  header: {
    paddingVertical: Platform.OS === 'web' ? SPACING.xl : SPACING.lg,
    paddingHorizontal: SPACING.xl,
    ...SHADOWS.md,
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    marginBottom: SPACING.lg,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  // Layout styles
  singleColumnList: {
    paddingBottom: SPACING['2xl'],
    paddingHorizontal: SPACING.lg,
  },
  gridList: {
    paddingBottom: SPACING['2xl'],
    paddingHorizontal: SPACING.md,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  // Course card container for responsive width
  courseCardContainer: {
    // Removed margin for web as we use gap in gridRow
  },
  courseCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
    overflow: 'hidden',
  },
  // Image styles
  imageContainer: {
    position: 'relative',
    height: 160,
    overflow: 'hidden',
  },
  courseImage: {
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' ? { objectFit: 'cover' } : {}),
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Status badge
  statusBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    ...SHADOWS.sm,
  },
  publishedBadge: {
    backgroundColor: 'rgba(236, 253, 245, 0.95)',
  },
  draftBadge: {
    backgroundColor: 'rgba(255, 251, 235, 0.95)',
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  // Card content
  cardContent: {
    padding: SPACING.lg,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.gray900,
    marginBottom: SPACING.md,
    lineHeight: TYPOGRAPHY.lineHeight.tight * TYPOGRAPHY.fontSize.xl,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  authorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.gray500,
    fontStyle: 'italic',
  },
  cardDescription: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.gray600,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.base,
    marginBottom: SPACING.md,
  },
  // Progress section
  completionContainer: {
    backgroundColor: COLORS.gray50,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  completionTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.gray900,
  },
  completionPercentage: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  progressBar: {
    marginBottom: SPACING.sm,
  },
  completionMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  metricText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.gray600,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  // Card footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    paddingTop: SPACING.md,
  },
  createdDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.gray500,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
});