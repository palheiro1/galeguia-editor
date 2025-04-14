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
  Platform, // Import Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker'; // Import MediaTypeOptions explicitly
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
  position: number; // Changed from order to position
};

export default function CourseEditScreen({ route, navigation }: any) {
  const { courseId, refresh } = route.params;
  const isNewCourse = courseId === null;
  const { profile, session } = useAuth(); // Get session for user ID
  const userId = session?.user?.id; // Extract user ID
  
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
      // Use 'position' as the column name for ordering
      const { data, error } = await supabase
        .from('modules')
        .select('id, course_id, title, position') // Select position
        .eq('course_id', courseId)
        .order('position', { ascending: true }); // Order by position
      
      if (error) {
        // Log the specific Supabase error
        console.error('Supabase error fetching modules:', error); 
        throw error;
      }
      
      if (data) {
        setModules(data);
      }
    } catch (error) {
      // Log the caught error object
      console.error('Error fetching modules:', error); 
      Alert.alert('Error', `Failed to load modules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Image picker function
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images, // Use the enum MediaTypeOptions.Images
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: Platform.OS === 'web', 
    });
    
    if (!result.canceled) {
      try {
        const asset = result.assets[0];
        const imageUri = asset.uri;
        const uploadedUrl = await uploadImage(imageUri, userId); 
        if (uploadedUrl) {
          console.log('Image uploaded successfully. URL:', uploadedUrl); // Log URL on success
          setCoverImageUrl(uploadedUrl);
        } else {
          console.log('Image upload failed, URL is null.'); // Log if upload failed
        }
      } catch (error) {
        console.error('Error processing picked image:', error);
        Alert.alert('Error', 'Failed to process selected image');
      }
    }
  };
  
  // Upload image to Supabase storage
  const uploadImage = async (uri: string, userId?: string) => { // Add optional userId parameter
    if (!userId) {
      console.error('Upload attempted without user ID');
      Alert.alert('Error', 'Authentication error, cannot upload file.');
      return null;
    }
    try {
      // Fetch the image data from the URI
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Determine file extension from blob type or URI - slightly improved logic
      let fileExt = blob.type?.split('/')[1];
      if (!fileExt && uri) {
        const uriParts = uri.split('.');
        fileExt = uriParts.length > 1 ? uriParts.pop()?.toLowerCase() : undefined;
      }
      fileExt = fileExt || 'jpg'; // Default to jpg if still undetermined

      const fileName = `course_cover_${Date.now()}.${fileExt}`;
      // Define the path within the bucket (e.g., user-specific folder)
      const filePath = `${fileName}`; 

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('course-content') // Bucket name
        .upload(filePath, blob, {
          contentType: blob.type, // Pass content type
          upsert: false, // Don't overwrite existing files with the same name
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL using the correct filePath
      const { data: urlData } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);

      return urlData?.publicUrl || null;
      
    } catch (error) {
      console.error('Error uploading image:', error);
      // Provide more specific error feedback if possible
      if (error instanceof Error && error.message.includes('fetch')) {
        Alert.alert('Upload Error', 'Network error during image upload. Please check your connection.');
      } else if (error instanceof Error && error.message.includes('storage')) {
         Alert.alert('Upload Error', `Storage error: ${error.message}`);
      } else {
         Alert.alert('Upload Error', 'An unexpected error occurred during image upload.');
      }
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
            creator_id: userId,
            published: false, // Always start as draft
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (error) throw error;
        
        Alert.alert('Success', 'Course created successfully');
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
        <Text style={styles.moduleOrder}>Position: {item.position}</Text> {/* Display position */}
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
  
  // Log the coverImageUrl state before rendering
  console.log('Rendering CourseEditScreen, coverImageUrl:', coverImageUrl); 
  
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
              onError={(e) => console.error('Image load error:', e.nativeEvent.error)} // Add error handler for Image
            />
          </View>
        )}
        
        {!isNewCourse && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={published ? styles.publishedBadge : styles.draftBadge}>
              {published ? 'Published' : 'Draft'}
            </Text>
          </View>
        )}
        
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
              scrollEnabled={false}
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
