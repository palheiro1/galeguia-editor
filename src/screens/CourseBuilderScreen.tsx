import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS } from '../styles/designSystem';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CourseStructure {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  published: boolean;
  modules: ModuleStructure[];
}

interface ModuleStructure {
  id: string;
  title: string;
  position: number;
  lessons: LessonStructure[];
}

interface LessonStructure {
  id: string;
  title: string;
  position: number;
  pages: PageStructure[];
}

interface PageStructure {
  id: string;
  title: string;
  position: number;
  type: 'Introduction' | 'Booster' | 'Comparation' | 'Review' | 'Custom';
  grains_count: number;
  completion_status: 'empty' | 'partial' | 'complete';
}

// Helper function to determine expected grain type based on page type and position
const getExpectedGrainTypeForPosition = (pageType: string, position: number): string | undefined => {
  if (pageType === 'Custom') return undefined;
  
  switch (pageType) {
    case 'Introduction':
      return 'textToComplete'; // Basic text completion for introduction
    case 'Booster':
      return 'testQuestion'; // Multiple choice for reinforcement
    case 'Comparation':
      return 'pairsOfText'; // Comparison exercises
    case 'Review':
      return 'imagesToGuess'; // Visual review exercises
    default:
      return undefined;
  }
};

const CourseBuilderScreen = ({ route, navigation }: any) => {
  const { courseId } = route.params;
  const { session } = useAuth();
  const [courseStructure, setCourseStructure] = useState<CourseStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCourseStructure();
  }, [courseId]);

  const loadCourseStructure = async () => {
    try {
      setIsLoading(true);
      
      // Load course with complete structure
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          cover_image_url,
          published,
          modules (
            id,
            title,
            position,
            lessons (
              id,
              title,
              position,
              pages (
                id,
                title,
                position,
                type,
                grains (id)
              )
            )
          )
        `)
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      // Process the data to include completion status
      const processedCourse: CourseStructure = {
        ...courseData,
        modules: courseData.modules.map((module: any) => ({
          ...module,
          lessons: module.lessons.map((lesson: any) => ({
            ...lesson,
            pages: lesson.pages.map((page: any) => ({
              ...page,
              grains_count: page.grains?.length || 0,
              completion_status: 
                !page.grains || page.grains.length === 0 ? 'empty' :
                page.grains.length < 15 ? 'partial' : 'complete'
            }))
          }))
        }))
      };

      setCourseStructure(processedCourse);
    } catch (error) {
      console.error('Error loading course structure:', error);
      Alert.alert('Erro', 'Falha ao carregar estrutura do curso');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const toggleLesson = (lessonId: string) => {
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(lessonId)) {
      newExpanded.delete(lessonId);
    } else {
      newExpanded.add(lessonId);
    }
    setExpandedLessons(newExpanded);
  };

  const getPageTypeInfo = (type: string) => {
    const pageTypeConfig = {
      Introduction: { 
        color: COLORS.primary, 
        icon: 'play-circle', 
        description: 'Apresenta novos conceitos com imagens e textos simples' 
      },
      Booster: { 
        color: COLORS.secondary, 
        icon: 'trending-up', 
        description: 'Reforça aprendizado com exercícios variados' 
      },
      Comparation: { 
        color: COLORS.blue500, 
        icon: 'compare', 
        description: 'Compara conceitos através de imagens e textos' 
      },
      Review: { 
        color: COLORS.success, 
        icon: 'refresh', 
        description: 'Revisa conteúdo com exercícios de completar' 
      },
      Custom: { 
        color: COLORS.warning, 
        icon: 'build', 
        description: 'Tipo personalizado - você escolhe os exercícios' 
      },
    };
    return pageTypeConfig[type as keyof typeof pageTypeConfig] || pageTypeConfig.Custom;
  };

  const getCompletionColor = (status: string) => {
    switch (status) {
      case 'empty': return COLORS.gray300;
      case 'partial': return COLORS.warning;
      case 'complete': return COLORS.success;
      default: return COLORS.gray300;
    }
  };

  const renderPageTypePreview = () => (
    <View style={styles.pageTypePreview}>
      <Text style={styles.sectionTitle}>📚 Tipos de Página</Text>
      <Text style={styles.helpText}>
        Cada página tem 15 exercícios (grains) organizados por tipo:
      </Text>
      
      {['Introduction', 'Booster', 'Comparation', 'Review', 'Custom'].map((type) => {
        const config = getPageTypeInfo(type);
        return (
          <View key={type} style={styles.pageTypeCard}>
            <View style={styles.pageTypeHeader}>
              <MaterialIcons 
                name={config.icon as any} 
                size={20} 
                color={config.color} 
              />
              <Text style={[styles.pageTypeName, { color: config.color }]}>
                {type}
              </Text>
            </View>
            <Text style={styles.pageTypeDescription}>
              {config.description}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const renderGrainProgress = (page: PageStructure) => (
    <View style={styles.grainProgress}>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill,
            { 
              width: `${(page.grains_count / 15) * 100}%`,
              backgroundColor: getCompletionColor(page.completion_status)
            }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>
        {page.grains_count}/15 exercícios
      </Text>
    </View>
  );

  const renderPage = (page: PageStructure) => {
    const config = getPageTypeInfo(page.type);
    
    return (
      <TouchableOpacity
        key={page.id}
        style={styles.pageCard}
        onPress={() => navigation.navigate('PageEdit', { 
          lessonId: page.id, // This needs to be corrected based on actual lesson ID
          pageId: page.id,
          refresh: true 
        })}
      >
        <View style={styles.pageHeader}>
          <View style={styles.pageInfo}>
            <MaterialIcons 
              name={config.icon as any} 
              size={16} 
              color={config.color} 
            />
            <Text style={styles.pageTitle} numberOfLines={1}>
              {page.title || `Página ${page.position}`}
            </Text>
            <View style={[styles.pageTypeBadge, { backgroundColor: config.color }]}>
              <Text style={styles.pageTypeBadgeText}>{page.type}</Text>
            </View>
          </View>
          <MaterialIcons name="edit" size={16} color={COLORS.gray500} />
        </View>
        
        {renderGrainProgress(page)}
        
        <View style={styles.pageActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('PageTest', { pageId: page.id })}
          >
            <MaterialIcons name="play-arrow" size={16} color={COLORS.primary} />
            <Text style={styles.actionText}>Testar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ImprovedGrainEdit', { 
              pageId: page.id,
              grainId: null,
              position: page.grains_count + 1,
              pageType: page.type,
              expectedGrainType: getExpectedGrainTypeForPosition(page.type, page.grains_count + 1)
            })}
          >
            <MaterialIcons name="add" size={16} color={COLORS.success} />
            <Text style={styles.actionText}>Adicionar Exercício</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLesson = (lesson: LessonStructure) => {
    const isExpanded = expandedLessons.has(lesson.id);
    const completedPages = lesson.pages.filter(p => p.completion_status === 'complete').length;
    const totalPages = lesson.pages.length;
    
    return (
      <View key={lesson.id} style={styles.lessonContainer}>
        <TouchableOpacity
          style={styles.lessonHeader}
          onPress={() => toggleLesson(lesson.id)}
        >
          <View style={styles.lessonInfo}>
            <MaterialIcons 
              name={isExpanded ? 'expand-less' : 'expand-more'} 
              size={20} 
              color={COLORS.gray600} 
            />
            <Text style={styles.lessonTitle}>
              {lesson.title || `Lição ${lesson.position}`}
            </Text>
            <View style={styles.completionBadge}>
              <Text style={styles.completionText}>
                {completedPages}/{totalPages} páginas
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('LessonEdit', { 
              moduleId: lesson.id, // This needs to be corrected
              lessonId: lesson.id 
            })}
          >
            <MaterialIcons name="edit" size={16} color={COLORS.gray500} />
          </TouchableOpacity>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.pagesContainer}>
            {lesson.pages.map(renderPage)}
            
            <TouchableOpacity 
              style={styles.addPageButton}
              onPress={() => navigation.navigate('PageEdit', { 
                lessonId: lesson.id,
                pageId: null 
              })}
            >
              <MaterialIcons name="add" size={20} color={COLORS.primary} />
              <Text style={styles.addPageText}>Adicionar Página</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderModule = (module: ModuleStructure) => {
    const isExpanded = expandedModules.has(module.id);
    const totalLessons = module.lessons.length;
    const completedLessons = module.lessons.filter(lesson => 
      lesson.pages.every(page => page.completion_status === 'complete')
    ).length;
    
    return (
      <View key={module.id} style={styles.moduleContainer}>
        <TouchableOpacity
          style={styles.moduleHeader}
          onPress={() => toggleModule(module.id)}
        >
          <View style={styles.moduleInfo}>
            <MaterialIcons 
              name={isExpanded ? 'expand-less' : 'expand-more'} 
              size={24} 
              color={COLORS.primary} 
            />
            <Text style={styles.moduleTitle}>
              {module.title || `Módulo ${module.position}`}
            </Text>
            <View style={styles.progressIndicator}>
              <Text style={styles.progressIndicatorText}>
                {completedLessons}/{totalLessons} lições
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('ModuleEdit', { 
              courseId: courseStructure?.id,
              moduleId: module.id 
            })}
          >
            <MaterialIcons name="edit" size={20} color={COLORS.gray500} />
          </TouchableOpacity>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.lessonsContainer}>
            {module.lessons.map(renderLesson)}
            
            <TouchableOpacity 
              style={styles.addLessonButton}
              onPress={() => navigation.navigate('LessonEdit', { 
                moduleId: module.id,
                lessonId: null 
              })}
            >
              <MaterialIcons name="add" size={20} color={COLORS.secondary} />
              <Text style={styles.addLessonText}>Adicionar Lição</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando estrutura do curso...</Text>
      </View>
    );
  }

  if (!courseStructure) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>Curso não encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.courseHeader}>
          <Text style={styles.courseTitle}>{courseStructure.title}</Text>
          {courseStructure.description && (
            <Text style={styles.courseDescription}>{courseStructure.description}</Text>
          )}
          
          <View style={styles.courseStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{courseStructure.modules.length}</Text>
              <Text style={styles.statLabel}>Módulos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {courseStructure.modules.reduce((sum, m) => sum + m.lessons.length, 0)}
              </Text>
              <Text style={styles.statLabel}>Lições</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {courseStructure.modules.reduce((sum, m) => 
                  sum + m.lessons.reduce((lessonSum, l) => lessonSum + l.pages.length, 0), 0
                )}
              </Text>
              <Text style={styles.statLabel}>Páginas</Text>
            </View>
          </View>
        </View>

        {renderPageTypePreview()}

        <View style={styles.structureContainer}>
          <Text style={styles.sectionTitle}>🏗️ Estrutura do Curso</Text>
          {courseStructure.modules.map(renderModule)}
          
          <TouchableOpacity 
            style={styles.addModuleButton}
            onPress={() => navigation.navigate('ModuleEdit', { 
              courseId: courseStructure.id,
              moduleId: null 
            })}
          >
            <MaterialIcons name="add" size={24} color={COLORS.primary} />
            <Text style={styles.addModuleText}>Adicionar Módulo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray600,
    marginTop: SPACING.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  errorText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  courseHeader: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    margin: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
    minHeight: 120,
  },
  courseTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.gray900,
    marginBottom: SPACING.sm,
    fontSize: 24,
    fontWeight: 'bold',
  },
  courseDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray600,
    fontSize: 16,
    marginBottom: SPACING.md,
  },
  courseStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.gray600,
  },
  pageTypePreview: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.gray900,
    marginBottom: SPACING.md,
  },
  helpText: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray600,
    marginBottom: SPACING.md,
  },
  pageTypeCard: {
    backgroundColor: COLORS.gray50,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
    marginBottom: SPACING.sm,
  },
  pageTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  pageTypeName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  pageTypeDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.gray700,
  },
  structureContainer: {
    padding: SPACING.md,
  },
  moduleContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  moduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moduleTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.gray900,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  progressIndicator: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  progressIndicatorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },
  lessonsContainer: {
    padding: SPACING.md,
  },
  lessonContainer: {
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.base,
    marginBottom: SPACING.sm,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  lessonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lessonTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray800,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  completionBadge: {
    backgroundColor: COLORS.secondary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  completionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  pagesContainer: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  pageCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.base,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.blue500,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  pageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pageTitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray800,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  pageTypeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  pageTypeBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontWeight: '600',
  },
  grainProgress: {
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.gray200,
    borderRadius: 2,
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.gray600,
  },
  pageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  actionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.gray700,
    marginLeft: SPACING.xs,
  },
  addPageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
    borderStyle: 'dashed',
  },
  addPageText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  addLessonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary + '10',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 2,
    borderColor: COLORS.secondary + '30',
    borderStyle: 'dashed',
  },
  addLessonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.secondary,
    marginLeft: SPACING.sm,
  },
  addModuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
    borderStyle: 'dashed',
  },
  addModuleText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
});

export default CourseBuilderScreen;