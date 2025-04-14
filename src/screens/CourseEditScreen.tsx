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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

// Course type definition
type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  published: boolean;
  creator_id: string;
  created_at: string;
  updated_at: string;
};

// Module type definition for the list
type Module = {
  id: string;
  course_id: string;
  title: string;
  order: number;
};

export default function CourseEditScreen({ route, navigation }: any) {
  const { courseId, refresh } = route.params;
  const isNewCourse = courseId === null;
  const { profile } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  
  // Get course data if editing an existing course
  useEffect(() => {
    if (!isNewCourse) {
      fetchCourseData();
    }
  }, [courseId]);
  
  // Refresh modules when returning from ModuleEdit screen
  useFocusEffect(
    React.useCallback(() => {
      if (!isNewCourse && refresh) {
        fetchModules();
      }
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
        setPublished(data.published);
        
        // Fetch modules for this course
        await fetchModules();
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      Alert.alert('Error', 'Failed to load course data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch modules for this course
  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('id, course_id, title, order')
        .eq('course_id', courseId)
        .order('order', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        setModules(data);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      Alert.alert('Error', 'Failed to load modules');
    }
  };
  
  // Image picker function
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.IMAGE],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      try {
        const imageUri = result.assets[0].uri;
        const uploadedUrl = await uploadImage(imageUri);
        if (uploadedUrl) {
          setCoverImageUrl(uploadedUrl);
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Error', 'Failed to upload image');
      }
    }
  };
  
  // Upload image to Supabase storage
  const uploadImage = async (uri: string) => {
    try {
      // Get file extension
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `course_cover_${Date.now()}.${fileExt}`;
      const filePath = `course-content/${fileName}`;

      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Supabase Storage (use 'course-content' bucket for cover images)
      // Ensure CORS and storage policies allow uploads from your frontend
      const { error } = await supabase.storage
        .from('course-content')
        .upload(fileName, blob);

      if (error) throw error;

      // Get public URL
      const { data } = supabase.storage
        .from('course-content')
        .getPublicUrl(fileName);

      return data?.publicUrl || null;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };
  
  // Save course function
  const saveCourse = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Get current user ID for creator_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const courseData = {
        title: title.trim(),
        description: description.trim() || null,
        cover_image_url: coverImageUrl,
        updated_at: new Date().toISOString(),
      };
      
      if (isNewCourse) {
        // Creating a new course
        const { data, error } = await supabase
          .from('courses')
          .insert({
            ...courseData,
            creator_id: user.id,
            published: false, // Always start as draft
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (error) throw error;
        
        Alert.alert('Success', 'Course created successfully');
        // Navigate back to list with the new course ID
        navigation.navigate('CourseList');
      } else {
        // Updating an existing course
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', courseId);
        
        if (error) throw error;
        
        Alert.alert('Success', 'Course updated successfully');
        navigation.navigate('CourseList');
      }
    } catch (error) {
      console.error('Error saving course:', error);
      Alert.alert('Error', 'Failed to save course');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Toggle publish state (admin only)
  const togglePublish = async () => {
    // Only admins can publish/unpublish
    if (profile?.role !== 'admin') {
      Alert.alert('Permission Denied', 'Only administrators can publish or unpublish courses');
      return;
    }
    
    if (isNewCourse) {
      Alert.alert('Info', 'Please save the course first before publishing');
      return;
    }
    
    try {
      setIsSaving(true);
      
      const newPublishState = !published;
      const { error } = await supabase
        .from('courses')
        .update({
          published: newPublishState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseId);
      
      if (error) throw error;
      
      setPublished(newPublishState);
      Alert.alert(
        'Success', 
        `Course ${newPublishState ? 'published' : 'unpublished'} successfully`
      );
    } catch (error) {
      console.error('Error toggling publish state:', error);
      Alert.alert('Error', 'Failed to update publish status');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Create a new module
  const createModule = () => {
    if (isNewCourse) {
      Alert.alert('Info', 'Please save the course first before creating modules');
      return;
    }
    
    navigation.navigate('ModuleEdit', { 
      courseId: courseId, 
      moduleId: null 
    });
  };
  
  // Edit an existing module
  const editModule = (moduleId: string) => {
    navigation.navigate('ModuleEdit', { 
      courseId: courseId, 
      moduleId 
    });
  };
  
  // Render module item
  const renderModuleItem = ({ item }: { item: Module }) => (
    <TouchableOpacity 
      style={styles.moduleItem}
      onPress={() => editModule(item.id)}
    >
      <View style={styles.moduleInfo}>
        <Text style={styles.moduleTitle}>{item.title}</Text>
        <Text style={styles.moduleOrder}>Order: {item.order}</Text>
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isNewCourse ? 'Create Course' : 'Edit Course'}
        </Text>
      </View>
      
      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Course title"
          value={title}
          onChangeText={setTitle}
        />
        
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Course description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
        
        <Text style={styles.label}>Cover Image</Text>
        <TouchableOpacity style={styles.imageUploadButton} onPress={pickImage}>
          <Text style={styles.imageUploadText}>
            {coverImageUrl ? 'Change Cover Image' : 'Select Cover Image'}
          </Text>
        </TouchableOpacity>
        
        {coverImageUrl && (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: coverImageUrl }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          </View>
        )}
        
        {/* Status indicator for existing courses */}
        {!isNewCourse && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={published ? styles.publishedBadge : styles.draftBadge}>
              {published ? 'Published' : 'Draft'}
            </Text>
          </View>
        )}
        
        {/* Action buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.saveButton, isSaving && styles.disabledButton]}
            onPress={saveCourse}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>
              {isSaving ? 'Saving...' : 'Save Course'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Publish/Unpublish button for admins */}
        {profile?.role === 'admin' && !isNewCourse && (
          <TouchableOpacity
            style={[
              styles.button,
              published ? styles.unpublishButton : styles.publishButton,
              isSaving && styles.disabledButton
            ]}
            onPress={togglePublish}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>
              {published ? 'Unpublish Course' : 'Publish Course'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Modules section - only show for existing courses */}
      {!isNewCourse && (
        <View style={styles.modulesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Course Modules</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={createModule}
            >
              <Text style={styles.addButtonText}>+ Add Module</Text>
            </TouchableOpacity>
          </View>
          
          {modules.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No modules yet. Click "Add Module" to create one.
              </Text>
            </View>
          ) : (
            <FlatList
              data={modules}
              renderItem={renderModuleItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.moduleList}
              scrollEnabled={false} // disable scrolling inside ScrollView
            />
          )}
        </View>
      )}
    </ScrollView>
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
  textArea: {
    height: 120,
    textAlignVertical: 'top',
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
  disabledButton: {
    opacity: 0.6,
  },
  publishButton: {
    backgroundColor: '#34a853',
    marginTop: 16,
  },
  unpublishButton: {
    backgroundColor: '#f29900',
    marginTop: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    marginRight: 8,
  },
  publishedBadge: {
    fontSize: 14,
    color: '#34a853',
    backgroundColor: '#e6f4ea',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  draftBadge: {
    fontSize: 14,
    color: '#f29900',
    backgroundColor: '#fef7e0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageUploadButton: {
    backgroundColor: '#fff',
    padding: 12,
    borderWidth: 1,
    borderColor: '#4285F4',
    borderStyle: 'dashed',
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  imageUploadText: {
    color: '#4285F4',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 4,
  },
  modulesSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  moduleList: {
    paddingBottom: 16,
  },
  moduleItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 4,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4285F4',
  },
  moduleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  moduleOrder: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f1f3f4',
    padding: 4,
    borderRadius: 4,
  },
});