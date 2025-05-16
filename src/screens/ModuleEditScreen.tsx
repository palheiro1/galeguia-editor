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
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useIsFocused } from '@react-navigation/native'; // Add this import

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
    try {
      Alert.alert(
        'Confirmar Exclusão',
        'Você tem certeza que deseja excluir este módulo? Isso também excluirá todas as lições deste módulo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              setIsLoading(true);

              const { error } = await supabase
                .from('modules')
                .delete()
                .eq('id', moduleId);

              if (error) throw error;

              Alert.alert('Sucesso', 'Módulo excluído com sucesso');
              navigation.navigate('CourseEdit', {
                courseId,
                refresh: true
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao excluir módulo:', error);
      Alert.alert('Erro', 'Falha ao excluir módulo');
      setIsLoading(false);
    }
  };

  const createLesson = () => {
    if (isNewModule) {
      Alert.alert('Informação', 'Por favor, salve o módulo primeiro antes de adicionar lições');
      return;
    }
    navigation.navigate('LessonEdit', { moduleId, lessonId: null });
  };

  const editLesson = (lessonId: string) => {
    navigation.navigate('LessonEdit', { moduleId, lessonId });
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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 16,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#9aa0a6',
  },
  saveButton: {
    backgroundColor: '#4285F4',
  },
  deleteButton: {
    backgroundColor: '#ea4335',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  lessonsSection: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#34a853',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  list: {
    paddingBottom: 20,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  lessonItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  lessonInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  lessonPosition: {
    fontSize: 14,
    color: '#555',
  },
});
