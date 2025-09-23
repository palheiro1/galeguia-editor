import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Platform, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS } from '../styles/designSystem';
import { Card, Button, Input, Badge, IconButton, EmptyState } from '../components/UIComponents';

// Define the type for the route params
type PageEditScreenRouteParams = {
  lessonId: string; // Each page belongs to a lesson
  pageId?: string;   // Optional: for editing existing pages
  refresh?: boolean;
};

// Define grain type for the list
type Grain = {
  id: string;
  page_id: string;
  position: number;
  type: string;
  content: any;
  created_at: string;
  updated_at: string;
};

// Define page types and their grain patterns
type PageType = 'Introduction' | 'Booster' | 'Comparation' | 'Review' | 'Custom' | 'text';

const PAGE_TYPE_PATTERNS: Record<Exclude<PageType, 'Custom' | 'text'>, string[]> = {
  Introduction: [
    'imagesToGuess', 'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete',
    'pairsOfText',
    'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete',
    'pairsOfText'
  ],
  Booster: [
    'textToComplete', 'testQuestion', 'imagesToGuess', 'textToComplete', 'pairsOfImage', 'testQuestion', 'imagesToGuess',
    'pairsOfText',
    'testQuestion', 'textToComplete', 'imagesToGuess', 'pairsOfImage', 'testQuestion', 'textToComplete',
    'pairsOfText'
  ],
  Comparation: [
    'imagesToGuess', 'textToGuess', 'imagesToGuess', 'textToGuess', 'imagesToGuess', 'textToGuess', 'imagesToGuess',
    'pairsOfText',
    'textToGuess', 'imagesToGuess', 'textToGuess', 'imagesToGuess', 'textToGuess', 'imagesToGuess',
    'pairsOfText'
  ],
  Review: [
    'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete',
    'pairsOfText',
    'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete', 'textToComplete',
    'pairsOfText'
  ]
};

const EditPageScreen = () => {
  const navigation = useNavigation<any>(); // Use any for now to fix navigation typing
  const route = useRoute<RouteProp<{ params: PageEditScreenRouteParams }, 'params'>>();
  const { lessonId, pageId, refresh } = route.params || {};

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [position, setPosition] = useState<number>(0);
  const [pageType, setPageType] = useState<PageType>('Introduction'); // Default page type
  const [grains, setGrains] = useState<Grain[]>([]);
  const [isLoadingGrains, setIsLoadingGrains] = useState(false);
  const [customGrainTypes, setCustomGrainTypes] = useState<string[]>(new Array(15).fill('textToComplete'));

  useEffect(() => {
    if (pageId) {
      loadPageData();
      loadGrains();
    } else if (lessonId) {
      fetchNextPagePosition(lessonId);
    }
  }, [pageId, lessonId]);

  // Reload grains when the screen is focused and refresh is true
  useFocusEffect(
    React.useCallback(() => {
      if (pageId && refresh) {
        loadGrains();
      }
    }, [pageId, refresh])
  );

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
      setPageType((data.type as PageType) || 'Introduction');
      
      // Load custom grain pattern if it's a Custom page type
      if (data.type === 'Custom' && data.grain_pattern) {
        setCustomGrainTypes(data.grain_pattern);
      } else {
        // Reset to default pattern for non-custom pages
        setCustomGrainTypes(new Array(15).fill('textToComplete'));
      }
    }
  };

  const loadGrains = async () => {
    if (!pageId) return;
    setIsLoadingGrains(true);
    try {
      const { data, error } = await supabase
        .from('grains')
        .select('*')
        .eq('page_id', pageId)
        .order('position', { ascending: true });

      if (error) throw error;
      setGrains(data || []);
    } catch (error) {
      console.error('Error loading grains:', error);
      Alert.alert('Erro', 'Não foi possível carregar os grains.');
    } finally {
      setIsLoadingGrains(false);
    }
  };

  const createGrainsForPageType = async (pageId: string, pageType: PageType) => {
    if (pageType === 'Custom') return; // Don't auto-create for custom pages

    const pattern = PAGE_TYPE_PATTERNS[pageType as keyof typeof PAGE_TYPE_PATTERNS];
    if (!pattern) {
      console.warn(`No pattern found for page type: ${pageType}`);
      return; // Don't create grains for unsupported types
    }

    const grainPromises = pattern.map((grainType, index) => {
      const defaultContent = getDefaultContentForGrainType(grainType);
      return supabase
        .from('grains')
        .insert({
          page_id: pageId,
          position: index + 1,
          type: grainType,
          content: defaultContent
        });
    });

    try {
      await Promise.all(grainPromises);
      await loadGrains(); // Reload grains to show the new ones
    } catch (error) {
      console.error('Error creating grains for page type:', error);
      Alert.alert('Erro', 'Erro ao criar grains para o tipo de página.');
    }
  };

  const getDefaultContentForGrainType = (grainType: string) => {
    switch (grainType) {
      case 'textToComplete':
        return { 
          phrase: '', 
          correctAnswer: '', 
          falseAlternatives: ['', '', ''] 
        };
      case 'testQuestion':
        return { 
          question: '', 
          correctAnswer: '', 
          falseAlternatives: ['', '', ''] 
        };
      case 'imagesToGuess':
        return { 
          correctImageUrl: '', 
          falseImageUrls: ['', '', ''], 
          correctWord: '' 
        };
      case 'textToGuess':
        return { 
          imageUrl: '', 
          correctAnswer: '', 
          falseAlternatives: ['', '', ''] 
        };
      case 'audioToGuess':
        return { 
          correctWord: '', 
          correctAudioUrl: '', 
          falseAudioUrls: ['', '', ''] 
        };
      case 'pairsOfText':
        return { 
          pairs: [
            { left: '', right: '' },
            { left: '', right: '' },
            { left: '', right: '' },
            { left: '', right: '' }
          ] 
        };
      case 'pairsOfImage':
        return { 
          pairs: [
            { imageUrl: '', text: '' },
            { imageUrl: '', text: '' },
            { imageUrl: '', text: '' },
            { imageUrl: '', text: '' }
          ] 
        };
      default:
        return {};
    }
  };

  // Helper function to get expected grain type based on position and page type
  const getExpectedGrainType = (position: number, pageType: PageType): string => {
    if (pageType === 'Custom') {
      // For custom pages, use the customGrainTypes array
      return customGrainTypes[position - 1] || 'textToComplete';
    }

    if (pageType === 'text') {
      // Legacy text pages - allow any grain type
      return 'textToComplete'; // Default fallback
    }

    // For predefined page types, use the pattern
    const pattern = PAGE_TYPE_PATTERNS[pageType as keyof typeof PAGE_TYPE_PATTERNS];
    if (!pattern) {
      console.warn(`No pattern found for page type: ${pageType}`);
      return 'textToComplete'; // Default fallback
    }

    return pattern[position - 1] || 'textToComplete';
  };

  const createCustomGrains = async (pageId: string) => {
    const grainPromises = customGrainTypes.map((grainType, index) => {
      const defaultContent = getDefaultContentForGrainType(grainType);
      return supabase
        .from('grains')
        .insert({
          page_id: pageId,
          position: index + 1,
          type: grainType,
          content: defaultContent
        });
    });

    try {
      await Promise.all(grainPromises);
      await loadGrains(); // Reload grains to show the new ones
    } catch (error) {
      console.error('Error creating custom grains:', error);
      Alert.alert('Erro', 'Erro ao criar grains personalizados.');
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
      grain_pattern: pageType === 'Custom' ? customGrainTypes : null,
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
      const savedPage = response.data?.[0];
      if (savedPage && !pageId) {
        // New page created, create grains based on page type
        if (pageType === 'Custom') {
          await createCustomGrains(savedPage.id);
        } else {
          await createGrainsForPageType(savedPage.id, pageType);
        }
      }
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

  const createGrain = () => {
    if (!pageId) {
      Alert.alert('Aviso', 'Guarde a página antes de criar grains');
      return;
    }
    if (grains.length >= 15) {
      Alert.alert('Limite atingido', 'Cada página pode ter no máximo 15 grains');
      return;
    }
    const nextPosition = grains.length + 1;
    const expectedGrainType = getExpectedGrainType(nextPosition, pageType);
    navigation.navigate('ImprovedGrainEdit', { 
      pageId, 
      grainId: null, 
      position: nextPosition, 
      expectedGrainType,
      pageType,
      refresh: true 
    });
  };

  const editGrain = (grainId: string) => {
    // Find the grain to get its position
    const grain = grains.find(g => g.id === grainId);
    const expectedGrainType = grain ? getExpectedGrainType(grain.position, pageType) : null;
    navigation.navigate('ImprovedGrainEdit', { 
      pageId, 
      grainId, 
      expectedGrainType,
      pageType,
      refresh: true 
    });
  };

  const deleteGrain = async (grainId: string) => {
    const confirmMessage = 'Tens a certeza de que queres eliminar este grain?';
    const performDelete = async () => {
      try {
        const { error } = await supabase
          .from('grains')
          .delete()
          .eq('id', grainId);

        if (error) throw error;
        Alert.alert('Sucesso', 'Grain eliminado com sucesso');
        loadGrains(); // Reload grains
      } catch (error) {
        console.error('Error deleting grain:', error);
        Alert.alert('Erro', 'Erro ao eliminar grain');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) await performDelete();
    } else {
      Alert.alert('Confirmação', confirmMessage, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  const handleTestPage = () => {
    if (!pageId) {
      Alert.alert('Aviso', 'Guarde a página antes de testá-la');
      return;
    }
    
    navigation.navigate('PageTest', { 
      pageId, 
      pageTitle: title || 'Página de Teste' 
    });
  };

  const renderGrainItem = ({ item }: { item: Grain }) => (
    <View style={styles.grainItem}>
      <TouchableOpacity 
        style={styles.grainItemContent}
        onPress={() => editGrain(item.id)}
      >
        <Text style={styles.grainTitle}>
          {item.position}. {getGrainTypeLabel(item.type)}
        </Text>
        <Text style={styles.grainDescription}>
          {getGrainDescription(item)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteGrainButton}
        onPress={() => deleteGrain(item.id)}
      >
        <Text style={styles.deleteGrainText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  const getGrainTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      textToComplete: 'Texto para Completar',
      testQuestion: 'Pergunta de Teste',
      imagesToGuess: 'Imagens para Adivinhar',
      textToGuess: 'Texto para Adivinhar',
      audioToGuess: 'Áudio para Adivinhar',
      pairsOfText: 'Pares de Texto',
      pairsOfImage: 'Pares de Imagem',
    };
    return labels[type] || type;
  };

  const showGrainTypeAlert = (index: number) => {
    const grainTypes = [
      { value: 'textToComplete', label: 'Texto para Completar' },
      { value: 'testQuestion', label: 'Pergunta de Teste' },
      { value: 'imagesToGuess', label: 'Imagens para Adivinhar' },
      { value: 'textToGuess', label: 'Texto para Adivinhar' },
      { value: 'audioToGuess', label: 'Áudio para Adivinhar' },
      { value: 'pairsOfText', label: 'Pares de Texto' },
      { value: 'pairsOfImage', label: 'Pares de Imagem' },
    ];

    const buttons = grainTypes.map(type => ({
      text: type.label,
      onPress: () => {
        const newTypes = [...customGrainTypes];
        newTypes[index] = type.value;
        setCustomGrainTypes(newTypes);
      }
    }));

    buttons.push({ text: 'Cancelar', onPress: () => {} });

    Alert.alert(
      `Selecionar tipo para posição ${index + 1}`,
      'Escolha o tipo de grain:',
      buttons,
      { cancelable: true }
    );
  };

  const getGrainDescription = (grain: Grain) => {
    try {
      const content = grain.content;
      switch (grain.type) {
        case 'textToComplete':
          return content.phrase ? content.phrase.substring(0, 50) + '...' : 'Sem frase';
        case 'testQuestion':
          return content.question ? content.question.substring(0, 50) + '...' : 'Sem pergunta';
        case 'imagesToGuess':
          return content.correctWord || 'Sem palavra';
        case 'textToGuess':
          return content.correctAnswer || 'Sem resposta';
        case 'audioToGuess':
          return content.correctWord || 'Sem palavra';
        case 'pairsOfText':
          return `${content.pairs?.length || 0} pares de texto`;
        case 'pairsOfImage':
          return `${content.pairs?.length || 0} pares de imagem`;
        default:
          return 'Conteúdo não definido';
      }
    } catch {
      return 'Erro ao carregar conteúdo';
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
      {Platform.OS === 'web' ? (
        <select
          value={pageType}
          onChange={(e) => setPageType(e.target.value as PageType)}
          style={styles.pageTypeSelect}
        >
          <option value="Introduction">Introduction</option>
          <option value="Booster">Booster</option>
          <option value="Comparation">Comparation</option>
          <option value="Review">Review</option>
          <option value="Custom">Custom</option>
          <option value="text">Text (Deprecated)</option>
        </select>
      ) : (
        <View style={styles.pageTypeContainer}>
          {(['Introduction', 'Booster', 'Comparation', 'Review', 'Custom', 'text'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.pageTypeButton,
                pageType === type && styles.pageTypeButtonActive
              ]}
              onPress={() => setPageType(type)}
            >
              <Text style={[
                styles.pageTypeButtonText,
                pageType === type && styles.pageTypeButtonTextActive
              ]}>
                {type === 'text' ? 'Text (Deprecated)' : type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Page Structure Display */}
      <View style={styles.pageStructureSection}>
        <Text style={styles.label}>Estrutura da Página (15 Grains):</Text>
        
        {pageType === 'Custom' ? (
          // Custom page type - allow grain type selection for each position
          <View>
            <Text style={styles.structureDescription}>
              Configure o tipo de grain para cada uma das 15 posições:
            </Text>
            {customGrainTypes.map((grainType, index) => (
              <View key={index} style={styles.grainStructureRow}>
                <Text style={styles.grainPositionLabel}>{index + 1}.</Text>
                {Platform.OS === 'web' ? (
                  <select
                    value={grainType}
                    onChange={(e) => {
                      const newTypes = [...customGrainTypes];
                      newTypes[index] = e.target.value;
                      setCustomGrainTypes(newTypes);
                    }}
                    style={styles.grainTypeSelect}
                  >
                    <option value="textToComplete">Texto para Completar</option>
                    <option value="testQuestion">Pergunta de Teste</option>
                    <option value="imagesToGuess">Imagens para Adivinhar</option>
                    <option value="textToGuess">Texto para Adivinhar</option>
                    <option value="audioToGuess">Áudio para Adivinhar</option>
                    <option value="pairsOfText">Pares de Texto</option>
                    <option value="pairsOfImage">Pares de Imagem</option>
                  </select>
                ) : (
                  <TouchableOpacity
                    style={styles.grainTypeSelector}
                    onPress={() => showGrainTypeAlert(index)}
                  >
                    <Text style={styles.grainTypeSelectorText}>
                      {getGrainTypeLabel(grainType)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          // Predefined page types - show the fixed structure
          <View>
            <Text style={styles.structureDescription}>
              {PAGE_TYPE_PATTERNS[pageType as keyof typeof PAGE_TYPE_PATTERNS] 
                ? 'Esta página seguirá a seguinte estrutura de grains:'
                : 'Esta página utiliza um tipo não suportado. Altere o tipo para ver a estrutura.'}
            </Text>
            {PAGE_TYPE_PATTERNS[pageType as keyof typeof PAGE_TYPE_PATTERNS]?.map((grainType, index) => (
              <View key={index} style={styles.grainStructureRow}>
                <Text style={styles.grainPositionLabel}>{index + 1}.</Text>
                <Text style={styles.grainTypeLabel}>
                  {getGrainTypeLabel(grainType)}
                </Text>
                {(index === 7 || index === 14) && (
                  <Text style={styles.grainTypeNote}>(Pair Exercise)</Text>
                )}
              </View>
            )) || (
              <Text style={styles.structureDescription}>
                Selecione um tipo de página válido (Introduction, Booster, Comparation, Review, ou Custom).
              </Text>
            )}
          </View>
        )}
      </View>


      <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
        <Text style={styles.buttonText}>Guardar Página</Text>
      </TouchableOpacity>

      {pageId && (
        <TouchableOpacity style={[styles.button, styles.testButton]} onPress={handleTestPage}>
          <Text style={styles.buttonText}>Provar Página</Text>
        </TouchableOpacity>
      )}

      {pageId && (
        <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}>
          <Text style={styles.buttonText}>Eliminar Página</Text>
        </TouchableOpacity>
      )}

      {/* Grains Section */}
      {pageId && (
        <View style={styles.grainsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Grains da Página ({grains.length}/15)</Text>
            <TouchableOpacity
              style={[styles.addGrainButton, grains.length >= 15 && styles.disabledButton]}
              onPress={createGrain}
              disabled={grains.length >= 15}
            >
              <Text style={styles.addGrainButtonText}>+ Adicionar Grain</Text>
            </TouchableOpacity>
          </View>
          
          {isLoadingGrains ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : grains.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum grain adicionado ainda.</Text>
          ) : (
            <FlatList
              data={grains}
              renderItem={renderGrainItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: SPACING.lg,
    ...(Platform.OS === 'web' && { 
      flexGrow: 1,
      maxWidth: 800,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.base,
    marginBottom: SPACING.base,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    ...SHADOWS.sm,
  },
  textArea: {
    height: 200,
    textAlignVertical: 'top',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.base,
    marginBottom: SPACING.base,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    ...SHADOWS.sm,
  },
  button: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.base,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  uploadButton: {
    backgroundColor: COLORS.gray500,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  testButton: {
    backgroundColor: COLORS.success,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  mediaUrlText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text.secondary,
    marginBottom: SPACING.base,
    fontStyle: 'italic',
  },
  grainsSection: {
    marginTop: SPACING['2xl'],
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  addGrainButton: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
  },
  addGrainButtonText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    color: COLORS.text.secondary,
    fontStyle: 'italic',
    marginTop: SPACING.md,
  },
  grainItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  grainItemContent: {
    flex: 1,
  },
  grainTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  grainDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text.secondary,
  },
  deleteGrainButton: {
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  deleteGrainText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  // Page type selection styles
  pageTypeSelect: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: TYPOGRAPHY.fontSize.base,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  pageTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.base,
    gap: SPACING.sm,
  },
  pageTypeButton: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  pageTypeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pageTypeButtonText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  pageTypeButtonTextActive: {
    color: COLORS.white,
  },
  // Page structure display styles
  pageStructureSection: {
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.gray50,
    padding: SPACING.base,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  structureDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    fontStyle: 'italic',
  },
  grainStructureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  grainPositionLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.secondary,
    minWidth: 30,
    marginRight: SPACING.md,
  },
  grainTypeLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text.primary,
    flex: 1,
  },
  grainTypeNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontStyle: 'italic',
    marginLeft: SPACING.sm,
  },
  grainTypeSelect: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: TYPOGRAPHY.fontSize.sm,
    ...SHADOWS.sm,
  },
  grainTypeSelector: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  grainTypeSelectorText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text.secondary,
  },
});

export default EditPageScreen;
