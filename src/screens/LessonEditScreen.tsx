import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

const EditLessonScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { lessonId } = route.params || {};

  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  useEffect(() => {
    if (lessonId) {
      loadLessonData();
    }
  }, [lessonId]);

  const loadLessonData = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (error) {
      Alert.alert('Erro', 'Erro ao carregar os dados da lição');
    } else {
      setTitle(data.title);
      setTextContent(data.text_content);
      setMediaUrl(data.media_url);
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
    const fileType = file.type || 'application/octet-stream';

    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: fileName,
      type: fileType,
    });

    try {
      const filePath = `${Date.now()}.${file.uri.split('.').pop()}`;

      const { data, error } = await supabase.storage
        .from('course-content')
        .upload(filePath, formData, {
          contentType: fileType,
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

    const payload = {
      title,
      text_content: textContent,
      media_url: mediaUrl,
      user_id: userData.user.id,
    };

    let response;
    if (lessonId) {
      response = await supabase
        .from('lessons')
        .update(payload)
        .eq('id', lessonId);
    } else {
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

      <Text style={styles.label}>Conteúdo da lição:</Text>
      <TextInput
        value={textContent}
        onChangeText={setTextContent}
        style={styles.textArea}
        multiline
      />

      <TouchableOpacity style={[styles.button, styles.uploadButton]} onPress={uploadMedia}>
        <Text style={styles.buttonText}>Carregar Vídeo ou Áudio</Text>
      </TouchableOpacity>

      {mediaUrl ? <Text style={styles.mediaUrlText}>Ficheiro carregado: {mediaUrl.substring(mediaUrl.lastIndexOf('/') + 1)}</Text> : null}

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
  },
  container: {
    padding: 20,
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
