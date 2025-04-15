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

// Module type definition
type Module = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
};

// Lesson type definition for the list
type Lesson = {
  id: string;
  module_id: string;
  title: string;
  position: number; // Changed from 'order' to 'position'
};

export default function ModuleEditScreen({ route, navigation }: any) {
  const { courseId, moduleId } = route.params;
  const isNewModule = moduleId === null;

  const [title, setTitle] = useState('');
  const [position, setPosition] = useState(0);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get module data if editing an existing module
  useEffect(() => {
    if (!isNewModule) {
      fetchModuleData();
      fetchLessons();
    } else {
      getNextPositionNumber();
    }
  }, [moduleId]);

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
      console.error('Error fetching module:', error);
      Alert.alert('Error', 'Failed to load module data');
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
      console.error('Error getting next position number:', error);
      setPosition(1);
    }
  };

  const fetchLessons = async () => {
    if (!moduleId) return;
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, module_id, title, position') // Select 'position'
        .eq('module_id', moduleId)
        .order('position', { ascending: true }); // Order by 'position'

      if (error) throw error;

      if (data) {
        setLessons(data);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
      const displayError = error instanceof Error ? error.message : 'Failed to load lessons';
      Alert.alert('Error', displayError);
    }
  };

  const saveModule = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
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

        Alert.alert('Success', 'Module created successfully');
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

        Alert.alert('Success', 'Module updated successfully');
        navigation.navigate('CourseEdit', {
          courseId,
          refresh: true
        });
      }
    } catch (error) {
      console.error('Error saving module:', error);
      Alert.alert('Error', 'Failed to save module');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteModule = async () => {
    try {
      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this module? This will also delete all lessons in this module.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setIsLoading(true);

              const { error } = await supabase
                .from('modules')
                .delete()
                .eq('id', moduleId);

              if (error) throw error;

              Alert.alert('Success', 'Module deleted successfully');
              navigation.navigate('CourseEdit', {
                courseId,
                refresh: true
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting module:', error);
      Alert.alert('Error', 'Failed to delete module');
      setIsLoading(false);
    }
  };

  const createLesson = () => {
    if (isNewModule) {
      Alert.alert('Info', 'Please save the module first before adding lessons');
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
        <Text style={styles.lessonPosition}>Position: {item.position}</Text>
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
          {isNewModule ? 'Create Module' : 'Edit Module'}
        </Text>
      </View>
      
      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Module title"
          value={title}
          onChangeText={setTitle}
        />
        
        <Text style={styles.label}>Position</Text>
        <TextInput
          style={styles.input}
          placeholder="Module position (e.g., 1, 2, 3)"
          value={position.toString()}
          onChangeText={(text) => setPosition(parseInt(text) || 0)}
          keyboardType="numeric"
        />
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          ><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity><TouchableOpacity
            style={[styles.button, styles.saveButton, isSaving && styles.disabledButton]}
            onPress={saveModule}
            disabled={isSaving}
          ><Text style={styles.buttonText}>{isSaving ? 'Saving...' : 'Save Module'}</Text></TouchableOpacity>
        </View>
        
        {!isNewModule && (
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={deleteModule}
          ><Text style={styles.buttonText}>Delete Module</Text></TouchableOpacity>
        )}
      </View>
      
      {!isNewModule && (
        <View style={styles.lessonsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lessons</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={createLesson}
            ><Text style={styles.addButtonText}>+ Add Lesson</Text></TouchableOpacity>
          </View>
          
          {lessons.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No lessons yet. Click "Add Lesson" to create one.
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
    borderLeftWidth: 4,
    borderLeftColor: '#4285F4',
  },
  lessonInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  lessonPosition: { // Renamed from lessonOrder for clarity
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f1f3f4',
    padding: 4,
    borderRadius: 4,
  },
});