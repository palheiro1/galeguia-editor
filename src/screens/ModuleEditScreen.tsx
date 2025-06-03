import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS } from '../styles/designSystem';
import { Card, Button, Input, Badge, IconButton, EmptyState } from '../components/UIComponents';

// Definição do tipo do módulo
type Module = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
};

// Definição do tipo da lição para a lista
type Lesson = {
  id: string;
  module_id: string;
  title: string;
  position: number; // Mudado de 'order' para 'position'
};

export default function ModuleEditScreen({ route, navigation }: any) {
  const { courseId, moduleId } = route.params;
  const isNewModule = moduleId === null;
  const isFocused = useIsFocused(); // Add this line

  const [title, setTitle] = useState('');
  const [position, setPosition] = useState(0);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Buscar dados do módulo se estiver editando um módulo existente
  useEffect(() => {
    if (!isNewModule) {
      fetchModuleData();
      fetchLessons();
    } else {
      getNextPositionNumber();
    }
  }, [moduleId]); // Keep original dependencies

  // Refetch lessons when the screen is focused
  useEffect(() => {
    if (isFocused && !isNewModule && moduleId) {
      fetchLessons();
    }
  }, [isFocused, moduleId]); // Add isFocused and moduleId as dependencies

  const fetchModuleData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('modules')
        .select('title, position')
        .eq('id', moduleId)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title);
        setPosition(data.position);
      }
    } catch (error) {
      console.error('Erro ao buscar módulo:', error);
      Alert.alert('Erro', 'Falha ao carregar os dados do módulo');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextPositionNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('position')
        .eq('course_id', courseId)
        .order('position', { ascending: false })
        .limit(1);

      if (error) throw error;

      const nextPosition = data && data.length > 0 ? data[0].position + 1 : 1;
      setPosition(nextPosition);
    } catch (error) {
      console.error('Erro ao obter próximo número de posição:', error);
      setPosition(1);
    }
  };

  const fetchLessons = async () => {
    if (!moduleId) return;
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, module_id, title, position') // Selecionar 'position'
        .eq('module_id', moduleId)
        .order('position', { ascending: true }); // Ordenar por 'position'

      if (error) throw error;

      if (data) {
        setLessons(data);
      }
    } catch (error) {
      console.error('Erro ao buscar lições:', error);
      const displayError = error instanceof Error ? error.message : 'Falha ao carregar as lições';
      Alert.alert('Erro', displayError);
    }
  };

  const saveModule = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'O título é obrigatório');
      return;
    }

    try {
      setIsSaving(true);

      const moduleData = {
        title: title.trim(),
        position,
        updated_at: new Date().toISOString(),
      };

      if (isNewModule) {
        const { data, error } = await supabase
          .from('modules')
          .insert({
            ...moduleData,
            course_id: courseId,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        Alert.alert('Sucesso', 'Módulo criado com sucesso');
        navigation.navigate('CourseEdit', {
          courseId,
          refresh: true
        });
      } else {
        const { error } = await supabase
          .from('modules')
          .update(moduleData)
          .eq('id', moduleId);

        if (error) throw error;

        Alert.alert('Sucesso', 'Módulo atualizado com sucesso');
        navigation.navigate('CourseEdit', {
          courseId,
          refresh: true
        });
      }
    } catch (error) {
      console.error('Erro ao salvar módulo:', error);
      Alert.alert('Erro', 'Falha ao salvar módulo');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteModule = async () => {
    if (!moduleId) {
      Alert.alert('Erro', 'ID do módulo não encontrado. Não é possível eliminar.');
      console.error('deleteModule: moduleId is missing.');
      return;
    }

    const performDeleteModule = async () => {
      console.log("performDeleteModule called. Attempting to delete module with ID:", moduleId);
      setIsLoading(true);
      try {
        // First, delete all pages associated with lessons of this module (if necessary and not handled by CASCADE)
        // Then, delete all lessons associated with this module
        const { data: lessonsToDelete, error: lessonsError } = await supabase
          .from('lessons')
          .select('id')
          .eq('module_id', moduleId);

        if (lessonsError) {
          console.error('Error fetching lessons for deletion:', lessonsError);
          Alert.alert('Erro', 'Falha ao buscar lições para exclusão.');
          setIsLoading(false);
          return;
        }

        if (lessonsToDelete && lessonsToDelete.length > 0) {
          for (const lesson of lessonsToDelete) {
            // Delete pages for each lesson
            const { error: pagesDeleteError } = await supabase
              .from('pages')
              .delete()
              .eq('lesson_id', lesson.id);
            if (pagesDeleteError) {
              console.error(`Error deleting pages for lesson ${lesson.id}:`, pagesDeleteError);
              // Decide if you want to stop or continue
            }
          }
          // Now delete the lessons
          const { error: lessonsDeleteError } = await supabase
            .from('lessons')
            .delete()
            .eq('module_id', moduleId);

          if (lessonsDeleteError) {
            console.error('Error deleting lessons:', lessonsDeleteError);
            Alert.alert('Erro', 'Falha ao excluir as lições do módulo.');
            setIsLoading(false);
            return;
          }
        }

        // Finally, delete the module itself
        const { error: moduleDeleteError } = await supabase
          .from('modules')
          .delete()
          .eq('id', moduleId);

        if (moduleDeleteError) {
          console.error('Error deleting module:', moduleDeleteError);
          Alert.alert('Erro', `Falha ao excluir módulo: ${moduleDeleteError.message}`);
        } else {
          Alert.alert('Sucesso', 'Módulo e suas lições foram excluídos com sucesso');
          navigation.navigate('CourseEdit', {
            courseId,
            refresh: true
          });
        }
      } catch (error) {
        console.error('Erro geral ao excluir módulo e suas dependências:', error);
        Alert.alert('Erro', 'Ocorreu uma falha inesperada ao excluir o módulo.');
      } finally {
        setIsLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Você tem certeza que deseja excluir este módulo? Isso também excluirá todas as lições e páginas deste módulo.')) {
        await performDeleteModule();
      } else {
        console.log('Module deletion cancelled by user (web confirm).');
      }
    } else {
      Alert.alert(
        'Confirmar Exclusão',
        'Você tem certeza que deseja excluir este módulo? Isso também excluirá todas as lições e páginas deste módulo.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => console.log('Module deletion cancelled by user (native alert).') },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: performDeleteModule,
          }
        ],
        { cancelable: true }
      );
    }
  };

  const createLesson = () => {
    if (isNewModule) {
      Alert.alert('Informação', 'Por favor, salve o módulo primeiro antes de adicionar lições');
      return;
    }
    // Pass courseId when navigating to LessonEdit for a new lesson
    navigation.navigate('LessonEdit', { courseId, moduleId, lessonId: null });
  };

  const editLesson = (lessonId: string) => {
    // Pass courseId when navigating to LessonEdit for an existing lesson
    navigation.navigate('LessonEdit', { courseId, moduleId, lessonId });
  };

  const renderLessonItem = ({ item }: { item: Lesson }) => (
    <TouchableOpacity
      style={styles.lessonItem}
      onPress={() => editLesson(item.id)}
    >
      <View style={styles.lessonInfo}>
        <Text style={styles.lessonTitle}>{item.title}</Text>
        <Text style={styles.lessonPosition}>Posição: {item.position}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isNewModule ? 'Criar Módulo' : 'Editar Módulo'}
        </Text>
      </View>
      
      <View style={styles.form}>
        <Text style={styles.label}>Título *</Text>
        <TextInput
          style={styles.input}
          placeholder="Título do módulo"
          value={title}
          onChangeText={setTitle}
        />
        
        <Text style={styles.label}>Posição</Text>
        <TextInput
          style={styles.input}
          placeholder="Posição do módulo (ex: 1, 2, 3)"
          value={position.toString()}
          onChangeText={(text) => setPosition(parseInt(text) || 0)}
          keyboardType="numeric"
        />
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          ><Text style={styles.buttonText}>Cancelar</Text></TouchableOpacity><TouchableOpacity
            style={[styles.button, styles.saveButton, isSaving && styles.disabledButton]}
            onPress={saveModule}
            disabled={isSaving}
          ><Text style={styles.buttonText}>{isSaving ? 'Salvando...' : 'Salvar Módulo'}</Text></TouchableOpacity>
        </View>
        
        {!isNewModule && (
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={deleteModule}
          ><Text style={styles.buttonText}>Excluir Módulo</Text></TouchableOpacity>
        )}
      </View>
      
      {!isNewModule && (
        <View style={styles.lessonsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lições</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={createLesson}
            ><Text style={styles.addButtonText}>+ Adicionar Lição</Text></TouchableOpacity>
          </View>
          
          {lessons.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nenhuma lição ainda. Clique em "Adicionar Lição" para criar uma.
              </Text>
            </View>
          ) : (
            <FlatList
              data={lessons}
              renderItem={renderLessonItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  
  // Header styles
  header: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
  },
  
  // Form styles
  form: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  label: {
    ...TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.base,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    marginBottom: SPACING.base,
  },
  
  // Button styles
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 44,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.white,
  },
  cancelButton: {
    backgroundColor: COLORS.gray500,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    marginTop: SPACING.lg,
  },
  disabledButton: {
    backgroundColor: COLORS.gray400,
    opacity: 0.6,
  },
  addButton: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  deleteButtonContainer: {
    marginTop: SPACING.lg,
  },
  
  // Lessons section styles
  lessonsSection: {
    flex: 1,
    padding: SPACING.lg,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  
  // List styles
  list: {
    paddingBottom: SPACING.xl,
  },
  
  // Lesson item styles (for backward compatibility)
  lessonItem: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  lessonInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    flex: 1,
  },
  lessonPosition: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  
  // Empty state styles
  emptyContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  
  // Responsive styles
  ...(Platform.OS === 'web' && {
    containerWeb: {
      maxWidth: 800,
      alignSelf: 'center',
      width: '100%',
    },
    formWeb: {
      padding: SPACING.xl,
    },
  }),
});
