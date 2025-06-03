// 
// GRAIN TYPE ENFORCEMENT IMPLEMENTATION COMPLETED
// 
// This screen now supports enforcing grain types based on page type patterns:
// - Introduction/Booster/Comparation/Review pages have predefined 15-grain patterns
// - Custom pages allow editors to select grain types for each position
// - Legacy 'text' pages have no enforcement (backward compatibility)
// 
// Enforcement features:
// - Warning message when grain type is restricted
// - Disabled grain type selector with visual feedback
// - Alert when user tries to change restricted grain type
// - Debug logging for enforcement status
// 
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS } from '../styles/designSystem';
import { Card, Button, Input, Badge, IconButton, EmptyState } from '../components/UIComponents';

// Define grain types and their content structures
export type GrainType = 'textToComplete' | 'testQuestion' | 'imagesToGuess' | 'textToGuess' | 'audioToGuess' | 'pairsOfText' | 'pairsOfImage';

export interface GrainContent {
  textToComplete: {
    phrase: string; // 100-200 characters with placeholders like [BLANK]
    correctAnswer: string;
    falseAlternatives: [string, string, string];
  };
  testQuestion: {
    question: string;
    correctAnswer: string;
    falseAlternatives: [string, string, string];
  };
  imagesToGuess: {
    correctImageUrl: string;
    falseImageUrls: [string, string, string];
    correctWord: string;
  };
  textToGuess: {
    imageUrl: string; // 1 image to show
    correctAnswer: string; // correct word to choose
    falseAlternatives: [string, string, string]; // 3 wrong words
  };
  audioToGuess: {
    correctWord: string; // word to display
    correctAudioUrl: string; // correct audio for the word
    falseAudioUrls: [string, string, string]; // 3 wrong audio files
  };
  pairsOfText: {
    pairs: Array<{ left: string; right: string }>; // 4-6 pairs to match
  };
  pairsOfImage: {
    pairs: Array<{ imageUrl: string; text: string }>; // 4-6 pairs to match
  };
}

type RootStackParamList = {
  PageEdit: { lessonId: string; pageId?: string | null; refresh?: boolean };
  GrainEdit: { 
    pageId: string; 
    grainId?: string | null; 
    position?: number; 
    expectedGrainType?: string | null;
    pageType?: string;
    refresh?: boolean;
  };
};

type GrainEditScreenRouteParams = {
  pageId: string;
  grainId?: string | null;
  position?: number;
  expectedGrainType?: string | null;
  pageType?: string;
  refresh?: boolean;
};

const GrainEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: GrainEditScreenRouteParams }, 'params'>>();
  const { pageId, grainId, position: initialPosition, expectedGrainType, pageType } = route.params || {};

  const [grainType, setGrainType] = useState<GrainType>(
    (expectedGrainType as GrainType) || 'textToComplete'
  );
  const [position, setPosition] = useState<number>(initialPosition || 1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Show warning if grain type is enforced
  const isGrainTypeEnforced = expectedGrainType && pageType && pageType !== 'text';
  const canChangeGrainType = !isGrainTypeEnforced;

  // Debug log for enforcement
  useEffect(() => {
    if (isGrainTypeEnforced) {
      console.log(`🔒 Grain type enforcement active: Position ${position} must be "${expectedGrainType}" for page type "${pageType}"`);
    } else {
      console.log(`🔓 Grain type enforcement disabled: Position ${position}, page type "${pageType}"`);
    }
  }, [isGrainTypeEnforced, position, expectedGrainType, pageType]);

  // Content states for different grain types
  const [textToCompleteContent, setTextToCompleteContent] = useState({
    phrase: '',
    correctAnswer: '',
    falseAlternatives: ['', '', ''] as [string, string, string],
  });

  const [testQuestionContent, setTestQuestionContent] = useState({
    question: '',
    correctAnswer: '',
    falseAlternatives: ['', '', ''] as [string, string, string],
  });

  const [imagesToGuessContent, setImagesToGuessContent] = useState({
    correctImageUrl: '',
    falseImageUrls: ['', '', ''] as [string, string, string],
    correctWord: '',
  });

  const [textToGuessContent, setTextToGuessContent] = useState({
    imageUrl: '',
    correctAnswer: '',
    falseAlternatives: ['', '', ''] as [string, string, string],
  });

  const [audioToGuessContent, setAudioToGuessContent] = useState({
    correctWord: '',
    correctAudioUrl: '',
    falseAudioUrls: ['', '', ''] as [string, string, string],
  });

  const [pairsOfTextContent, setPairsOfTextContent] = useState({
    pairs: [
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
      { left: '', right: '' },
    ],
  });

  const [pairsOfImageContent, setPairsOfImageContent] = useState({
    pairs: [
      { imageUrl: '', text: '' },
      { imageUrl: '', text: '' },
      { imageUrl: '', text: '' },
      { imageUrl: '', text: '' },
    ],
  });

  useEffect(() => {
    if (grainId) {
      loadGrainData();
    } else if (pageId) {
      fetchNextGrainPosition();
    }
  }, [grainId, pageId]);

  const fetchNextGrainPosition = async () => {
    try {
      const { data, error } = await supabase
        .from('grains')
        .select('position')
        .eq('page_id', pageId)
        .order('position', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching next grain position:', error);
        setPosition(1);
      } else if (data && data.length > 0) {
        setPosition(data[0].position + 1);
      } else {
        setPosition(1);
      }
    } catch (error) {
      console.error('Error fetching next grain position:', error);
      setPosition(1);
    }
  };

  const loadGrainData = async () => {
    if (!grainId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('grains')
        .select('*')
        .eq('id', grainId)
        .single();

      if (error) throw error;

      if (data) {
        setGrainType(data.type);
        setPosition(data.position);
        
        // Load content based on type with safety checks for backward compatibility
        switch (data.type) {
          case 'textToComplete':
            setTextToCompleteContent({
              phrase: data.content?.phrase || '',
              correctAnswer: data.content?.correctAnswer || data.content?.missingWord || '',
              falseAlternatives: data.content?.falseAlternatives || ['', '', '']
            });
            break;
          case 'testQuestion':
            setTestQuestionContent({
              question: data.content?.question || '',
              correctAnswer: data.content?.correctAnswer || '',
              falseAlternatives: data.content?.falseAlternatives || data.content?.options?.slice(1) || ['', '', '']
            });
            break;
          case 'imagesToGuess':
            setImagesToGuessContent({
              correctImageUrl: data.content?.correctImageUrl || data.content?.imageUrl || '',
              falseImageUrls: data.content?.falseImageUrls || ['', '', ''],
              correctWord: data.content?.correctWord || ''
            });
            break;
          case 'textToGuess':
            setTextToGuessContent({
              imageUrl: data.content?.imageUrl || '',
              correctAnswer: data.content?.correctAnswer || '',
              falseAlternatives: data.content?.falseAlternatives || ['', '', '']
            });
            break;
          case 'audioToGuess':
            setAudioToGuessContent({
              correctWord: data.content?.correctWord || '',
              correctAudioUrl: data.content?.correctAudioUrl || '',
              falseAudioUrls: data.content?.falseAudioUrls || ['', '', '']
            });
            break;
          case 'pairsOfText':
            setPairsOfTextContent({
              pairs: data.content?.pairs || [
                { left: '', right: '' },
                { left: '', right: '' },
                { left: '', right: '' },
                { left: '', right: '' }
              ]
            });
            break;
          case 'pairsOfImage':
            setPairsOfImageContent({
              pairs: data.content?.pairs || [
                { imageUrl: '', text: '' },
                { imageUrl: '', text: '' },
                { imageUrl: '', text: '' },
                { imageUrl: '', text: '' }
              ]
            });
            break;
        }
      }
    } catch (error) {
      console.error('Error loading grain data:', error);
      Alert.alert('Erro', 'Falha ao carregar dados do grain');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `grain-image-${Date.now()}.jpg`;
      const filePath = `grains/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('course-content')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);

      return publicUrlData?.publicUrl || null;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Erro', 'Erro ao fazer upload da imagem');
      return null;
    }
  };

  const uploadAudio = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `grain-audio-${Date.now()}.mp3`;
      const filePath = `grains/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('course-content')
        .upload(filePath, blob, { contentType: 'audio/mpeg', upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);

      return publicUrlData?.publicUrl || null;
    } catch (error) {
      console.error('Error uploading audio:', error);
      Alert.alert('Erro', 'Erro ao fazer upload do áudio');
      return null;
    }
  };

  const pickImage = async (callback: (url: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uploadedUrl = await uploadImage(result.assets[0].uri);
      if (uploadedUrl) {
        callback(uploadedUrl);
      }
    }
  };

  const pickAudio = async (callback: (url: string) => void) => {
    // For web, use file input
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const uploadedUrl = await uploadAudio(URL.createObjectURL(file));
          if (uploadedUrl) {
            callback(uploadedUrl);
          }
        }
      };
      input.click();
    } else {
      // For mobile, use document picker for audio files
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: false,
          quality: 1,
        });

        if (!result.canceled && result.assets[0]) {
          const uploadedUrl = await uploadAudio(result.assets[0].uri);
          if (uploadedUrl) {
            callback(uploadedUrl);
          }
        }
      } catch (error) {
        Alert.alert('Erro', 'Erro ao selecionar áudio');
      }
    }
  };

  const handleSave = async () => {
    // Validation
    if (!validateContent()) {
      return;
    }

    setIsSaving(true);
    try {
      let content: any;
      
      switch (grainType) {
        case 'textToComplete':
          content = textToCompleteContent;
          break;
        case 'testQuestion':
          content = testQuestionContent;
          break;
        case 'imagesToGuess':
          content = imagesToGuessContent;
          break;
        case 'textToGuess':
          content = textToGuessContent;
          break;
        case 'audioToGuess':
          content = audioToGuessContent;
          break;
        case 'pairsOfText':
          content = pairsOfTextContent;
          break;
        case 'pairsOfImage':
          content = pairsOfImageContent;
          break;
      }

      const grainData = {
        page_id: pageId,
        position,
        type: grainType,
        content,
      };

      let response;
      if (grainId) {
        response = await supabase
          .from('grains')
          .update(grainData)
          .eq('id', grainId)
          .select();
      } else {
        response = await supabase
          .from('grains')
          .insert(grainData)
          .select();
      }

      if (response.error) throw response.error;

      Alert.alert('Sucesso', grainId ? 'Grain atualizado com sucesso!' : 'Grain criado com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving grain:', error);
      Alert.alert('Erro', 'Erro ao guardar grain');
    } finally {
      setIsSaving(false);
    }
  };

  const validateContent = (): boolean => {
    switch (grainType) {
      case 'textToComplete':
        if (!textToCompleteContent.phrase.trim() || 
            textToCompleteContent.phrase.length < 100 || 
            textToCompleteContent.phrase.length > 200) {
          Alert.alert('Erro', 'A frase deve ter entre 100-200 caracteres');
          return false;
        }
        if (!textToCompleteContent.phrase.includes('[BLANK]')) {
          Alert.alert('Erro', 'A frase deve conter [BLANK] para marcar onde está a palavra em falta');
          return false;
        }
        if (!textToCompleteContent.correctAnswer.trim()) {
          Alert.alert('Erro', 'A resposta correta é obrigatória');
          return false;
        }
        if (textToCompleteContent.falseAlternatives.some(alt => !alt.trim())) {
          Alert.alert('Erro', 'Todas as três alternativas falsas são obrigatórias');
          return false;
        }
        break;
      
      case 'testQuestion':
        if (!testQuestionContent.question.trim()) {
          Alert.alert('Erro', 'A pergunta é obrigatória');
          return false;
        }
        if (!testQuestionContent.correctAnswer.trim()) {
          Alert.alert('Erro', 'A resposta correta é obrigatória');
          return false;
        }
        if (testQuestionContent.falseAlternatives.some(alt => !alt.trim())) {
          Alert.alert('Erro', 'Todas as três alternativas falsas são obrigatórias');
          return false;
        }
        break;
      
      case 'imagesToGuess':
        if (!imagesToGuessContent.correctImageUrl.trim()) {
          Alert.alert('Erro', 'A imagem correta é obrigatória');
          return false;
        }
        if (imagesToGuessContent.falseImageUrls.some(url => !url.trim())) {
          Alert.alert('Erro', 'Todas as três imagens falsas são obrigatórias');
          return false;
        }
        if (!imagesToGuessContent.correctWord.trim()) {
          Alert.alert('Erro', 'A palavra correta é obrigatória');
          return false;
        }
        break;
      
      case 'textToGuess':
        if (!textToGuessContent.imageUrl.trim()) {
          Alert.alert('Erro', 'A imagem é obrigatória');
          return false;
        }
        if (!textToGuessContent.correctAnswer.trim()) {
          Alert.alert('Erro', 'A resposta correta é obrigatória');
          return false;
        }
        if (textToGuessContent.falseAlternatives.some(alt => !alt.trim())) {
          Alert.alert('Erro', 'Todas as três alternativas falsas são obrigatórias');
          return false;
        }
        break;
      
      case 'audioToGuess':
        if (!audioToGuessContent.correctWord.trim()) {
          Alert.alert('Erro', 'A palavra é obrigatória');
          return false;
        }
        if (!audioToGuessContent.correctAudioUrl.trim()) {
          Alert.alert('Erro', 'O áudio correto é obrigatório');
          return false;
        }
        if (audioToGuessContent.falseAudioUrls.some(url => !url.trim())) {
          Alert.alert('Erro', 'Todos os três áudios falsos são obrigatórios');
          return false;
        }
        break;
      
      case 'pairsOfText':
        if (pairsOfTextContent.pairs.some(pair => !pair.left.trim() || !pair.right.trim())) {
          Alert.alert('Erro', 'Todos os pares de texto devem estar preenchidos');
          return false;
        }
        break;
      
      case 'pairsOfImage':
        if (pairsOfImageContent.pairs.some(pair => !pair.imageUrl.trim() || !pair.text.trim())) {
          Alert.alert('Erro', 'Todos os pares (imagem e texto) devem estar preenchidos');
          return false;
        }
        break;
    }
    return true;
  };

  const handleDelete = async () => {
    if (!grainId) return;

    const performDelete = async () => {
      try {
        const { error } = await supabase
          .from('grains')
          .delete()
          .eq('id', grainId);

        if (error) throw error;

        Alert.alert('Sucesso', 'Grain eliminado com sucesso!');
        navigation.goBack();
      } catch (error) {
        console.error('Error deleting grain:', error);
        Alert.alert('Erro', 'Erro ao eliminar grain');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Tens a certeza de que queres eliminar este grain?')) {
        await performDelete();
      }
    } else {
      Alert.alert(
        'Confirmar eliminação',
        'Tens a certeza de que queres eliminar este grain?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  const renderGrainTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.label}>Tipo de Grain:</Text>
      
      {/* Show enforcement warning if grain type is enforced */}
      {isGrainTypeEnforced && (
        <View style={styles.enforcementWarning}>
          <Text style={styles.enforcementWarningText}>
            ⚠️ O tipo de grain está definido pelo tipo de página ({pageType}). 
            Posição {position} deve ser: {getGrainTypeLabel(expectedGrainType as string)}
          </Text>
        </View>
      )}
      
      {Platform.OS === 'web' ? (
        <select
          value={grainType}
          onChange={(e) => {
            if (isGrainTypeEnforced) {
              Alert.alert(
                'Tipo Restrito',
                `Este grain deve ser do tipo "${getGrainTypeLabel(expectedGrainType as string)}" conforme definido pelo tipo de página "${pageType}".`
              );
              return;
            }
            setGrainType(e.target.value as GrainType);
          }}
          style={{
            ...styles.picker,
            ...(isGrainTypeEnforced && styles.disabledPicker)
          }}
          disabled={isGrainTypeEnforced ? true : false}
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
        <View style={styles.typeButtonsContainer}>
          {[
            { key: 'textToComplete', label: 'Texto para Completar' },
            { key: 'testQuestion', label: 'Pergunta de Teste' },
            { key: 'imagesToGuess', label: 'Imagens para Adivinhar' },
            { key: 'textToGuess', label: 'Texto para Adivinhar' },
            { key: 'audioToGuess', label: 'Áudio para Adivinhar' },
            { key: 'pairsOfText', label: 'Pares de Texto' },
            { key: 'pairsOfImage', label: 'Pares de Imagem' },
          ].map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.typeButton,
                grainType === type.key && styles.selectedTypeButton,
                isGrainTypeEnforced && type.key !== expectedGrainType && styles.disabledTypeButton,
              ].filter(Boolean)}
              onPress={() => {
                if (isGrainTypeEnforced && type.key !== expectedGrainType) {
                  Alert.alert(
                    'Tipo Restrito',
                    `Este grain deve ser do tipo "${getGrainTypeLabel(expectedGrainType as string)}" conforme definido pelo tipo de página "${pageType}".`
                  );
                  return;
                }
                setGrainType(type.key as GrainType);
              }}
              disabled={isGrainTypeEnforced && type.key !== expectedGrainType ? true : false}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  grainType === type.key && styles.selectedTypeButtonText,
                  isGrainTypeEnforced && type.key !== expectedGrainType && styles.disabledTypeButtonText,
                ].filter(Boolean)}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  // Helper function to get grain type label
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

  const renderTextToCompleteEditor = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Texto para Completar</Text>
      <Text style={styles.description}>
        Crie uma frase de 100-200 caracteres com [BLANK] onde a palavra deve ser inserida.
      </Text>
      
      <Text style={styles.label}>Frase (100-200 caracteres):</Text>
      <TextInput
        style={[styles.textArea, styles.input]}
        value={textToCompleteContent.phrase}
        onChangeText={(text) => setTextToCompleteContent({...textToCompleteContent, phrase: text})}
        placeholder="Ex: O [BLANK] é o maior mamífero do mundo."
        multiline
        maxLength={200}
      />
      <Text style={styles.charCount}>{textToCompleteContent.phrase.length}/200</Text>

      <Text style={styles.label}>Resposta Correta:</Text>
      <TextInput
        style={styles.input}
        value={textToCompleteContent.correctAnswer}
        onChangeText={(text) => setTextToCompleteContent({...textToCompleteContent, correctAnswer: text})}
        placeholder="Ex: baleia"
      />

      <Text style={styles.label}>Alternativas Falsas:</Text>
      {textToCompleteContent.falseAlternatives.map((alt, index) => (
        <TextInput
          key={index}
          style={styles.input}
          value={alt}
          onChangeText={(text) => {
            const newAlts = [...textToCompleteContent.falseAlternatives];
            newAlts[index] = text;
            setTextToCompleteContent({...textToCompleteContent, falseAlternatives: newAlts as [string, string, string]});
          }}
          placeholder={`Alternativa falsa ${index + 1}`}
        />
      ))}
    </View>
  );

  const renderTestQuestionEditor = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pergunta de Teste</Text>
      
      <Text style={styles.label}>Pergunta:</Text>
      <TextInput
        style={[styles.textArea, styles.input]}
        value={testQuestionContent.question}
        onChangeText={(text) => setTestQuestionContent({...testQuestionContent, question: text})}
        placeholder="Digite a pergunta..."
        multiline
      />

      <Text style={styles.label}>Resposta Correta:</Text>
      <TextInput
        style={styles.input}
        value={testQuestionContent.correctAnswer}
        onChangeText={(text) => setTestQuestionContent({...testQuestionContent, correctAnswer: text})}
        placeholder="Resposta correta"
      />

      <Text style={styles.label}>Alternativas Falsas:</Text>
      {testQuestionContent.falseAlternatives.map((alt, index) => (
        <TextInput
          key={index}
          style={styles.input}
          value={alt}
          onChangeText={(text) => {
            const newAlts = [...testQuestionContent.falseAlternatives];
            newAlts[index] = text;
            setTestQuestionContent({...testQuestionContent, falseAlternatives: newAlts as [string, string, string]});
          }}
          placeholder={`Alternativa falsa ${index + 1}`}
        />
      ))}
    </View>
  );

  const renderImagesToGuessEditor = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Imagens para Adivinhar</Text>
      
      <Text style={styles.label}>Palavra Correta:</Text>
      <TextInput
        style={styles.input}
        value={imagesToGuessContent.correctWord}
        onChangeText={(text) => setImagesToGuessContent({...imagesToGuessContent, correctWord: text})}
        placeholder="Ex: gato"
      />

      <Text style={styles.label}>Imagem Correta:</Text>
      <TouchableOpacity
        style={styles.imageButton}
        onPress={() => pickImage((url) => setImagesToGuessContent({...imagesToGuessContent, correctImageUrl: url}))}
      >
        <Text style={styles.imageButtonText}>
          {imagesToGuessContent.correctImageUrl ? 'Alterar Imagem Correta' : 'Selecionar Imagem Correta'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Imagens Falsas:</Text>
      {imagesToGuessContent.falseImageUrls.map((url, index) => (
        <TouchableOpacity
          key={index}
          style={styles.imageButton}
          onPress={() => pickImage((newUrl) => {
            const newUrls = [...imagesToGuessContent.falseImageUrls];
            newUrls[index] = newUrl;
            setImagesToGuessContent({...imagesToGuessContent, falseImageUrls: newUrls as [string, string, string]});
          })}
        >
          <Text style={styles.imageButtonText}>
            {url ? `Alterar Imagem Falsa ${index + 1}` : `Selecionar Imagem Falsa ${index + 1}`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTextToGuessEditor = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Texto para Adivinhar</Text>
      <Text style={styles.description}>
        Mostre 1 imagem e o usuário escolhe a palavra correta entre 4 opções.
      </Text>
      
      <Text style={styles.label}>Imagem:</Text>
      <TouchableOpacity
        style={styles.imageButton}
        onPress={() => pickImage((url) => setTextToGuessContent({...textToGuessContent, imageUrl: url}))}
      >
        <Text style={styles.imageButtonText}>
          {textToGuessContent.imageUrl ? 'Alterar Imagem' : 'Selecionar Imagem'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Resposta Correta:</Text>
      <TextInput
        style={styles.input}
        value={textToGuessContent.correctAnswer}
        onChangeText={(text) => setTextToGuessContent({...textToGuessContent, correctAnswer: text})}
        placeholder="Ex: gato"
      />

      <Text style={styles.label}>Alternativas Falsas:</Text>
      {textToGuessContent.falseAlternatives.map((alt, index) => (
        <TextInput
          key={index}
          style={styles.input}
          value={alt}
          onChangeText={(text) => {
            const newAlts = [...textToGuessContent.falseAlternatives];
            newAlts[index] = text;
            setTextToGuessContent({...textToGuessContent, falseAlternatives: newAlts as [string, string, string]});
          }}
          placeholder={`Alternativa falsa ${index + 1}`}
        />
      ))}
    </View>
  );

  const renderPairsOfTextEditor = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pares de Texto</Text>
      <Text style={styles.description}>
        Crie pares de texto para o utilizador associar. Mínimo 4 pares.
      </Text>
      
      {pairsOfTextContent.pairs.map((pair, index) => (
        <View key={index} style={styles.pairContainer}>
          <Text style={styles.pairLabel}>Par {index + 1}:</Text>
          <TextInput
            style={styles.input}
            value={pair.left}
            onChangeText={(text) => {
              const newPairs = [...pairsOfTextContent.pairs];
              newPairs[index].left = text;
              setPairsOfTextContent({...pairsOfTextContent, pairs: newPairs});
            }}
            placeholder="Texto esquerdo"
          />
          <TextInput
            style={styles.input}
            value={pair.right}
            onChangeText={(text) => {
              const newPairs = [...pairsOfTextContent.pairs];
              newPairs[index].right = text;
              setPairsOfTextContent({...pairsOfTextContent, pairs: newPairs});
            }}
            placeholder="Texto direito"
          />
        </View>
      ))}
      
      <TouchableOpacity
        style={styles.addPairButton}
        onPress={() => {
          if (pairsOfTextContent.pairs.length < 6) {
            setPairsOfTextContent({
              ...pairsOfTextContent,
              pairs: [...pairsOfTextContent.pairs, { left: '', right: '' }]
            });
          }
        }}
      >
        <Text style={styles.addPairButtonText}>+ Adicionar Par</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPairsOfImageEditor = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pares de Imagem</Text>
      <Text style={styles.description}>
        Crie pares de imagem e texto para o utilizador associar. Mínimo 4 pares.
      </Text>
      
      {pairsOfImageContent.pairs.map((pair, index) => (
        <View key={index} style={styles.pairContainer}>
          <Text style={styles.pairLabel}>Par {index + 1}:</Text>
          <TouchableOpacity
            style={styles.imageButton}
            onPress={() => pickImage((url) => {
              const newPairs = [...pairsOfImageContent.pairs];
              newPairs[index].imageUrl = url;
              setPairsOfImageContent({...pairsOfImageContent, pairs: newPairs});
            })}
          >
            <Text style={styles.imageButtonText}>
              {pair.imageUrl ? `Alterar Imagem ${index + 1}` : `Selecionar Imagem ${index + 1}`}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={pair.text}
            onChangeText={(text) => {
              const newPairs = [...pairsOfImageContent.pairs];
              newPairs[index].text = text;
              setPairsOfImageContent({...pairsOfImageContent, pairs: newPairs});
            }}
            placeholder="Texto para associar"
          />
        </View>
      ))}
      
      <TouchableOpacity
        style={styles.addPairButton}
        onPress={() => {
          if (pairsOfImageContent.pairs.length < 6) {
            setPairsOfImageContent({
              ...pairsOfImageContent,
              pairs: [...pairsOfImageContent.pairs, { imageUrl: '', text: '' }]
            });
          }
        }}
      >
        <Text style={styles.addPairButtonText}>+ Adicionar Par</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAudioToGuessEditor = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Áudio para Adivinhar</Text>
      <Text style={styles.description}>
        Mostre uma palavra e o usuário escolhe o áudio correto entre 4 opções.
      </Text>
      
      <Text style={styles.label}>Palavra:</Text>
      <TextInput
        style={styles.input}
        value={audioToGuessContent.correctWord}
        onChangeText={(text) => setAudioToGuessContent({...audioToGuessContent, correctWord: text})}
        placeholder="Ex: gato"
      />

      <Text style={styles.label}>Áudio Correto:</Text>
      <TouchableOpacity
        style={styles.imageButton}
        onPress={() => pickAudio((url) => setAudioToGuessContent({...audioToGuessContent, correctAudioUrl: url}))}
      >
        <Text style={styles.imageButtonText}>
          {audioToGuessContent.correctAudioUrl ? 'Alterar Áudio Correto' : 'Selecionar Áudio Correto'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Áudios Falsos:</Text>
      {audioToGuessContent.falseAudioUrls.map((url, index) => (
        <TouchableOpacity
          key={index}
          style={styles.imageButton}
          onPress={() => pickAudio((newUrl) => {
            const newUrls = [...audioToGuessContent.falseAudioUrls];
            newUrls[index] = newUrl;
            setAudioToGuessContent({...audioToGuessContent, falseAudioUrls: newUrls as [string, string, string]});
          })}
        >
          <Text style={styles.imageButtonText}>
            {url ? `Alterar Áudio Falso ${index + 1}` : `Selecionar Áudio Falso ${index + 1}`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderContentEditor = () => {
    switch (grainType) {
      case 'textToComplete':
        return renderTextToCompleteEditor();
      case 'testQuestion':
        return renderTestQuestionEditor();
      case 'imagesToGuess':
        return renderImagesToGuessEditor();
      case 'textToGuess':
        return renderTextToGuessEditor();
      case 'pairsOfText':
        return renderPairsOfTextEditor();
      case 'pairsOfImage':
        return renderPairsOfImageEditor();
      case 'audioToGuess':
        return renderAudioToGuessEditor();
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando grain...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Posição:</Text>
        <TextInput
          style={styles.input}
          value={position.toString()}
          onChangeText={(text) => setPosition(parseInt(text) || 1)}
          placeholder="Posição do grain"
          keyboardType="numeric"
        />

        {renderGrainTypeSelector()}
        {renderContentEditor()}

        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.disabledButton]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.buttonText}>
            {isSaving ? 'Guardando...' : 'Guardar Grain'}
          </Text>
        </TouchableOpacity>

        {grainId && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.buttonText}>Eliminar Grain</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  form: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    margin: SPACING.base,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.base,
  },
  section: {
    marginBottom: SPACING['2xl'],
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  description: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text.secondary,
    marginBottom: SPACING.md,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm,
  },
  label: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.base,
    marginBottom: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    ...SHADOWS.sm,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
  picker: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.base,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    ...SHADOWS.sm,
  },
  typeButtonsContainer: {
    flexDirection: 'column',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  typeButton: {
    backgroundColor: COLORS.gray50,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedTypeButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  selectedTypeButtonText: {
    color: COLORS.white,
  },
  imageButton: {
    backgroundColor: COLORS.gray50,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  imageButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  pairContainer: {
    marginBottom: SPACING.base,
    padding: SPACING.md,
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.base,
  },
  pairLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  addPairButton: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  addPairButtonText: {
    color: COLORS.white,
    fontWeight: '500',
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center',
    marginTop: SPACING.base,
    ...SHADOWS.base,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.base,
  },
  buttonText: {
    ...TYPOGRAPHY.label,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Enforcement styles
  enforcementWarning: {
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warning,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  enforcementWarningText: {
    color: COLORS.warningDark,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: '500',
  },
  disabledPicker: {
    opacity: 0.6,
    backgroundColor: COLORS.gray50,
  },
  disabledTypeButton: {
    opacity: 0.4,
    backgroundColor: COLORS.gray50,
  },
  disabledTypeButtonText: {
    color: COLORS.text.disabled,
  },
});

export default GrainEditScreen;