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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

// Lesson type definition
type Lesson = {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  type: 'text' | 'video' | 'image' | 'audio';
  media_url: string | null;
  order: number;
  created_at: string;
  updated_at: string;
};

export default function LessonEditScreen({ route, navigation }: any) {
  const { moduleId, lessonId } = route.params;
  const { session } = useAuth(); // Get session using the hook
  const userId = session?.user?.id; // Extract user ID
  const isNewLesson = lessonId === null;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'text' | 'video' | 'image' | 'audio'>('text');
  const [order, setOrder] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Get lesson data if editing an existing lesson
  useEffect(() => {
    if (!isNewLesson) {
      fetchLessonData();
    } else {
      // For new lessons, set the order to be one more than the highest order
      getNextOrderNumber();
    }
  }, [lessonId]);
  
  const fetchLessonData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setTitle(data.title);
        setContent(data.content || '');
        setMediaUrl(data.media_url);
        setMediaType(data.type || 'text');
        setOrder(data.order);
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
      Alert.alert('Error', 'Failed to load lesson data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Find the next available order number for a new lesson
  const getNextOrderNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('order')
        .eq('module_id', moduleId)
        .order('order', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      // If there are existing lessons, set order to highest + 1, otherwise start at 1
      const nextOrder = data && data.length > 0 ? data[0].order + 1 : 1;
      setOrder(nextOrder);
    } catch (error) {
      console.error('Error getting next order number:', error);
      // Default to order 1 if there's an error
      setOrder(1);
    }
  };
  
  // Pick an image from the library
  const pickImage = async () => {
    if (!userId) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Use string literal as suggested by TS error and docs
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled) {
      try {
        const imageUri = result.assets[0].uri;
        // Pass userId to uploadMedia
        const uploadedUrl = await uploadMedia(imageUri, 'image', userId); 
        if (uploadedUrl) {
          setMediaUrl(uploadedUrl);
          setMediaType('image');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Error', 'Failed to upload image');
      }
    }
  };
  
  // Pick a document (video, audio)
  const pickDocument = async (type: 'video' | 'audio') => {
    if (!userId) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: type === 'video' ? 'video/*' : 'audio/*',
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) return;
      
      const uri = result.assets[0].uri;
      // Pass userId to uploadMedia
      const uploadedUrl = await uploadMedia(uri, type, userId); 
      
      if (uploadedUrl) {
        setMediaUrl(uploadedUrl);
        setMediaType(type);
      }
    } catch (error) {
      console.error(`Error picking ${type}:`, error);
      Alert.alert('Error', `Failed to select ${type} file`);
    }
  };
  
  // Upload media to Supabase storage
  const uploadMedia = async (uri: string, type: 'image' | 'video' | 'audio', userId: string) => { // Add userId parameter
    if (!userId) {
      console.error('Upload attempted without user ID');
      Alert.alert('Error', 'Authentication error, cannot upload file.');
      return null;
    }
    try {
      // Get file extension
      const fileExt = uri.split('.').pop()?.toLowerCase() || '';
      const fileName = `lesson_${type}_${Date.now()}.${fileExt}`;
      // Use user-specific path
      const filePath = `${userId}/lesson_content/${fileName}`; 
      
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('course-content')
        .upload(filePath, blob);
      
      if (error) throw error;
      
      // Get public URL
      const { data } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);
      
      return data?.publicUrl || null;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      return null;
    }
  };
  
  // Remove the current media
  const removeMedia = () => {
    setMediaUrl(null);
    setMediaType('text');
  };
  
  // Save lesson function
  const saveLesson = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    
    try {
      setIsSaving(true);
      
      const lessonData = {
        title: title.trim(),
        content: content.trim() || null,
        type: mediaType,
        media_url: mediaUrl,
        order,
        updated_at: new Date().toISOString(),
      };
      
      if (isNewLesson) {
        // Creating a new lesson
        const { data, error } = await supabase
          .from('lessons')
          .insert({
            ...lessonData,
            module_id: moduleId,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (error) throw error;
        
        Alert.alert('Success', 'Lesson created successfully');
        navigation.navigate('ModuleEdit', {
          moduleId,
          refresh: true
        });
      } else {
        // Updating an existing lesson
        const { error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', lessonId);
        
        if (error) throw error;
        
        Alert.alert('Success', 'Lesson updated successfully');
        navigation.navigate('ModuleEdit', {
          moduleId,
          refresh: true
        });
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      Alert.alert('Error', 'Failed to save lesson');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Delete lesson
  const deleteLesson = async () => {
    try {
      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this lesson?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setIsLoading(true);
              
              const { error } = await supabase
                .from('lessons')
                .delete()
                .eq('id', lessonId);
              
              if (error) throw error;
              
              Alert.alert('Success', 'Lesson deleted successfully');
              navigation.navigate('ModuleEdit', {
                moduleId,
                refresh: true
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting lesson:', error);
      Alert.alert('Error', 'Failed to delete lesson');
      setIsLoading(false);
    }
  };
  
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
          {isNewLesson ? 'Create Lesson' : 'Edit Lesson'}
        </Text>
      </View>
      
      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Lesson title"
          value={title}
          onChangeText={setTitle}
        />
        
        <Text style={styles.label}>Order</Text>
        <TextInput
          style={styles.input}
          placeholder="Lesson order (e.g., 1, 2, 3)"
          value={order.toString()}
          onChangeText={(text) => setOrder(parseInt(text) || 0)}
          keyboardType="numeric"
        />
        
        {/* Media type selection */}
        <Text style={styles.label}>Content Type</Text>
        <View style={styles.mediaTypeSelector}>
          <TouchableOpacity
            style={[
              styles.mediaTypeButton,
              mediaType === 'text' && styles.mediaTypeButtonSelected
            ]}
            onPress={() => setMediaType('text')}
          >
            <Text
              style={[
                styles.mediaTypeText,
                mediaType === 'text' && styles.mediaTypeTextSelected
              ]}
            >
              Text
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.mediaTypeButton,
              mediaType === 'image' && styles.mediaTypeButtonSelected
            ]}
            onPress={() => setMediaType('image')}
          >
            <Text
              style={[
                styles.mediaTypeText,
                mediaType === 'image' && styles.mediaTypeTextSelected
              ]}
            >
              Image
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.mediaTypeButton,
              mediaType === 'video' && styles.mediaTypeButtonSelected
            ]}
            onPress={() => setMediaType('video')}
          >
            <Text
              style={[
                styles.mediaTypeText,
                mediaType === 'video' && styles.mediaTypeTextSelected
              ]}
            >
              Video
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.mediaTypeButton,
              mediaType === 'audio' && styles.mediaTypeButtonSelected
            ]}
            onPress={() => setMediaType('audio')}
          >
            <Text
              style={[
                styles.mediaTypeText,
                mediaType === 'audio' && styles.mediaTypeTextSelected
              ]}
            >
              Audio
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Content text area (for text type or additional info) */}
        <Text style={styles.label}>
          {mediaType === 'text' ? 'Lesson Content *' : 'Additional Content Information'}
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={mediaType === 'text' ? 'Enter lesson content here...' : 'Additional description or notes (optional)'}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={8}
        />
        
        {/* Media upload buttons (if not text type) */}
        {mediaType !== 'text' && (
          <View style={styles.mediaSection}>
            <Text style={styles.label}>Media Upload</Text>
            
            {mediaType === 'image' && (
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Text style={styles.uploadButtonText}>
                  {mediaUrl ? 'Change Image' : 'Select Image'}
                </Text>
              </TouchableOpacity>
            )}
            
            {mediaType === 'video' && (
              <TouchableOpacity 
                style={styles.uploadButton} 
                onPress={() => pickDocument('video')}
              >
                <Text style={styles.uploadButtonText}>
                  {mediaUrl ? 'Change Video' : 'Select Video'}
                </Text>
              </TouchableOpacity>
            )}
            
            {mediaType === 'audio' && (
              <TouchableOpacity 
                style={styles.uploadButton} 
                onPress={() => pickDocument('audio')}
              >
                <Text style={styles.uploadButtonText}>
                  {mediaUrl ? 'Change Audio' : 'Select Audio'}
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Media preview */}
            {mediaUrl && (
              <View style={styles.mediaPreviewContainer}>
                {mediaType === 'image' && (
                  <Image
                    source={{ uri: mediaUrl }}
                    style={styles.imagePreview}
                    resizeMode="contain"
                  />
                )}
                
                {(mediaType === 'video' || mediaType === 'audio') && (
                  <View style={styles.mediaFileInfo}>
                    <Text style={styles.mediaFileName}>
                      {mediaUrl.split('/').pop()}
                    </Text>
                    <Text style={styles.mediaFileType}>
                      {mediaType.toUpperCase()} file uploaded
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.removeMediaButton}
                  onPress={removeMedia}
                >
                  <Text style={styles.removeMediaText}>Remove Media</Text>
                </TouchableOpacity>
              </View>
            )}
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
            onPress={saveLesson}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>
              {isSaving ? 'Saving...' : 'Save Lesson'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Delete button for existing lessons */}
        {!isNewLesson && (
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={deleteLesson}
          >
            <Text style={styles.buttonText}>Delete Lesson</Text>
          </TouchableOpacity>
        )}
      </View>
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
    height: 150,
    textAlignVertical: 'top',
  },
  mediaTypeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  mediaTypeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  mediaTypeButtonSelected: {
    backgroundColor: '#e8f0fe',
    borderColor: '#4285F4',
  },
  mediaTypeText: {
    color: '#5f6368',
    fontSize: 14,
  },
  mediaTypeTextSelected: {
    color: '#4285F4',
    fontWeight: 'bold',
  },
  mediaSection: {
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4285F4',
    borderStyle: 'dashed',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadButtonText: {
    color: '#4285F4',
    fontWeight: '500',
  },
  mediaPreviewContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  imagePreview: {
    height: 200,
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  mediaFileInfo: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    marginBottom: 16,
  },
  mediaFileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  mediaFileType: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 4,
  },
  removeMediaButton: {
    backgroundColor: '#fce8e6',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  removeMediaText: {
    color: '#ea4335',
    fontWeight: '500',
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
});
