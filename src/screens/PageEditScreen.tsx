import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

// Define the type for the route params
type PageEditScreenRouteParams = {
  lessonId: string; // Each page belongs to a lesson
  pageId?: string;   // Optional: for editing existing pages
};

const EditPageScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: PageEditScreenRouteParams }, 'params'>>();
  const { lessonId, pageId } = route.params || {};

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [position, setPosition] = useState<number>(0);
  const [pageType, setPageType] = useState<string>('text'); // Default page type

  useEffect(() => {
    if (pageId) {
      loadPageData();
    } else if (lessonId) {
      fetchNextPagePosition(lessonId);
    }
  }, [pageId, lessonId]);

  const fetchNextPagePosition = async (currentLessonId: string) => {
    const { data, error } = await supabase
      .from('pages')
      .select('position')
      .eq('lesson_id', currentLessonId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: "Searched item was not found"
      console.error('Error fetching next page position:', error);
      Alert.alert('Erro', 'Não foi possível determinar a próxima posição para a página.');
      setPosition(1); // Default to 1 on error
    } else if (data) {
      setPosition(data.position + 1);
    } else {
      setPosition(1); // First page in the lesson
    }
  };

  const loadPageData = async () => {
    if (!pageId) return;
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (error) {
      Alert.alert('Erro', 'Erro ao carregar os dados da página.');
    } else if (data) {
      setTitle(data.title || '');
      setContent(data.content || '');
      setMediaUrl(data.media_url || '');
      setPosition(data.position || 0);
      setPageType(data.type || 'text');
    }
  };

  const uploadMedia = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      Alert.alert('Erro', 'Utilizador não autenticado.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Permissão negada para aceder à galeria');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
        Alert.alert('Erro', 'Nenhum ficheiro selecionado ou operação cancelada.');
        return;
    }
    
    const file = result.assets[0];
    const fileName = file.fileName || `media.${file.uri.split('.').pop()}`;
    const fileType = file.mimeType || 'application/octet-stream';

    const response = await fetch(file.uri);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('file', blob, fileName);

    try {
      const filePath = `pages-media/${Date.now()}-${fileName}`; // Consider a different folder for page media
      const { error: uploadError } = await supabase.storage
        .from('course-content') // Or a new bucket like 'page-content'
        .upload(filePath, formData, { contentType: fileType, upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        Alert.alert('Erro', 'Ficheiro carregado, mas não foi possível obter a URL pública.');
        return;
      }
      setMediaUrl(publicUrlData.publicUrl);
      Alert.alert('Sucesso', 'Ficheiro carregado com sucesso!');
    } catch (e: any) {
      console.error('Upload error:', e);
      Alert.alert('Erro', e.message || 'Ocorreu um erro inesperado durante o carregamento.');
    }
  };

  const handleSave = async () => {
    // Basic validation, can be expanded
    if (!title && !content && !mediaUrl) {
      Alert.alert('Erro', 'A página deve ter pelo menos um título, conteúdo ou multimédia.');
      return;
    }

    if (!lessonId) {
      Alert.alert('Erro', 'ID da lição não fornecido. Não é possível guardar a página.');
      return;
    }

    const payload = {
      lesson_id: lessonId,
      title,
      content,
      media_url: mediaUrl,
      position,
      type: pageType,
    };

    let response;
    if (pageId) {
      // Update existing page
      response = await supabase.from('pages').update(payload).eq('id', pageId).select();
    } else {
      // Create new page
      response = await supabase.from('pages').insert(payload).select();
    }

    if (response.error) {
      console.error('Error saving page:', response.error);
      Alert.alert('Erro', `Erro ao guardar a página: ${response.error.message}`);
    } else {
      Alert.alert('Sucesso', pageId ? 'Página atualizada com sucesso!' : 'Página criada com sucesso!');
      navigation.goBack(); // Or navigate to the lesson detail screen
    }
  };

  const handleDelete = async () => {
    console.log('handleDelete called. pageId:', pageId);
    if (!pageId) {
      console.error('handleDelete: pageId is missing, cannot delete.');
      Alert.alert('Erro', 'ID da página não encontrado. Não é possível eliminar.');
      return;
    }

    const performDelete = async () => {
      console.log("performDelete called. Attempting to delete page with ID:", pageId);
      const { data, error } = await supabase.from('pages').delete().eq('id', pageId);
      console.log('Supabase delete response - data:', data); 
      console.log('Supabase delete response - error:', error); 
      if (error) {
        Alert.alert('Erro', `Erro ao eliminar a página: ${error.message}`);
      } else {
        Alert.alert('Sucesso', 'Página eliminada com sucesso!');
        navigation.goBack();
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Tens a certeza de que queres eliminar esta página?')) {
        await performDelete();
      } else {
        console.log('Deletion cancelled by user (web confirm).');
      }
    } else {
      Alert.alert(
        'Confirmar eliminação',
        'Tens a certeza de que queres eliminar esta página?',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => console.log('Deletion cancelled by user (native alert).') },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: performDelete,
          },
        ],
        { cancelable: true }
      );
    }
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.label}>Título da Página:</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Ex: Introdução à Página" />

      <Text style={styles.label}>Posição da Página:</Text>
      <TextInput
        value={position ? position.toString() : '0'}
        onChangeText={(text) => setPosition(parseInt(text, 10) || 0)}
        style={styles.input}
        keyboardType="numeric"
        placeholder="Ex: 1"
      />

      <Text style={styles.label}>Tipo de Página:</Text>
      <TextInput value={pageType} onChangeText={setPageType} style={styles.input} placeholder="Ex: text, image, video_embed" />
      {/* Consider using a Picker or custom buttons for pageType selection for better UX */}

      <Text style={styles.label}>Conteúdo da Página:</Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        style={styles.textArea}
        multiline
        placeholder="Escreve o conteúdo da página aqui..."
      />

      <TouchableOpacity style={[styles.button, styles.uploadButton]} onPress={uploadMedia}>
        <Text style={styles.buttonText}>Carregar Multimédia</Text>
      </TouchableOpacity>
      {mediaUrl ? (
        <View>
            <Text style={styles.mediaUrlText}>Ficheiro carregado: {mediaUrl.substring(mediaUrl.lastIndexOf('/') + 1)}</Text>
            {/* Optionally, display the image or a video player if mediaUrl is set */}
        </View>
      ) : null}


      <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
        <Text style={styles.buttonText}>Guardar Página</Text>
      </TouchableOpacity>

      {pageId && (
        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
          <Text style={styles.buttonText}>Eliminar Página</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    ...(Platform.OS === 'web' && {}), 
  },
  container: {
    padding: 20,
    ...(Platform.OS === 'web' && { flexGrow: 1 }), 
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '500',
    color: '#343A40',
  },
  input: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    color: '#212529',
  },
  textArea: {
    height: 200, // Increased height for page content
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    color: '#212529',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  uploadButton: {
    backgroundColor: '#6C757D', // Secondary gray
  },
  saveButton: {
    backgroundColor: '#007BFF', // Primary blue
  },
  deleteButton: {
    backgroundColor: '#DC3545', // Danger red
  },
  mediaUrlText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 16,
    fontStyle: 'italic',
  },
});

export default EditPageScreen;
