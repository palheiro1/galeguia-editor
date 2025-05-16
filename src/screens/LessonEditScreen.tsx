import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Platform, FlatList } from 'react-native';
import { supabase } from '../lib/supabase'; // Ensure this path is correct
import { useRoute, useNavigation, useIsFocused, NavigationProp } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';

// Define the types for route params and navigation
type RootStackParamList = {
  CourseList: undefined;
  CourseEdit: { courseId: string | null; refresh?: boolean };
  ModuleEdit: { courseId: string; moduleId: string | null; refresh?: boolean };
  LessonEdit: { moduleId: string; lessonId: string | null; courseId: string; refresh?: boolean }; // Added courseId
  PageEdit: { lessonId: string; pageId?: string | null; refresh?: boolean };
  ProfileEdit: undefined;
};

type LessonEditScreenNavigationProp = NavigationProp<RootStackParamList, 'LessonEdit'>;

type LessonEditScreenRouteParams = {
  moduleId: string;
  lessonId?: string | null;
  courseId: string; // Added courseId
  refresh?: boolean;
};

// Define the type for a Page item
type Page = {
  id: string;
  title: string;
  position: number;
};

export default function LessonEditScreen() {
  const route = useRoute();
  const navigation = useNavigation<LessonEditScreenNavigationProp>();
  const isFocused = useIsFocused();
  const { moduleId, lessonId, courseId } = route.params as LessonEditScreenRouteParams; // Added courseId

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [lessonType, setLessonType] = useState('');
  const [position, setPosition] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);

  const fetchNextLessonPosition = useCallback(async () => {
    if (!moduleId) return;

    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('position')
        .eq('module_id', moduleId)
        .order('position', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setPosition(String(data[0].position + 1));
      } else {
        setPosition('1');
      }
    } catch (error) {
      console.error('Error fetching next lesson position:', error);
      setPosition('1'); // Default to 1 if error
    }
  }, [moduleId]);

  const loadLessonData = useCallback(async () => {
    if (!lessonId) {
      fetchNextLessonPosition();
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*, modules(course_id)') // Ensure you select all necessary fields
        .eq('id', lessonId)
        .single();

      if (error) throw error;

      if (data) {
        setTitle(data.title || '');
        setContent(data.content || '');
        setMediaUrl(data.media_url || null);
        setLessonType(data.type || '');
        setPosition(String(data.position) || ''); // Convert to string for input
      } else {
        // If no data found for lessonId, perhaps it's a new lesson or an error
        // If it's a new lesson, fetchNextLessonPosition should have been called
        // If it's an error, it should be caught by the catch block
        if (!lessonId) { // Explicitly check if it's a new lesson scenario
          fetchNextLessonPosition();
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os dados da lição.');
      console.error('Error loading lesson data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, fetchNextLessonPosition]);

  const loadPagesData = useCallback(async () => {
    if (!lessonId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, position')
        .eq('lesson_id', lessonId)
        .order('position', { ascending: true });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as páginas.');
      console.error('Error loading pages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (isFocused) {
      loadLessonData();
      if (lessonId) {
        loadPagesData();
      }
    } else {
      // When the screen is not focused, if it's a new lesson, fetch position
      if (!lessonId) {
        fetchNextLessonPosition();
        setPages([]); // Clear pages for a new lesson
      }
    }
  }, [isFocused, lessonId, loadLessonData, loadPagesData, fetchNextLessonPosition]);

  const handlePickMedia = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all file types
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('Document picking cancelled');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const { uri, name, mimeType } = asset;

        if (!uri) {
          Alert.alert('Erro', 'Não foi possível obter o URI do ficheiro.');
          return;
        }

        setIsUploading(true);
        const fileName = name || `media.${uri.split('.').pop()}`;
        const actualMimeType = mimeType || 'application/octet-stream';

        // Fetch the file as a blob
        const response = await fetch(uri);
        const blob = await response.blob();

        const filePath = `${Date.now()}-${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('course-content') // Make sure this bucket exists and has correct policies
          .upload(filePath, blob, {
            contentType: actualMimeType,
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          Alert.alert('Erro de Upload', uploadError.message);
          setIsUploading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('course-content')
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          Alert.alert('Erro', 'Ficheiro carregado, mas não foi possível obter a URL pública.');
        } else {
          setMediaUrl(publicUrlData.publicUrl);
          Alert.alert('Sucesso', 'Mídia carregada com sucesso!');
        }
      } else {
        Alert.alert('Erro', 'Nenhum ficheiro foi selecionado.');
      }
    } catch (err: any) {
      console.error('Error picking or uploading media:', err);
      Alert.alert('Erro de Mídia', err.message || 'Ocorreu um erro ao processar a mídia.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'O título da lição é obrigatório.');
      return;
    }
    if (!moduleId) {
      Alert.alert('Erro', 'ID do módulo não encontrado. Não é possível salvar a lição.');
      return;
    }
    if (!courseId) { // Check for courseId as it's needed for navigation back
      Alert.alert('Erro', 'ID do curso não encontrado. Não é possível salvar a lição.');
      return;
    }

    const currentPosition = parseInt(position, 10);
    if (isNaN(currentPosition) || currentPosition <= 0) {
      Alert.alert('Erro', 'A posição deve ser um número positivo.');
      return;
    }

    setIsLoading(true);
    try {
      let lessonData: any = {
        module_id: moduleId,
        title: title.trim(),
        content: content,
        media_url: mediaUrl,
        type: lessonType.trim(),
        position: currentPosition,
      };

      let response;
      if (lessonId) {
        // Update existing lesson
        response = await supabase.from('lessons').update(lessonData).eq('id', lessonId).select().single();
      } else {
        // Create new lesson
        response = await supabase.from('lessons').insert(lessonData).select().single();
      }

      const { data: savedLesson, error } = response;

      if (error) throw error;

      Alert.alert('Sucesso', `Lição ${lessonId ? 'atualizada' : 'criada'} com sucesso!`);
      navigation.navigate('ModuleEdit', { courseId: courseId, moduleId: moduleId, refresh: true }); // Pass courseId here

    } catch (error: any) {
      Alert.alert('Erro ao Salvar', error.message || 'Ocorreu um erro desconhecido.');
      console.error('Error saving lesson:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!lessonId || !courseId || !moduleId) {
        Alert.alert('Erro', 'Não é possível excluir a lição devido a IDs em falta.');
        console.error('handleDelete (Lesson): Missing IDs.', { lessonId, courseId, moduleId });
        return;
    }

    const performDeleteLesson = async () => {
      console.log("performDeleteLesson called. Attempting to delete lesson with ID:", lessonId);
      setIsLoading(true);
      try {
        // First, delete all pages associated with this lesson
        const { error: pagesError } = await supabase
          .from('pages')
          .delete()
          .eq('lesson_id', lessonId);

        if (pagesError) {
          console.error('Error deleting pages for lesson:', pagesError);
          Alert.alert('Erro', 'Falha ao excluir as páginas da lição.');
          // Decide if you want to stop or continue. For now, we'll stop.
          setIsLoading(false);
          return;
        }

        // Then, delete the lesson itself
        const { error: lessonError } = await supabase
          .from('lessons')
          .delete()
          .eq('id', lessonId);

        if (lessonError) {
          console.error('Error deleting lesson:', lessonError);
          Alert.alert('Erro', `Falha ao excluir lição: ${lessonError.message}`);
        } else {
          Alert.alert('Sucesso', 'Lição e suas páginas foram excluídas com sucesso!');
          navigation.navigate('ModuleEdit', { courseId: courseId, moduleId: moduleId, refresh: true });
        }
      } catch (error: any) {
        Alert.alert('Erro ao Excluir', error.message || 'Ocorreu um erro desconhecido.');
        console.error('General error deleting lesson and its pages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Tens a certeza de que queres eliminar esta lição? Isso também excluirá todas as páginas desta lição.')) {
        await performDeleteLesson();
      } else {
        console.log('Lesson deletion cancelled by user (web confirm).');
      }
    } else {
      Alert.alert(
        'Confirmar eliminação',
        'Tens a certeza de que queres eliminar esta lição? Isso também excluirá todas as páginas desta lição.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => console.log('Lesson deletion cancelled by user (native alert).') },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: performDeleteLesson,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const renderPageItem = ({ item }: { item: Page }) => (
    <TouchableOpacity 
      style={styles.pageItem}
      onPress={() => navigation.navigate('PageEdit', { lessonId: lessonId!, pageId: item.id, refresh: true })}
    >
      <Text style={styles.pageTitle}>{item.position}. {item.title}</Text>
    </TouchableOpacity>
  );

  if (isLoading && !isUploading && !isFocused && lessonId) { // Only show full screen loader if loading existing lesson data initially
    return (
      <View style={styles.centeredLoading}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Carregando dados da lição...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={Platform.OS === 'web' ? styles.webContainer : styles.container}
    >
      <Text style={styles.label}>Título da Lição</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Ex: Introdução ao Curso"
      />
      
      <Text style={styles.label}>Conteúdo</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={content}
        onChangeText={setContent}
        placeholder="Escreva o conteúdo da lição aqui..."
        multiline
      />

      <Text style={styles.label}>Tipo de Lição</Text>
      <TextInput
        style={styles.input}
        value={lessonType}
        onChangeText={setLessonType}
        placeholder="Ex: texto, vídeo, quiz"
      />

      <Text style={styles.label}>Posição</Text>
      <TextInput
        style={styles.input}
        value={position}
        onChangeText={setPosition}
        placeholder="Ex: 1, 2, 3..."
        keyboardType="numeric"
      />

      <View style={styles.mediaContainer}>
        <Button title={mediaUrl ? "Alterar Mídia" : "Adicionar Mídia (Opcional)"} onPress={handlePickMedia} color="#007bff" />
        {isUploading && <ActivityIndicator size="small" color="#007bff" style={{ marginLeft: 10 }} />}
        {mediaUrl && !isUploading && <Text style={styles.mediaText}>Mídia carregada: {mediaUrl.split('/').pop()}</Text>}
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Salvar Lição" onPress={handleSave} disabled={isLoading || isUploading} color="#28a745" />
      </View>

      {lessonId && (
        <View style={styles.buttonContainer}>
          <Button title="Excluir Lição" onPress={handleDelete} disabled={isLoading || isUploading} color="#dc3545" />
        </View>
      )}

      {/* Pages Section */}
      {lessonId && (
        <View style={styles.pagesSection}>
          <Text style={styles.sectionTitle}>Páginas da Lição</Text>
          {isLoading && pages.length === 0 && <ActivityIndicator size="small" color="#007bff" />}
          <FlatList
            data={pages}
            renderItem={renderPageItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.emptyListText}>Nenhuma página adicionada ainda.</Text>}
          />
          <View style={styles.addPageButtonContainer}>
            <Button 
              title="Adicionar Nova Página"
              onPress={() => navigation.navigate('PageEdit', { lessonId: lessonId!, pageId: null, refresh: true })}
              color="#17a2b8"
              disabled={!lessonId || isLoading || isUploading} 
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    padding: 20,
    paddingBottom: 50, 
  },
  webContainer: {
    padding: 20,
    paddingBottom: 50, 
    flexGrow: 1, 
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#495057',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  mediaText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6c757d',
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  pagesSection: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#343a40',
  },
  pageItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 16,
    color: '#007bff',
  },
  emptyListText: {
    textAlign: 'center',
    color: '#6c757d',
    marginTop: 10,
    fontStyle: 'italic',
  },
  addPageButtonContainer: {
    marginTop: 15,
  },
  centeredLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
