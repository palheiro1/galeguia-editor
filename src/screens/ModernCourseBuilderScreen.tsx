import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../styles/designSystem';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import ModernSidebar from '../components/ModernSidebar';

interface CourseStructure {
  id: string;
  title: string;
  description?: string;
  cover_image_url?: string;
  published: boolean;
  creator_id?: string | null;
  author_name?: string | null;
  author_display_name?: string | null;
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

const ModernCourseBuilderScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { session, profile } = useAuth();
  const { courseId } = route.params as { courseId: string };
  
  const [courseStructure, setCourseStructure] = useState<CourseStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'modules' | 'lessons'>('modules');
  const [editMode, setEditMode] = useState<'course' | 'module' | 'lesson' | 'page'>('course');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const [creatingModule, setCreatingModule] = useState(false);
  const [creatingLesson, setCreatingLesson] = useState(false);

  const userId = session?.user?.id ?? null;
  const userRole = profile?.role;

  const canManageCourse = useMemo(() => {
    if (!courseStructure) return false;

    if (userRole === 'admin') return true;

    return Boolean(userId && courseStructure.creator_id && courseStructure.creator_id === userId);
  }, [courseStructure, userId, userRole]);

  useEffect(() => {
    fetchCourseStructure();
  }, [courseId]);

  const fetchCourseStructure = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          modules (
            *,
            lessons (
              *,
              pages (*)
            )
          )
        `)
        .eq('id', courseId)
        .single();

      if (error) throw error;
      setCourseStructure(data);
    } catch (error) {
      console.error('Error fetching course structure:', error);
      Alert.alert('Erro', 'Não foi possível carregar a estrutura do curso');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCourseTitle = (newTitle: string) => {
    if (courseStructure) {
      setCourseStructure({
        ...courseStructure,
        title: newTitle
      });
    }
  };

  const updateCourseDescription = (newDescription: string) => {
    if (courseStructure) {
      setCourseStructure({
        ...courseStructure,
        description: newDescription
      });
    }
  };

  const saveCourseChanges = async () => {
    try {
      if (!courseStructure) return;
      
      const { error } = await supabase
        .from('courses')
        .update({
          title: courseStructure.title,
          description: courseStructure.description
        })
        .eq('id', courseId);

      if (error) throw error;
      Alert.alert('Sucesso', 'Alterações guardadas com sucesso');
    } catch (error) {
      console.error('Error saving course:', error);
      Alert.alert('Erro', 'Não foi possível guardar as alterações');
    }
  };

  const updateModuleTitle = (newTitle: string) => {
    if (courseStructure && selectedModule) {
      const updatedModules = courseStructure.modules.map(module =>
        module.id === selectedModule
          ? { ...module, title: newTitle }
          : module
      );
      setCourseStructure({
        ...courseStructure,
        modules: updatedModules
      });
    }
  };

  const saveModuleChanges = async () => {
    try {
      const moduleData = getSelectedModule();
      if (!selectedModule || !moduleData) return;
      
      const { error } = await supabase
        .from('modules')
        .update({
          title: moduleData.title
        })
        .eq('id', selectedModule);

      if (error) throw error;
      Alert.alert('Sucesso', 'Módulo guardado com sucesso');
    } catch (error) {
      console.error('Error saving module:', error);
      Alert.alert('Erro', 'Não foi possível guardar o módulo');
    }
  };

  const updateLessonTitle = (newTitle: string) => {
    if (courseStructure && selectedModule && selectedLesson) {
      const updatedModules = courseStructure.modules.map(module =>
        module.id === selectedModule
          ? {
              ...module,
              lessons: module.lessons.map(lesson =>
                lesson.id === selectedLesson
                  ? { ...lesson, title: newTitle }
                  : lesson
              )
            }
          : module
      );
      setCourseStructure({
        ...courseStructure,
        modules: updatedModules
      });
    }
  };

  const saveLessonChanges = async () => {
    try {
      const lessonData = getSelectedLesson();
      if (!selectedLesson || !lessonData) return;
      
      const { error } = await supabase
        .from('lessons')
        .update({
          title: lessonData.title
        })
        .eq('id', selectedLesson);

      if (error) throw error;
      Alert.alert('Sucesso', 'Lição guardada com sucesso');
    } catch (error) {
      console.error('Error saving lesson:', error);
      Alert.alert('Erro', 'Não foi possível guardar a lição');
    }
  };

  const getModuleStats = (module: ModuleStructure) => {
    const totalLessons = module.lessons.length;
    const completedLessons = module.lessons.filter(lesson => 
      lesson.pages.every(page => page.completion_status === 'complete')
    ).length;
    return `${completedLessons}/${totalLessons}`;
  };

  const getSelectedModule = () => {
    return courseStructure?.modules.find(m => m.id === selectedModule);
  };

  const getSelectedLesson = () => {
    const module = getSelectedModule();
    return module?.lessons.find(l => l.id === selectedLesson);
  };

  const getSelectedPage = () => {
    const lesson = getSelectedLesson();
    return lesson?.pages.find(p => p.id === selectedPage);
  };

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModule(moduleId);
    setSelectedLesson(null);
    setSelectedPage(null);
    setEditMode('module');
  };

  const handleLessonSelect = (lessonId: string) => {
    setSelectedLesson(lessonId);
    setSelectedPage(null);
    setEditMode('lesson');
  };

  const handlePageSelect = (pageId: string) => {
    setSelectedPage(pageId);
    setEditMode('page');
  };

  const handleNavigateToPageEdit = (pageId: string) => {
    (navigation as any).navigate('PageEdit', { pageId });
  };

  const handleCreatePage = (lessonId: string) => {
    (navigation as any).navigate('PageEdit', { lessonId, courseId });
  };

  const handleNavigate = (route: string) => {
    if (route === 'CourseList') {
      (navigation as any).navigate('CourseList');
    }
  };

  const handleBackToList = () => {
    (navigation as any).navigate('CourseList');
  };

  const confirmDeleteCourse = async () => {
    if (!courseStructure) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseStructure.id);

      if (error) throw error;

      Alert.alert('Sucesso', 'Curso eliminado com sucesso.');
      setCourseStructure(null);
      handleBackToList();
    } catch (error) {
      console.error('Erro ao eliminar curso:', error);
      Alert.alert('Erro', 'Não foi possível eliminar o curso.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCourse = () => {
    if (!courseStructure) return;

    if (!canManageCourse) {
      Alert.alert('Sem permissão', 'Precisa de ser administrador ou autor do curso para o eliminar.');
      return;
    }

    Alert.alert(
      'Eliminar curso',
      `Tem a certeza que deseja eliminar "${courseStructure.title}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: confirmDeleteCourse,
        },
      ]
    );
  };

  const handleCreateModule = async () => {
    if (!courseStructure) return;

    if (!canManageCourse) {
      Alert.alert('Sem permissão', 'Precisa de ser administrador ou autor do curso para criar módulos.');
      return;
    }

    try {
      setCreatingModule(true);
      const nextPosition = courseStructure.modules.reduce((max, module) => Math.max(max, module.position ?? 0), 0) + 1;
      console.log('Creating module for course', courseStructure.id, 'next position', nextPosition);

      const { data, error } = await supabase
        .from('modules')
        .insert({
          course_id: courseStructure.id,
          title: `Novo módulo ${nextPosition}`,
          position: nextPosition,
        })
        .select('id, title, position')
        .single();

      if (error) throw error;

      const newModule: ModuleStructure = {
        id: data.id,
        title: data.title,
        position: data.position ?? nextPosition,
        lessons: [],
      };

      setCourseStructure(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: [...prev.modules, newModule].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
        };
      });

      setSelectedModule(data.id);
      setSelectedLesson(null);
      setSelectedPage(null);
      setEditMode('module');
      setViewMode('modules');
      Alert.alert('Sucesso', 'Módulo criado com sucesso.');
    } catch (error) {
      console.error('Erro ao criar módulo:', error);
      Alert.alert('Erro', 'Não foi possível criar o módulo.');
    } finally {
      setCreatingModule(false);
    }
  };

  const handleCreateLesson = async () => {
    if (!selectedModule) {
      Alert.alert('Seleção necessária', 'Selecione primeiro um módulo para criar uma lição.');
      return;
    }

    if (!canManageCourse) {
      Alert.alert('Sem permissão', 'Precisa de ser administrador ou autor do curso para criar lições.');
      return;
    }

    const moduleData = getSelectedModule();
    if (!moduleData) {
      Alert.alert('Erro', 'Não foi possível encontrar o módulo selecionado.');
      return;
    }

    try {
      setCreatingLesson(true);
      const nextPosition = moduleData.lessons.reduce((max, lesson) => Math.max(max, lesson.position ?? 0), 0) + 1;
      console.log('Creating lesson for module', selectedModule, 'next position', nextPosition);

      const { data, error } = await supabase
        .from('lessons')
        .insert({
          module_id: selectedModule,
          title: `Nova lição ${nextPosition}`,
          position: nextPosition,
        })
        .select('id, title, position')
        .single();

      if (error) throw error;

      const newLesson: LessonStructure = {
        id: data.id,
        title: data.title,
        position: data.position ?? nextPosition,
        pages: [],
      };

      setCourseStructure(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map(module =>
            module.id === selectedModule
              ? {
                  ...module,
                  lessons: [...module.lessons, newLesson].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
                }
              : module
          ),
        };
      });

      setSelectedLesson(data.id);
      setSelectedPage(null);
      setEditMode('lesson');
      setViewMode('lessons');
      Alert.alert('Sucesso', 'Lição criada com sucesso.');
    } catch (error) {
      console.error('Erro ao criar lição:', error);
      Alert.alert('Erro', 'Não foi possível criar a lição.');
    } finally {
      setCreatingLesson(false);
    }
  };

  const confirmDeleteModule = async (moduleId: string) => {
    try {
      console.log('Deleting module', moduleId);
      setDeletingModuleId(moduleId);
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      setCourseStructure(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.filter(module => module.id !== moduleId),
        };
      });

      if (selectedModule === moduleId) {
        setSelectedModule(null);
        setSelectedLesson(null);
        setSelectedPage(null);
        setEditMode('course');
      }

      Alert.alert('Sucesso', 'Módulo eliminado com sucesso.');
    } catch (error) {
      console.error('Erro ao eliminar módulo:', error);
      Alert.alert('Erro', 'Não foi possível eliminar o módulo.');
    } finally {
      setDeletingModuleId(null);
    }
  };

  const handleDeleteModule = (module: ModuleStructure) => {
    if (!canManageCourse) {
      Alert.alert('Sem permissão', 'Precisa de ser administrador ou autor do curso para eliminar módulos.');
      return;
    }

    const moduleTitle = module.title?.trim().length ? module.title : `Módulo ${module.position}`;

    Alert.alert(
      'Eliminar módulo',
      `Tem a certeza que deseja eliminar "${moduleTitle}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => confirmDeleteModule(module.id),
        },
      ]
    );
  };

  const confirmDeleteLesson = async (lessonId: string, moduleId: string) => {
    try {
      console.log('Deleting lesson', lessonId);
      setDeletingLessonId(lessonId);
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;

      setCourseStructure(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map(module =>
            module.id === moduleId
              ? {
                  ...module,
                  lessons: module.lessons.filter(lesson => lesson.id !== lessonId),
                }
              : module
          ),
        };
      });

      if (selectedLesson === lessonId) {
        setSelectedLesson(null);
        setSelectedPage(null);
        setEditMode('module');
      }

      Alert.alert('Sucesso', 'Lição eliminada com sucesso.');
    } catch (error) {
      console.error('Erro ao eliminar lição:', error);
      Alert.alert('Erro', 'Não foi possível eliminar a lição.');
    } finally {
      setDeletingLessonId(null);
    }
  };

  const handleDeleteLesson = (lesson: LessonStructure, moduleId?: string) => {
    if (!canManageCourse) {
      Alert.alert('Sem permissão', 'Precisa de ser administrador ou autor do curso para eliminar lições.');
      return;
    }

    if (!moduleId) {
      Alert.alert('Erro', 'Módulo selecionado inválido.');
      return;
    }

    const lessonTitle = lesson.title?.trim().length ? lesson.title : `Lição ${lesson.position}`;

    Alert.alert(
      'Eliminar lição',
      `Tem a certeza que deseja eliminar "${lessonTitle}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => confirmDeleteLesson(lesson.id, moduleId),
        },
      ]
    );
  };

  const confirmDeletePage = async (pageId: string, lessonId: string, moduleId: string) => {
    try {
      console.log('Deleting page', pageId);
      setDeletingPageId(pageId);
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      setCourseStructure(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          modules: prev.modules.map(module =>
            module.id === moduleId
              ? {
                  ...module,
                  lessons: module.lessons.map(lesson =>
                    lesson.id === lessonId
                      ? {
                          ...lesson,
                          pages: lesson.pages.filter(page => page.id !== pageId),
                        }
                      : lesson
                  ),
                }
              : module
          ),
        };
      });

      if (selectedPage === pageId) {
        setSelectedPage(null);
        setEditMode('lesson');
      }

      Alert.alert('Sucesso', 'Página eliminada com sucesso.');
    } catch (error) {
      console.error('Erro ao eliminar página:', error);
      Alert.alert('Erro', 'Não foi possível eliminar a página.');
    } finally {
      setDeletingPageId(null);
    }
  };

  const handleDeletePage = (page: PageStructure, moduleId?: string, lessonId?: string) => {
    if (!canManageCourse) {
      Alert.alert('Sem permissão', 'Precisa de ser administrador ou autor do curso para eliminar páginas.');
      return;
    }

    if (!moduleId || !lessonId) {
      Alert.alert('Erro', 'Contexto inválido para eliminar a página.');
      return;
    }

    const pageTitle = page.title?.trim().length ? page.title : `Página ${page.position}`;

    Alert.alert(
      'Eliminar página',
      `Tem a certeza que deseja eliminar "${pageTitle}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => confirmDeletePage(page.id, lessonId, moduleId),
        },
      ]
    );
  };

  const renderTopBar = () => (
    <View style={styles.topbar}>
      <View style={styles.topbarInner}>
        <Text style={styles.pageTitle}>Construtor de Curso</Text>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.btn} onPress={handleBackToList}>
            <MaterialIcons name="arrow-back" size={16} color={COLORS.text} />
            <Text style={styles.btnText}>Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn}>
            <Text style={styles.btnText}>Duplicar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn}>
            <Text style={styles.btnText}>Mover para rascunho</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnDanger, (!canManageCourse || isDeleting) && styles.btnDisabled]}
            onPress={handleDeleteCourse}
            disabled={!canManageCourse || isDeleting}
          >
            <MaterialIcons name="delete-outline" size={16} color="white" />
            <Text style={styles.btnDangerText}>{isDeleting ? 'A eliminar…' : 'Eliminar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={saveCourseChanges}>
            <MaterialIcons name="save" size={16} color="white" />
            <Text style={styles.btnPrimaryText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderOutlinePanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelTitle}>Estrutura</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segButton, viewMode === 'modules' && styles.segButtonActive]}
            onPress={() => setViewMode('modules')}
          >
            <Text style={[styles.segButtonText, viewMode === 'modules' && styles.segButtonTextActive]}>
              Módulos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segButton, viewMode === 'lessons' && styles.segButtonActive]}
            onPress={() => setViewMode('lessons')}
          >
            <Text style={[styles.segButtonText, viewMode === 'lessons' && styles.segButtonTextActive]}>
              Lições
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.outlineList}>
        {courseStructure?.modules.map((module) => (
          <View key={module.id}>
            <TouchableOpacity
              style={[styles.node, selectedModule === module.id && styles.nodeSelected]}
              onPress={() => handleModuleSelect(module.id)}
            >
              <View style={styles.nodeHeader}>
                <MaterialIcons
                  name={selectedModule === module.id ? 'expand-less' : 'expand-more'}
                  size={16}
                  color={COLORS.muted}
                />
                <Text style={styles.nodeTitle} numberOfLines={1}>
                  {module.title || `Módulo ${module.position}`}
                </Text>
              </View>
              <View style={styles.nodeRight}>
                <View style={styles.nodeCount}>
                  <Text style={styles.nodeCountText}>{getModuleStats(module)}</Text>
                </View>
                {canManageCourse && (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      handleDeleteModule(module);
                    }}
                    style={({ pressed }) => [
                      styles.nodeActionButton,
                      deletingModuleId === module.id && styles.nodeActionDisabled,
                      pressed && styles.nodeActionPressed,
                    ]}
                    disabled={deletingModuleId === module.id}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons
                      name={deletingModuleId === module.id ? 'hourglass-empty' : 'delete-outline'}
                      size={16}
                      color={deletingModuleId === module.id ? COLORS.muted : COLORS.danger}
                    />
                  </Pressable>
                )}
              </View>
            </TouchableOpacity>

            {selectedModule === module.id && (
              <View style={styles.subNodes}>
                {module.lessons.map((lesson) => (
                  <View key={lesson.id}>
                    <TouchableOpacity
                      style={[styles.subNode, selectedLesson === lesson.id && styles.nodeSelected]}
                      onPress={() => handleLessonSelect(lesson.id)}
                    >
                      <View style={styles.nodeHeader}>
                        <MaterialIcons
                          name={selectedLesson === lesson.id ? 'expand-less' : 'expand-more'}
                          size={14}
                          color={COLORS.muted}
                        />
                        <Text style={styles.subNodeTitle} numberOfLines={1}>
                          {lesson.title || `Lição ${lesson.position}`}
                        </Text>
                      </View>
                      <View style={styles.subNodeRight}>
                        <View style={styles.nodeCount}>
                          <Text style={styles.nodeCountText}>{lesson.pages.length}</Text>
                        </View>
                        {canManageCourse && (
                          <Pressable
                            onPress={(event) => {
                              event.stopPropagation();
                              handleDeleteLesson(lesson, module.id);
                            }}
                            style={({ pressed }) => [
                              styles.nodeActionButton,
                              deletingLessonId === lesson.id && styles.nodeActionDisabled,
                              pressed && styles.nodeActionPressed,
                            ]}
                            disabled={deletingLessonId === lesson.id}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialIcons
                              name={deletingLessonId === lesson.id ? 'hourglass-empty' : 'delete-outline'}
                              size={14}
                              color={deletingLessonId === lesson.id ? COLORS.muted : COLORS.danger}
                            />
                          </Pressable>
                        )}
                      </View>
                    </TouchableOpacity>

                    {selectedLesson === lesson.id && (
                      <View style={styles.subSubNodes}>
                        {lesson.pages.map((page) => (
                          <TouchableOpacity
                            key={page.id}
                            style={[styles.subSubNode, selectedPage === page.id && styles.nodeSelected]}
                            onPress={() => handlePageSelect(page.id)}
                          >
                            <View style={styles.nodeHeader}>
                              <MaterialIcons name="description" size={12} color={COLORS.muted} />
                              <Text style={styles.subSubNodeTitle} numberOfLines={1}>
                                {page.title || `Página ${page.position}`}
                              </Text>
                            </View>
                            <View style={styles.subSubNodeRight}>
                              <View style={styles.pageTypeChip}>
                                <Text style={styles.pageTypeText}>{page.type}</Text>
                              </View>
                              {canManageCourse && (
                                <Pressable
                                  onPress={(event) => {
                                    event.stopPropagation();
                                    handleDeletePage(page, module.id, lesson.id);
                                  }}
                                  style={({ pressed }) => [
                                    styles.nodeActionButton,
                                    deletingPageId === page.id && styles.nodeActionDisabled,
                                    pressed && styles.nodeActionPressed,
                                  ]}
                                  disabled={deletingPageId === page.id}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <MaterialIcons
                                    name={deletingPageId === page.id ? 'hourglass-empty' : 'delete-outline'}
                                    size={12}
                                    color={deletingPageId === page.id ? COLORS.muted : COLORS.danger}
                                  />
                                </Pressable>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}

                        <TouchableOpacity
                          style={styles.addPageButton}
                          onPress={() => handleCreatePage(lesson.id)}
                        >
                          <MaterialIcons name="add" size={12} color={COLORS.primary} />
                          <Text style={styles.addPageButtonText}>Nova Página</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.panelFoot}>
        <TouchableOpacity
          style={[
            styles.addButton,
            (!canManageCourse || creatingModule) && styles.addButtonDisabled,
          ]}
          onPress={handleCreateModule}
          disabled={!canManageCourse || creatingModule}
        >
          <MaterialIcons
            name={creatingModule ? 'hourglass-empty' : 'add'}
            size={16}
            color={creatingModule ? COLORS.muted : COLORS.primary}
          />
          <Text
            style={[
              styles.addButtonText,
              creatingModule && styles.addButtonTextDisabled,
            ]}
          >
            {creatingModule ? 'A criar…' : 'Módulo'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.addButton,
            (!canManageCourse || creatingLesson) && styles.addButtonDisabled,
            !selectedModule && styles.addButtonDisabled,
          ]}
          onPress={handleCreateLesson}
          disabled={!canManageCourse || creatingLesson}
        >
          <MaterialIcons
            name={creatingLesson ? 'hourglass-empty' : 'add'}
            size={16}
            color={
              creatingLesson
                ? COLORS.muted
                : !selectedModule
                ? COLORS.muted
                : COLORS.primary
            }
          />
          <Text
            style={[
              styles.addButtonText,
              (creatingLesson || !selectedModule) && styles.addButtonTextDisabled,
            ]}
          >
            {creatingLesson ? 'A criar…' : 'Lição'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEditorPanel = () => {
    const selectedModuleData = getSelectedModule();
    const selectedLessonData = getSelectedLesson();
    const selectedPageData = getSelectedPage();

    return (
      <View style={styles.panel}>
        <ScrollView style={styles.editor}>
          {editMode === 'course' && (
            <>
              {/* Course Title and Status */}
              <View style={styles.titleRow}>
                <View style={styles.field}>
                  <Text style={styles.label}>Título do curso</Text>
                  <TextInput
                    style={styles.input}
                    value={courseStructure?.title || ''}
                    onChangeText={updateCourseTitle}
                    placeholder="Digite o título do curso"
                  />
                </View>
                <View style={styles.statusContainer}>
                  <View style={[
                    styles.statusChip,
                    courseStructure?.published ? styles.statusPublished : styles.statusDraft
                  ]}>
                    <Text style={[
                      styles.statusText,
                      courseStructure?.published ? styles.statusTextPublished : styles.statusTextDraft
                    ]}>
                      {courseStructure?.published ? 'Publicado' : 'Rascunho'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.btn}>
                    <Text style={styles.btnText}>
                      {courseStructure?.published ? 'Despublicar' : 'Publicar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Description */}
              <View style={styles.field}>
                <Text style={styles.label}>Descrição</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={courseStructure?.description || ''}
                  onChangeText={updateCourseDescription}
                  placeholder="Descreva o seu curso"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* KPIs */}
              <View style={styles.kpis}>
                <View style={styles.kpi}>
                  <Text style={styles.kpiNumber}>
                    {courseStructure?.modules.length || 0}
                  </Text>
                  <Text style={styles.kpiLabel}>Módulos</Text>
                </View>
                <View style={styles.kpi}>
                  <Text style={styles.kpiNumber}>
                    {courseStructure?.modules.reduce((sum, m) => sum + m.lessons.length, 0) || 0}
                  </Text>
                  <Text style={styles.kpiLabel}>Lições</Text>
                </View>
                <View style={styles.kpi}>
                  <Text style={styles.kpiNumber}>
                    {courseStructure?.modules.reduce((sum, m) => 
                      sum + m.lessons.reduce((lessonSum, l) => lessonSum + l.pages.length, 0), 0
                    ) || 0}
                  </Text>
                  <Text style={styles.kpiLabel}>Páginas</Text>
                </View>
              </View>

              {/* Save Course Button */}
              <TouchableOpacity style={styles.btnPrimary} onPress={saveCourseChanges}>
                <MaterialIcons name="save" size={16} color="white" />
                <Text style={styles.btnPrimaryText}>Guardar Curso</Text>
              </TouchableOpacity>
            </>
          )}

          {editMode === 'module' && selectedModuleData && (
            <>
              {/* Module Edit Mode */}
              <View style={styles.titleRow}>
                <View style={styles.field}>
                  <Text style={styles.label}>Título do módulo</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedModuleData.title || ''}
                    onChangeText={updateModuleTitle}
                    placeholder="Digite o título do módulo"
                  />
                </View>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity style={styles.btnPrimary} onPress={saveModuleChanges}>
                    <MaterialIcons name="save" size={16} color="white" />
                    <Text style={styles.btnPrimaryText}>Guardar Módulo</Text>
                  </TouchableOpacity>
                  {canManageCourse && (
                    <TouchableOpacity
                      style={[styles.btnDanger, deletingModuleId === selectedModuleData.id && styles.btnDisabled]}
                      onPress={() => handleDeleteModule(selectedModuleData)}
                      disabled={deletingModuleId === selectedModuleData.id}
                    >
                      <MaterialIcons name="delete-outline" size={16} color="white" />
                      <Text style={styles.btnDangerText}>
                        {deletingModuleId === selectedModuleData.id ? 'A eliminar…' : 'Eliminar'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Module Stats */}
              <View style={styles.kpis}>
                <View style={styles.kpi}>
                  <Text style={styles.kpiNumber}>
                    {selectedModuleData.lessons.length}
                  </Text>
                  <Text style={styles.kpiLabel}>Lições</Text>
                </View>
                <View style={styles.kpi}>
                  <Text style={styles.kpiNumber}>
                    {selectedModuleData.lessons.reduce((sum, l) => sum + l.pages.length, 0)}
                  </Text>
                  <Text style={styles.kpiLabel}>Páginas</Text>
                </View>
              </View>

              {/* Lessons List */}
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Lições neste Módulo</Text>
                {selectedModuleData.lessons.map((lesson) => (
                  <TouchableOpacity
                    key={lesson.id}
                    style={styles.lessonCard}
                    onPress={() => handleLessonSelect(lesson.id)}
                  >
                    <Text style={styles.lessonCardTitle}>
                      {lesson.title || `Lição ${lesson.position}`}
                    </Text>
                    <Text style={styles.lessonCardPages}>
                      {lesson.pages.length} páginas
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {editMode === 'lesson' && selectedLessonData && (
            <>
              {/* Lesson Edit Mode */}
              <View style={styles.titleRow}>
                <View style={styles.field}>
                  <Text style={styles.label}>Título da lição</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedLessonData.title || ''}
                    onChangeText={updateLessonTitle}
                    placeholder="Digite o título da lição"
                  />
                </View>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity style={styles.btnPrimary} onPress={saveLessonChanges}>
                    <MaterialIcons name="save" size={16} color="white" />
                    <Text style={styles.btnPrimaryText}>Guardar Lição</Text>
                  </TouchableOpacity>
                  {canManageCourse && selectedModuleData && (
                    <TouchableOpacity
                      style={[styles.btnDanger, deletingLessonId === selectedLessonData.id && styles.btnDisabled]}
                      onPress={() => handleDeleteLesson(selectedLessonData, selectedModuleData.id)}
                      disabled={deletingLessonId === selectedLessonData.id}
                    >
                      <MaterialIcons name="delete-outline" size={16} color="white" />
                      <Text style={styles.btnDangerText}>
                        {deletingLessonId === selectedLessonData.id ? 'A eliminar…' : 'Eliminar'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Pages in Lesson */}
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Páginas nesta Lição</Text>
                {selectedLessonData.pages.map((page) => (
                  <TouchableOpacity
                    key={page.id}
                    style={styles.pageCard}
                    onPress={() => handleNavigateToPageEdit(page.id)}
                  >
                    <View style={styles.pageCardContent}>
                      <Text style={styles.pageCardTitle}>
                        {page.title || `Página ${page.position}`}
                      </Text>
                      <View style={styles.pageCardMeta}>
                        <View style={styles.pageTypeChip}>
                          <Text style={styles.pageTypeText}>{page.type}</Text>
                        </View>
                        <Text style={styles.pageCardGrains}>
                          {page.grains_count || 0} grãos
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={COLORS.muted} />
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity
                  style={styles.addPageCard}
                  onPress={() => handleCreatePage(selectedLessonData.id)}
                >
                  <MaterialIcons name="add" size={20} color={COLORS.primary} />
                  <Text style={styles.addPageCardText}>Criar Nova Página</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {editMode === 'page' && selectedPageData && (
            <>
              {/* Page Edit Mode */}
              <View style={styles.titleRow}>
                <View style={styles.field}>
                  <Text style={styles.label}>Título da página</Text>
                  <TextInput
                    style={styles.input}
                    value={selectedPageData.title}
                    placeholder="Digite o título da página"
                  />
                </View>
                <View style={styles.buttonGroup}>
                  <TouchableOpacity 
                    style={styles.btnPrimary}
                    onPress={() => handleNavigateToPageEdit(selectedPageData.id)}
                  >
                    <MaterialIcons name="edit" size={16} color="white" />
                    <Text style={styles.btnPrimaryText}>Editar Página</Text>
                  </TouchableOpacity>
                  {canManageCourse && selectedModuleData && selectedLessonData && (
                    <TouchableOpacity
                      style={[styles.btnDanger, deletingPageId === selectedPageData.id && styles.btnDisabled]}
                      onPress={() => handleDeletePage(selectedPageData, selectedModuleData.id, selectedLessonData.id)}
                      disabled={deletingPageId === selectedPageData.id}
                    >
                      <MaterialIcons name="delete-outline" size={16} color="white" />
                      <Text style={styles.btnDangerText}>
                        {deletingPageId === selectedPageData.id ? 'A eliminar…' : 'Eliminar'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Page Info */}
              <View style={styles.pageInfo}>
                <View style={styles.pageInfoItem}>
                  <Text style={styles.pageInfoLabel}>Tipo</Text>
                  <View style={styles.pageTypeChip}>
                    <Text style={styles.pageTypeText}>{selectedPageData.type}</Text>
                  </View>
                </View>
                <View style={styles.pageInfoItem}>
                  <Text style={styles.pageInfoLabel}>Grãos</Text>
                  <Text style={styles.pageInfoValue}>{selectedPageData.grains_count || 0}</Text>
                </View>
                <View style={styles.pageInfoItem}>
                  <Text style={styles.pageInfoLabel}>Status</Text>
                  <Text style={styles.pageInfoValue}>{selectedPageData.completion_status}</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderPropertiesPanel = () => (
    <View style={styles.panel}>
      <ScrollView style={styles.props}>
        <View style={styles.prop}>
          <Text style={styles.propLabel}>Autor</Text>
          <Text style={styles.propValue}>{session?.user?.email}</Text>
        </View>
        
        <View style={styles.prop}>
          <Text style={styles.propLabel}>Capa</Text>
          <TouchableOpacity style={styles.fileInput}>
            <Text style={styles.fileInputText}>Escolher arquivo</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.prop}>
          <Text style={styles.propLabel}>Visibilidade</Text>
          <View style={styles.select}>
            <Text style={styles.selectText}>Público</Text>
            <MaterialIcons name="expand-more" size={16} color={COLORS.muted} />
          </View>
        </View>
        
        <View style={styles.prop}>
          <Text style={styles.propLabel}>SEO</Text>
          <TextInput
            style={styles.propInput}
            placeholder="Título SEO"
          />
          <TextInput
            style={styles.propInput}
            placeholder="Slug"
            value="paxarinhos-pio-pio"
          />
          <TextInput
            style={[styles.propInput, styles.propTextArea]}
            placeholder="Descrição"
            multiline
            numberOfLines={2}
          />
        </View>
        
        <TouchableOpacity style={styles.saveButton}>
          <MaterialIcons name="save" size={16} color="white" />
          <Text style={styles.saveButtonText}>Guardar alterações</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

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
        <MaterialIcons name="error" size={48} color={COLORS.danger} />
        <Text style={styles.errorText}>Curso não encontrado</Text>
      </View>
    );
  }

  const { width } = Dimensions.get('window');
  const isLargeScreen = width >= 1200;

  return (
    <View style={styles.app}>
      <ModernSidebar
        currentRoute="CourseBuilder"
        onNavigate={handleNavigate}
      />
      
      <View style={styles.main}>
        {renderTopBar()}
        
        <View style={styles.content}>
          <View style={[styles.builder, !isLargeScreen && styles.builderSmall]}>
            {renderOutlinePanel()}
            {renderEditorPanel()}
            {isLargeScreen && renderPropertiesPanel()}
          </View>
        </View>
      </View>
    </View>
  );
};

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
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    gap: 4,
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
  btnDanger: {
    backgroundColor: COLORS.danger,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDangerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
  },
  builder: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  builderSmall: {
    // On smaller screens, hide the right panel
  },
  panel: {
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  panelHead: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  segButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  segButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  segButtonText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '400',
  },
  segButtonTextActive: {
    color: COLORS.text,
  },
  outlineList: {
    padding: 8,
    maxHeight: 400,
    minWidth: 300,
  },
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 10,
    borderRadius: BORDER_RADIUS.md,
  },
  nodeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nodeSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
  },
  nodeTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  nodeCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
  },
  nodeCountText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  nodeHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subNodes: {
    marginLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(99, 102, 241, 0.1)',
    paddingLeft: 8,
  },
  subNode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 8,
    borderRadius: BORDER_RADIUS.md,
    marginVertical: 2,
  },
  subNodeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subNodeTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  subSubNodes: {
    marginLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(99, 102, 241, 0.1)',
    paddingLeft: 8,
  },
  subSubNode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: 6,
    borderRadius: BORDER_RADIUS.sm,
    marginVertical: 1,
  },
  subSubNodeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subSubNodeTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.text,
  },
  nodeActionButton: {
    padding: 4,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeActionDisabled: {
    opacity: 0.5,
  },
  nodeActionPressed: {
    opacity: 0.7,
  },
  pageTypeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  pageTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
  },
  addPageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
    marginTop: 4,
  },
  addPageButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.primary,
  },
  panelFoot: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    flexDirection: 'row',
    gap: 8,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.bg,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  addButtonTextDisabled: {
    color: COLORS.muted,
  },
  editor: {
    padding: 16,
    flex: 1,
    minWidth: 400,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
    marginBottom: 16,
  },
  field: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg2,
    color: COLORS.text,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  statusPublished: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusDraft: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextPublished: {
    color: COLORS.success,
  },
  statusTextDraft: {
    color: COLORS.warning,
  },
  kpis: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  kpi: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    minWidth: 80,
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  kpiLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  block: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.lg,
    padding: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
    marginBottom: 16,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  lessonCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.bg2,
    marginBottom: 6,
  },
  lessonCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  lessonCardPages: {
    fontSize: 12,
    color: COLORS.muted,
  },
  pageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.bg2,
    marginBottom: 6,
  },
  pageCardContent: {
    flex: 1,
    gap: 4,
  },
  pageCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  pageCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageCardGrains: {
    fontSize: 12,
    color: COLORS.muted,
  },
  addPageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
    marginTop: 8,
  },
  addPageCardText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  pageInfo: {
    gap: 12,
  },
  pageInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.md,
  },
  pageInfoLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  pageInfoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  props: {
    padding: 12,
    minWidth: 320,
  },
  prop: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.lg,
    padding: 10,
    marginBottom: 12,
  },
  propLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 6,
  },
  propValue: {
    fontSize: 14,
    color: COLORS.text,
  },
  propInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg2,
    color: COLORS.text,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    marginBottom: 6,
  },
  propTextArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  fileInput: {
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  fileInputText: {
    fontSize: 12,
    color: COLORS.text,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg2,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  selectText: {
    fontSize: 12,
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  errorText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.danger,
    marginTop: SPACING.md,
  },
});

export default ModernCourseBuilderScreen;