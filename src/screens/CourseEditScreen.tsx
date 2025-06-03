import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS } from '../styles/designSystem';
import { Card, Button, Input, Badge, IconButton } from '../components/UIComponents';

// Definição de tipos

type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  published: boolean;
  creator_id: string;
  created_at: string;
  updated_at: string;
  modules_count?: number | null;
  lessons_per_module?: number | null;
  pages_per_lesson?: number | null;
  structure_created?: boolean;
};

type Module = {
  id: string;
  course_id: string;
  title: string;
  position: number;
};

type CourseStructure = {
  modulesCount: number;
  lessonsPerModule: number;
  pagesPerLesson: number;
};

export default function CourseEditScreen({ route, navigation }: any) {
  const { courseId, refresh } = route.params;
  const isNewCourse = courseId === null;
  const { profile, session } = useAuth();
  const userId = session?.user?.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  
  // Course structure state
  const [showStructureForm, setShowStructureForm] = useState(false);
  const [courseStructure, setCourseStructure] = useState<CourseStructure>({
    modulesCount: 3,
    lessonsPerModule: 5,
    pagesPerLesson: 4,
  });
  const [structureCreated, setStructureCreated] = useState(false);

  useEffect(() => {
    if (!isNewCourse) fetchCourseData();
  }, [courseId]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isNewCourse && refresh) fetchModules();
      return () => {};
    }, [refresh, isNewCourse])
  );

  const fetchCourseData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title);
        setDescription(data.description || '');
        setCoverImageUrl(data.cover_image_url);
        setImageLoadError(null);
        setPublished(data.published);
        
        // Load structure data
        if (data.modules_count && data.lessons_per_module && data.pages_per_lesson) {
          setCourseStructure({
            modulesCount: data.modules_count,
            lessonsPerModule: data.lessons_per_module,
            pagesPerLesson: data.pages_per_lesson,
          });
        }
        setStructureCreated(data.structure_created || false);
        
        await fetchModules();
      }
    } catch (error) {
      console.error('Erro ao buscar curso:', error);
      Alert.alert('Erro', 'Falha ao carregar dados do curso');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModules = async () => {
    if (!courseId) return;
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('id, course_id, title, position')
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      if (error) throw error;
      if (data) setModules(data);
    } catch (error) {
      console.error('Erro ao buscar módulos:', error);
      Alert.alert('Erro', `Falha ao carregar módulos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: Platform.OS === 'web',
    });

    if (!result.canceled) {
      try {
        const asset = result.assets[0];
        const uploadedUrl = await uploadImage(asset.uri, userId);
        if (uploadedUrl) {
          setCoverImageUrl(uploadedUrl);
          setImageLoadError(null);
        } else {
          setImageLoadError('Falha ao carregar imagem.');
        }
      } catch (error) {
        console.error('Erro ao processar imagem:', error);
        Alert.alert('Erro', 'Falha ao processar a imagem selecionada');
        setImageLoadError('Erro ao processar imagem.');
      }
    }
  };

  const uploadImage = async (uri: string, userId?: string) => {
    if (!userId) {
      Alert.alert('Erro', 'Erro de autenticação.');
      return null;
    }
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      let fileExt = blob.type?.split('/')[1];
      if (!fileExt && uri) fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';

      const fileName = `cover_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-content')
        .upload(filePath, blob, { contentType: blob.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
    } catch (error) {
      Alert.alert('Erro', 'Erro ao fazer upload da imagem.');
      return null;
    }
  };

  const saveCourse = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'O título é obrigatório');
      return;
    }

    try {
      setIsSaving(true);

      const courseData = {
        title: title.trim(),
        description: description.trim() || null,
        cover_image_url: coverImageUrl,
        updated_at: new Date().toISOString(),
      };

      if (isNewCourse) {
        // For new courses, include structure data
        const newCourseData = {
          ...courseData,
          creator_id: userId,
          published: false,
          created_at: new Date().toISOString(),
          modules_count: courseStructure.modulesCount,
          lessons_per_module: courseStructure.lessonsPerModule,
          pages_per_lesson: courseStructure.pagesPerLesson,
          structure_created: false,
        };

        const { data: insertedCourse, error } = await supabase
          .from('courses')
          .insert(newCourseData)
          .select()
          .single();

        if (error) throw error;
        
        // Create the course structure
        if (insertedCourse) {
          await createCourseStructure(insertedCourse.id);
        }
        
        Alert.alert('Sucesso', 'Curso criado com sucesso');
        navigation.navigate('CourseList');
      } else {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', courseId);

        if (error) throw error;
        Alert.alert('Sucesso', 'Curso atualizado com sucesso');
        navigation.navigate('CourseList');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar curso');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublish = async () => {
    if (profile?.role !== 'admin') {
      Alert.alert('Permissão negada', 'Apenas administradores podem publicar cursos');
      return;
    }
    if (isNewCourse) {
      Alert.alert('Aviso', 'Guarde o curso antes de publicar');
      return;
    }

    try {
      setIsSaving(true);
      const newPublishState = !published;
      const { error } = await supabase
        .from('courses')
        .update({ published: newPublishState, updated_at: new Date().toISOString() })
        .eq('id', courseId);

      if (error) throw error;
      setPublished(newPublishState);
      Alert.alert('Sucesso', `Curso ${newPublishState ? 'publicado' : 'despublicado'} com sucesso`);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao atualizar estado de publicação');
    } finally {
      setIsSaving(false);
    }
  };

  const createModule = () => {
    if (isNewCourse) {
      Alert.alert('Aviso', 'Guarde o curso antes de criar módulos');
      return;
    }
    navigation.navigate('ModuleEdit', { courseId, moduleId: null });
  };

  const createCourseStructure = async (courseId: string) => {
    try {
      // Create modules
      const modules = [];
      for (let moduleIndex = 1; moduleIndex <= courseStructure.modulesCount; moduleIndex++) {
        const { data: moduleData, error: moduleError } = await supabase
          .from('modules')
          .insert({
            course_id: courseId,
            title: `Módulo ${moduleIndex}`,
            position: moduleIndex,
          })
          .select()
          .single();

        if (moduleError) throw moduleError;
        modules.push(moduleData);

        // Create lessons for each module
        const lessons = [];
        for (let lessonIndex = 1; lessonIndex <= courseStructure.lessonsPerModule; lessonIndex++) {
          const { data: lessonData, error: lessonError } = await supabase
            .from('lessons')
            .insert({
              module_id: moduleData.id,
              title: `Lição ${lessonIndex}`,
              position: lessonIndex,
            })
            .select()
            .single();

          if (lessonError) throw lessonError;
          lessons.push(lessonData);

          // Create pages for each lesson
          for (let pageIndex = 1; pageIndex <= courseStructure.pagesPerLesson; pageIndex++) {
            const { data: pageData, error: pageError } = await supabase
              .from('pages')
              .insert({
                lesson_id: lessonData.id,
                title: `Página ${pageIndex}`,
                position: pageIndex,
                type: 'Introduction', // Default type
              })
              .select()
              .single();

            if (pageError) throw pageError;

            // Create 15 grains for each page
            const grains = [];
            for (let grainIndex = 1; grainIndex <= 15; grainIndex++) {
              grains.push({
                page_id: pageData.id,
                position: grainIndex,
                type: 'textToComplete', // Default grain type
                content: {
                  text: '',
                  options: [],
                  correctAnswer: '',
                },
              });
            }

            const { error: grainsError } = await supabase
              .from('grains')
              .insert(grains);

            if (grainsError) throw grainsError;
          }
        }
      }

      // Mark structure as created
      const { error: updateError } = await supabase
        .from('courses')
        .update({ structure_created: true })
        .eq('id', courseId);

      if (updateError) throw updateError;
      
      setStructureCreated(true);
    } catch (error) {
      console.error('Erro ao criar estrutura do curso:', error);
      Alert.alert('Erro', 'Falha ao criar estrutura do curso');
      throw error;
    }
  };

  const editModule = (moduleId: string) => {
    navigation.navigate('ModuleEdit', { courseId, moduleId });
  };

  const renderModuleItem = ({ item }: { item: Module }) => (
    <TouchableOpacity style={styles.moduleItem} onPress={() => editModule(item.id)}>
      <View style={styles.moduleInfo}>
        <Text style={styles.moduleTitle}>{item.title}</Text>
        <Text style={styles.modulePosition}>Posição: {item.position}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleImageError = (error: any) => {
    setImageLoadError('Falha ao carregar imagem de capa. Verifique permissões no Supabase.');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {/* Header title is now handled by navigation options in App.tsx */}
      </View>

      <View style={styles.form}>
        {isNewCourse && !showStructureForm && (
          <View style={styles.structurePrompt}>
            <Text style={styles.structureTitle}>Definir Estrutura do Curso</Text>
            <Text style={styles.structureDescription}>
              Para garantir consistência, defina primeiro a estrutura do seu curso:
            </Text>
            <View style={styles.structurePreview}>
              <Text style={styles.previewText}>
                📚 {courseStructure.modulesCount} Módulos
              </Text>
              <Text style={styles.previewText}>
                📖 {courseStructure.lessonsPerModule} Lições por módulo
              </Text>
              <Text style={styles.previewText}>
                📄 {courseStructure.pagesPerLesson} Páginas por lição
              </Text>
              <Text style={styles.previewText}>
                ⚡ 15 Grãos por página (fixo)
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.configureButton} 
              onPress={() => setShowStructureForm(true)}
            >
              <Text style={styles.configureButtonText}>Configurar Estrutura</Text>
            </TouchableOpacity>
          </View>
        )}

        {isNewCourse && showStructureForm && (
          <View style={styles.structureForm}>
            <Text style={styles.structureTitle}>Configurar Estrutura do Curso</Text>
            
            <View style={styles.structureField}>
              <Text style={styles.structureLabel}>Número de Módulos (recomendado: 10):</Text>
              <View style={styles.numberInputContainer}>
                <TouchableOpacity 
                  style={styles.numberButton}
                  onPress={() => setCourseStructure(prev => ({ 
                    ...prev, 
                    modulesCount: Math.max(1, prev.modulesCount - 1) 
                  }))}
                >
                  <Text style={styles.numberButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.numberDisplay}>{courseStructure.modulesCount}</Text>
                <TouchableOpacity 
                  style={styles.numberButton}
                  onPress={() => setCourseStructure(prev => ({ 
                    ...prev, 
                    modulesCount: Math.min(20, prev.modulesCount + 1) 
                  }))}
                >
                  <Text style={styles.numberButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.structureField}>
              <Text style={styles.structureLabel}>Lições por Módulo (recomendado: 10):</Text>
              <View style={styles.numberInputContainer}>
                <TouchableOpacity 
                  style={styles.numberButton}
                  onPress={() => setCourseStructure(prev => ({ 
                    ...prev, 
                    lessonsPerModule: Math.max(1, prev.lessonsPerModule - 1) 
                  }))}
                >
                  <Text style={styles.numberButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.numberDisplay}>{courseStructure.lessonsPerModule}</Text>
                <TouchableOpacity 
                  style={styles.numberButton}
                  onPress={() => setCourseStructure(prev => ({ 
                    ...prev, 
                    lessonsPerModule: Math.min(20, prev.lessonsPerModule + 1) 
                  }))}
                >
                  <Text style={styles.numberButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.structureField}>
              <Text style={styles.structureLabel}>Páginas por Lição (recomendado: 4):</Text>
              <View style={styles.numberInputContainer}>
                <TouchableOpacity 
                  style={styles.numberButton}
                  onPress={() => setCourseStructure(prev => ({ 
                    ...prev, 
                    pagesPerLesson: Math.max(1, prev.pagesPerLesson - 1) 
                  }))}
                >
                  <Text style={styles.numberButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.numberDisplay}>{courseStructure.pagesPerLesson}</Text>
                <TouchableOpacity 
                  style={styles.numberButton}
                  onPress={() => setCourseStructure(prev => ({ 
                    ...prev, 
                    pagesPerLesson: Math.min(10, prev.pagesPerLesson + 1) 
                  }))}
                >
                  <Text style={styles.numberButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.structureSummary}>
              <Text style={styles.summaryTitle}>Resumo da Estrutura:</Text>
              <Text style={styles.summaryText}>
                Total de elementos: {courseStructure.modulesCount * courseStructure.lessonsPerModule * courseStructure.pagesPerLesson * 15} grãos
              </Text>
              <Text style={styles.summaryText}>
                Distribuídos em {courseStructure.modulesCount * courseStructure.lessonsPerModule * courseStructure.pagesPerLesson} páginas
              </Text>
            </View>

            <View style={styles.structureActions}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setShowStructureForm(false)}
              >
                <Text style={styles.backButtonText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={() => setShowStructureForm(false)}
              >
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {(!isNewCourse || !showStructureForm) && (
          <>
            <Text style={styles.label}>Título do Curso *</Text>
            <TextInput style={styles.input} placeholder="Título do curso" value={title} onChangeText={setTitle} />

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descrição do curso"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Imagem de Capa</Text>
            <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
              <Text style={styles.imageUploadText}>
                {coverImageUrl ? 'Alterar Imagem de Capa' : 'Selecionar Imagem de Capa'}
              </Text>
            </TouchableOpacity>

            {coverImageUrl && !imageLoadError ? (
              <Image key={coverImageUrl} source={{ uri: coverImageUrl }} style={styles.imagePreview} onError={handleImageError} />
            ) : (
              <View style={[styles.imagePreviewContainer, styles.imagePlaceholder]}>
                <Text style={styles.placeholderText}>
                  {imageLoadError ? imageLoadError : 'Nenhuma imagem de capa selecionada'}
                </Text>
              </View>
            )}

            {!isNewCourse && (
              <FlatList
                data={modules}
                keyExtractor={(item) => item.id}
                renderItem={renderModuleItem}
              />
            )}

            <TouchableOpacity onPress={saveCourse} style={styles.saveButton}>
              <Text style={styles.buttonText}>Guardar Curso</Text>
            </TouchableOpacity>

            {!isNewCourse && (
              <TouchableOpacity onPress={togglePublish} style={styles.publishButton}>
                <Text style={styles.buttonText}>
                  {published ? 'Despublicar Curso' : 'Publicar Curso'}
                </Text>
              </TouchableOpacity>
            )}

            {!isNewCourse && (
              <TouchableOpacity onPress={createModule} style={styles.addButton}>
                <Text style={styles.addButtonText}>Adicionar Módulo</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  form: {
    padding: SPACING.xl,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.md,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    marginBottom: SPACING.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.gray700,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  imageSection: {
    gap: SPACING.md,
  },
  imageUploadButton: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  imageUploadContent: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  imageUploadText: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.base,
    textAlign: 'center',
  },
  imageUploadHint: {
    color: COLORS.gray500,
    fontSize: TYPOGRAPHY.fontSize.sm,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray100,
  },
  imageActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  // Structure section styles
  structureSection: {
    gap: SPACING.lg,
  },
  structurePrompt: {
    backgroundColor: COLORS.blue50,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.blue200,
  },
  structureTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.gray900,
    marginBottom: SPACING.md,
  },
  structureDescription: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.gray600,
    marginBottom: SPACING.lg,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.base,
  },
  structurePreview: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  previewText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.gray700,
    marginBottom: SPACING.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  structureForm: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING.lg,
  },
  structureField: {
    gap: SPACING.md,
  },
  structureLabel: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.gray700,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  numberButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  numberButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  numberDisplay: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.gray900,
    minWidth: 60,
    textAlign: 'center',
  },
  structureSummary: {
    backgroundColor: COLORS.blue50,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.gray900,
    marginBottom: SPACING.sm,
  },
  summaryText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.gray700,
    marginBottom: SPACING.xs,
  },
  structureActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  // Module list styles
  modulesSection: {
    gap: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.gray900,
  },
  moduleList: {
    gap: SPACING.md,
  },
  moduleItem: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  moduleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.gray900,
    flex: 1,
  },
  modulePosition: {
    backgroundColor: COLORS.gray200,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginLeft: SPACING.md,
  },
  modulePositionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.gray600,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: COLORS.gray500,
    fontSize: TYPOGRAPHY.fontSize.base,
    textAlign: 'center',
  },
  // Missing styles for backward compatibility
  header: {
    // Empty style for backward compatibility
  },
  input: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.gray900,
  },
  imagePlaceholder: {
    height: 200,
    width: '100%',
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: COLORS.gray500,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.base,
    padding: SPACING.lg,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  publishButton: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  addButton: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  configureButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  configureButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  backButton: {
    flex: 1,
    backgroundColor: COLORS.gray500,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
