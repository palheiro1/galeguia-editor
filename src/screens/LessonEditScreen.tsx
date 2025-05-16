import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

// Define the type for the route params
type LessonEditScreenRouteParams = {
  moduleId: string; // Assuming moduleId is also passed as a param
  lessonId?: string; // lessonId is optional for creating new lessons
};

const EditLessonScreen = () => {
  const navigation = useNavigation();
  // Explicitly type the route using RouteProp
  const route = useRoute<RouteProp<{ params: LessonEditScreenRouteParams }, 'params'>>();
  // Safely access lessonId and moduleId from route.params
  const { lessonId, moduleId } = route.params || {};

  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // Renamed from textContent
  const [mediaUrl, setMediaUrl] = useState('');
  const [position, setPosition] = useState<number>(0); // Added for lesson position
  const [lessonType, setLessonType] = useState<string>('text'); // Added for lesson type, e.g., 'text', 'video'

  useEffect(() => {
    if (lessonId) {
      loadLessonData();
    } else if (moduleId) { // If creating a new lesson, fetch the next position
      fetchNextLessonPosition(moduleId);
    }
    // If creating a new lesson and moduleId is not present, it's an issue.
    // However, moduleId should be passed for new lessons too, to associate them.
  }, [lessonId, moduleId]);

  const fetchNextLessonPosition = async (currentModuleId: string) => {
    const { data, error } = await supabase
      .from('lessons')
      .select('position')
      .eq('module_id', currentModuleId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
      console.error('Error fetching next lesson position:', error);
      Alert.alert('Erro', 'Não foi possível determinar a próxima posição para a lição.');
      setPosition(1); // Default to 1 on error
    } else if (data) {
      setPosition(data.position + 1);
    } else {
      setPosition(1); // First lesson in the module
    }
  };

  const loadLessonData = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error) {
      Alert.alert('Erro', 'Erro ao carregar os dados da lição');
    } else if (data) {
      setTitle(data.title || '');
      setContent(data.content || ''); // Use content, handle null
      setMediaUrl(data.media_url || ''); // Handle null
      setPosition(data.position || 0); // Load position, default to 0 if null
      setLessonType(data.type || 'text'); // Load type, default to 'text' if null
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

    if (result.canceled) return;

    const file = result.assets[0];
    if (!file) {
      Alert.alert('Erro', 'Erro ao selecionar o ficheiro de vídeo/áudio');
      return;
    }

    const fileName = file.fileName || `media.${file.uri.split('.').pop()}`;
    // Ensure fileType is correctly determined or default to a generic one if needed by Supabase
    const fileType = file.mimeType || file.type || 'application/octet-stream';

    // Convert URI to Blob for FormData
    const response = await fetch(file.uri);
    const blob = await response.blob();

    const formData = new FormData();
    // Append the blob with filename and type
    formData.append('file', blob, fileName);

    try {
      const filePath = `${Date.now()}-${fileName}`;

      const { data, error } = await supabase.storage
        .from('course-content')
        .upload(filePath, formData, {
          // contentType is often inferred by Supabase from the FormData, 
          // but can be specified if issues arise. 
          // Forcing it here based on determined fileType.
          contentType: fileType,
          upsert: false // Default is false, can be true if you want to overwrite
        });

      if (error) {
        if (error.message.includes('The resource was not found')) {
          Alert.alert(
            'Erro',
            "O armazenamento 'course-content' não foi encontrado. Verifique a configuração do Supabase."
          );
        } else if (error.message.includes('Policy')) {
          Alert.alert(
            'Erro',
            'A política de armazenamento recusou o carregamento. Verifique as políticas RLS do armazenamento.'
          );
        } else {
          Alert.alert('Erro', 'Falha ao carregar o ficheiro');
        }
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        Alert.alert(
          'Erro',
          'Ficheiro carregado, mas não foi possível obter a URL pública. Verifique as políticas do armazenamento.'
        );
        return;
      }

      setMediaUrl(publicUrlData.publicUrl);
    } catch (e) {
      Alert.alert('Erro', 'Ocorreu um erro inesperado durante o carregamento.');
    }
  };

  const handleSave = async () => {
    if (!title) {
      Alert.alert('Erro', 'O título é obrigatório');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      Alert.alert('Erro', 'Utilizador não autenticado.');
      return;
    }

    if (!moduleId && !lessonId) { // If creating a new lesson, moduleId is essential
      Alert.alert('Erro', 'ID do módulo não fornecido. Não é possível criar a lição.');
      return;
    }
    
    // Ensure moduleId is available if we are creating a new lesson or even if updating (though less likely to change)
    // For existing lessons, moduleId would have been part of its existing data, but we use the one from params
    // if we intend to allow moving lessons between modules through this screen (which might be complex).
    // For now, assume moduleId from params is the target module_id.
    const currentModuleId = moduleId; 
    if (!currentModuleId) {
        Alert.alert('Erro', 'ID do módulo é inválido ou não fornecido.');
        return;
    }

    const payload = {
      title,
      content: content, // Changed from text_content
      media_url: mediaUrl,
      module_id: currentModuleId, // Added moduleId
      position: position,       // Added position
      type: lessonType,         // Added type
      // user_id is removed as it's not in the lessons table schema
      // id, created_at, updated_at are handled by Supabase
    };

    let response;
    if (lessonId) {
      response = await supabase
        .from('lessons')
        .update(payload)
        .eq('id', lessonId);
    } else {
      // For insert, Supabase will generate id, created_at, updated_at
      response = await supabase.from('lessons').insert(payload);
    }

    if (response.error) {
      Alert.alert('Erro', 'Erro ao guardar a lição');
    } else {
      Alert.alert(
        'Sucesso',
        lessonId ? 'Lição atualizada com sucesso' : 'Lição criada com sucesso'
      );
      navigation.goBack();
    }
  };

  const handleDelete = async () => {
    Alert.alert('Confirmar eliminação', 'Tens a certeza de que queres eliminar esta lição?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
          if (error) {
            Alert.alert('Erro', 'Erro ao eliminar a lição');
          } else {
            navigation.goBack();
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.label}>Título:</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      <Text style={styles.label}>Posição da Lição:</Text>
      <TextInput
        value={position ? position.toString() : '0'} // Ensure position is not null/undefined for toString()
        onChangeText={(text) => setPosition(parseInt(text, 10) || 0)} // Ensure text is parsed to int, default to 0
        style={styles.input}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Resumo:</Text>
      <TextInput
        value={content} // Changed from textContent
        onChangeText={setContent} // Changed from setTextContent
        style={styles.textArea}
        multiline
      />

      <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
        <Text style={styles.buttonText}>Guardar Lição</Text>
      </TouchableOpacity>

      {lessonId && (
        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
          <Text style={styles.buttonText}>Eliminar Lição</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    ...(Platform.OS === 'web' && { /* Consider web-specific styling here if needed, but flex: 1 is key */ }),
  },
  container: {
    padding: 20,
    ...(Platform.OS === 'web' && { flexGrow: 1 }), // Ensure content can grow on web
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    fontWeight: '500',
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
    height: 150,
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
    color: '#6C757D',
    marginBottom: 16,
    fontStyle: 'italic',
  },
});

export default EditLessonScreen;
