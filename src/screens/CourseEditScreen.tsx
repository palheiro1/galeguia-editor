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
};

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
        const { error } = await supabase
          .from('courses')
          .insert({ ...courseData, creator_id: userId, published: false, created_at: new Date().toISOString() });

        if (error) throw error;
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Updated background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  header: {
    // Removed as header is handled by navigator, but kept for potential future use or structure
    // padding: 16,
    // backgroundColor: '#FFFFFF',
    // borderBottomWidth: 1,
    // borderBottomColor: '#DEE2E6',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#212529',
  },
  form: {
    padding: 20, // Increased padding
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#495057', // Darker gray for labels
  },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CED4DA', // Standard border color
    borderRadius: 8, // More rounded
    marginBottom: 16,
    fontSize: 16,
    color: '#212529',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007BFF', // Primary blue
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10, // Adjusted margin
  },
  disabledButton: {
    opacity: 0.6,
  },
  publishButton: {
    backgroundColor: '#28A745', // Success green for publish
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  imageUploadButton: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderWidth: 1,
    borderColor: '#007BFF', // Primary blue border
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  imageUploadText: {
    color: '#007BFF', // Primary blue text
    fontWeight: '500',
    fontSize: 15,
  },
  imagePreviewContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200, // Slightly taller
    borderRadius: 8,
    backgroundColor: '#E9ECEF', // Placeholder color
  },
  imagePlaceholder: {
    height: 200,
    width: '100%',
    backgroundColor: '#E9ECEF', // Light gray placeholder
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  placeholderText: {
    color: '#666',
    textAlign: 'center',
    padding: 10,
  },
  modulesSection: {
    // This section might be part of the main form or separate.
    // If separate, it would need its own card styling.
    // For now, assuming it's within the main form's padding.
    paddingTop: 0,
  },
  sectionHeader: {
    // Styles for section headers if used (e.g., for Modules list)
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  addButton: {
    backgroundColor: '#28A745', // Success green
    paddingVertical: 10, // Consistent padding
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F8F9FA', // Light background for empty state
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
  moduleList: {
    paddingBottom: 16,
  },
  moduleItem: {
    backgroundColor: '#F8F9FA', // Slightly different background for list items
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  moduleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212529',
  },
  modulePosition: {
    fontSize: 12,
    color: '#6C757D',
    backgroundColor: '#E9ECEF',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
});
