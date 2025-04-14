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
  position: number;
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

  useEffect(() => {
    if (!isNewCourse) {
      fetchCourseData();
    }
  }, [courseId]);

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
        setImageLoadError(null);
        setPublished(data.published);

        await fetchModules();
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      Alert.alert('Error', 'Failed to load course data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('id, course_id, title, position')
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      if (error) {
        console.error('Supabase error fetching modules:', error);
        throw error;
      }

      if (data) {
        setModules(data);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      Alert.alert('Error', `Failed to load modules: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        const imageUri = asset.uri;
        const uploadedUrl = await uploadImage(imageUri, userId);
        if (uploadedUrl) {
          console.log('Image uploaded successfully. Setting URL:', uploadedUrl);
          setCoverImageUrl(uploadedUrl);
          setImageLoadError(null);
        } else {
          console.log('Image upload failed, URL is null.');
          setImageLoadError('Failed to upload image.');
        }
      } catch (error) {
        console.error('Error processing picked image:', error);
        Alert.alert('Error', 'Failed to process selected image');
        setImageLoadError('Error processing image.');
      }
    }
  };

  const uploadImage = async (uri: string, userId?: string) => {
    if (!userId) {
      console.error('Upload attempted without user ID');
      Alert.alert('Error', 'Authentication error, cannot upload file.');
      return null;
    }
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      let fileExt = blob.type?.split('/')[1];
      if (!fileExt && uri) {
        const uriParts = uri.split('.');
        fileExt = uriParts.length > 1 ? uriParts.pop()?.toLowerCase() : undefined;
      }
      fileExt = fileExt || 'jpg';

      const fileName = `cover_${Date.now()}.${fileExt}`;
      const filePath = `${userId}/covers/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('course-content')
        .upload(filePath, blob, {
          contentType: blob.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        console.error("Failed to get public URL after upload. Check bucket policies and file path.");
        return null;
      }

      console.log("Public URL generated:", urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error('Error uploading image:', error);
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
        const { data, error } = await supabase
          .from('courses')
          .insert({
            ...courseData,
            creator_id: userId,
            published: false,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        Alert.alert('Success', 'Course created successfully');
        navigation.navigate('CourseList');
      } else {
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

  const createModule = () => {
    if (isNewCourse) {
      Alert.alert('Info', 'Please save the course first before creating modules');
      return;
    }

    navigation.navigate('ModuleEdit', {
      courseId: courseId,
      moduleId: null,
    });
  };

  const editModule = (moduleId: string) => {
    navigation.navigate('ModuleEdit', {
      courseId: courseId,
      moduleId,
    });
  };

  const renderModuleItem = ({ item }: { item: Module }) => (
    <TouchableOpacity
      style={styles.moduleItem}
      onPress={() => editModule(item.id)}
    >
      <View style={styles.moduleInfo}>
        <Text style={styles.moduleTitle}>{item.title}</Text>
        <Text style={styles.moduleOrder}>Position: {item.position}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleImageError = (error: any) => {
    console.error("Image load nativeEvent:", JSON.stringify(error.nativeEvent, null, 2));
    const errorMessage = error.nativeEvent?.error || 'Unknown image load error';
    console.error("Image load error (onError handler):", errorMessage);
    console.error("Failed URL:", coverImageUrl);
    setImageLoadError(`Failed to load cover image. Error: ${errorMessage}. Please check console and Supabase CORS/Permissions.`);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

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

        {coverImageUrl && !imageLoadError ? (
          <View style={styles.imagePreviewContainer}>
            <Image
              key={coverImageUrl}
              source={{ uri: coverImageUrl }}
              style={styles.imagePreview}
              resizeMode="cover"
              onError={handleImageError}
              onLoadStart={() => {
                console.log(`Image loading started: ${coverImageUrl}`);
              }}
              onLoad={() => {
                console.log(`Image loaded successfully: ${coverImageUrl}`);
                if (imageLoadError) {
                  setImageLoadError(null);
                }
              }}
            />
          </View>
        ) : (
          <View style={[styles.imagePreviewContainer, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>
              {imageLoadError ? imageLoadError : 'No cover image selected'}
            </Text>
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
              isSaving && styles.disabledButton,
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
              keyExtractor={(item) => item.id}
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
    backgroundColor: '#e0e0e0',
  },
  imagePlaceholder: {
    height: 180,
    width: '100%',
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  placeholderText: {
    color: '#666',
    textAlign: 'center',
    padding: 10,
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
