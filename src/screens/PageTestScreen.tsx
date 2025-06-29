import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS } from '../styles/designSystem';
import { Card, Button, Badge, IconButton } from '../components/UIComponents';

// Types
type GrainType = 'textToComplete' | 'testQuestion' | 'imagesToGuess' | 'textToGuess' | 'audioToGuess' | 'pairsOfText' | 'pairsOfImage';

interface PairItem {
  id: string;
  content: string;
  index: number;
  isImage: boolean;
}

interface Grain {
  id: string;
  position: number;
  type: GrainType;
  content: any;
}

type RootStackParamList = {
  PageTest: { pageId: string; pageTitle?: string };
  PageEdit: { lessonId: string; pageId?: string | null; refresh?: boolean };
};

type PageTestScreenRouteParams = {
  pageId: string;
  pageTitle?: string;
};

const PageTestScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: PageTestScreenRouteParams }, 'params'>>();
  const { pageId, pageTitle } = route.params || {};

  const [grains, setGrains] = useState<Grain[]>([]);
  const [currentGrainIndex, setCurrentGrainIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [selectedPairItem, setSelectedPairItem] = useState<string | null>(null);
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    loadGrains();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [pageId]);

  const loadGrains = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('grains')
        .select('*')
        .eq('page_id', pageId)
        .order('position', { ascending: true });

      if (error) throw error;
      setGrains(data || []);
    } catch (error) {
      console.error('Error loading grains:', error);
      Alert.alert('Erro', 'Falha ao carregar grains da página');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (audioUrl: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUrl });
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Erro', 'Não foi possível reproduzir o áudio');
    }
  };

  const handleAnswer = (answer: string) => {
    const currentGrain = grains[currentGrainIndex];
    if (!currentGrain) return;

    let correct = false;
    
    switch (currentGrain.type) {
      case 'textToComplete':
      case 'testQuestion':
      case 'textToGuess':
        correct = answer === currentGrain.content.correctAnswer;
        break;
      case 'imagesToGuess':
        correct = answer === currentGrain.content.correctImageUrl;
        break;
      case 'audioToGuess':
        correct = answer === currentGrain.content.correctAudioUrl;
        break;
    }

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setShowResult(true);
    setTotalAnswered(prev => prev + 1);
    
    if (correct) {
      setScore(prev => prev + 1);
    }
  };

  const handlePairMatch = (item: string) => {
    const currentGrain = grains[currentGrainIndex];
    if (!currentGrain || currentGrain.type !== 'pairsOfText' && currentGrain.type !== 'pairsOfImage') return;

    if (!selectedPairItem) {
      setSelectedPairItem(item);
      return;
    }

    // Check if it's a valid pair
    const pairs = currentGrain.content.pairs;
    let isValidPair = false;
    
    for (const pair of pairs) {
      if (currentGrain.type === 'pairsOfText') {
        if ((pair.left === selectedPairItem && pair.right === item) ||
            (pair.right === selectedPairItem && pair.left === item)) {
          isValidPair = true;
          break;
        }
      } else {
        if ((pair.imageUrl === selectedPairItem && pair.text === item) ||
            (pair.text === selectedPairItem && pair.imageUrl === item)) {
          isValidPair = true;
          break;
        }
      }
    }

    if (isValidPair) {
      setMatchedPairs(prev => [...prev, selectedPairItem, item]);
      setScore(prev => prev + 1);
    }

    setSelectedPairItem(null);

    // Check if all pairs are matched
    if (matchedPairs.length + 2 >= pairs.length * 2) {
      setShowResult(true);
      setIsCorrect(true);
      setTotalAnswered(prev => prev + 1);
    }
  };

  const nextGrain = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(false);
    setMatchedPairs([]);
    setSelectedPairItem(null);
    
    if (currentGrainIndex < grains.length - 1) {
      setCurrentGrainIndex(prev => prev + 1);
    } else {
      // Completed all grains
      Alert.alert(
        'Teste Concluído!',
        `Pontuação: ${score}/${totalAnswered}\nPercentagem: ${Math.round((score / totalAnswered) * 100)}%`,
        [
          { text: 'Voltar ao Editor', onPress: () => navigation.goBack() }
        ]
      );
    }
  };

  const finishTest = () => {
    Alert.alert(
      'Finalizar Teste',
      'Tem a certeza que deseja finalizar o teste?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Finalizar', 
          onPress: () => {
            Alert.alert(
              'Teste Finalizado!',
              `Pontuação: ${score}/${totalAnswered}\nPercentagem: ${totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0}%`,
              [
                { text: 'Voltar ao Editor', onPress: () => navigation.goBack() }
              ]
            );
          }
        }
      ]
    );
  };

  const renderTextToCompleteGrain = (grain: Grain) => {
    const { phrase, correctAnswer, falseAlternatives } = grain.content;
    const options = [correctAnswer, ...falseAlternatives].sort(() => Math.random() - 0.5);
    
    return (
      <View style={styles.grainContainer}>
        <Text style={styles.grainTitle}>Complete a frase:</Text>
        <Text style={styles.phrase}>
          {phrase.replace('[BLANK]', '_____')}
        </Text>
        
        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === option && (isCorrect ? styles.correctOption : styles.incorrectOption)
              ]}
              onPress={() => handleAnswer(option)}
              disabled={showResult}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderTestQuestionGrain = (grain: Grain) => {
    const { question, correctAnswer, falseAlternatives } = grain.content;
    const options = [correctAnswer, ...falseAlternatives].sort(() => Math.random() - 0.5);
    
    return (
      <View style={styles.grainContainer}>
        <Text style={styles.grainTitle}>Pergunta:</Text>
        <Text style={styles.question}>{question}</Text>
        
        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === option && (isCorrect ? styles.correctOption : styles.incorrectOption)
              ]}
              onPress={() => handleAnswer(option)}
              disabled={showResult}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderImagesToGuessGrain = (grain: Grain) => {
    const { correctImageUrl, falseImageUrls, correctWord } = grain.content;
    const images = [correctImageUrl, ...falseImageUrls].sort(() => Math.random() - 0.5);
    const isLandscape = screenDimensions.width > screenDimensions.height;
    const isTablet = screenDimensions.width > 768;
    
    return (
      <View style={styles.grainContainer}>
        <Text style={styles.grainTitle}>Qual imagem representa: {correctWord}?</Text>
        
        <View style={[
          styles.imagesContainer,
          isLandscape && isTablet && styles.imagesContainerLandscape
        ]}>
          {images.map((imageUrl, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.imageOption,
                isLandscape && isTablet ? styles.imageOptionLandscape : styles.imageOptionPortrait,
                selectedAnswer === imageUrl && (isCorrect ? styles.correctOption : styles.incorrectOption)
              ]}
              onPress={() => handleAnswer(imageUrl)}
              disabled={showResult}
            >
              <Image source={{ uri: imageUrl }} style={styles.optionImage} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderTextToGuessGrain = (grain: Grain) => {
    const { imageUrl, correctAnswer, falseAlternatives } = grain.content;
    const options = [correctAnswer, ...falseAlternatives].sort(() => Math.random() - 0.5);
    
    return (
      <View style={styles.grainContainer}>
        <Text style={styles.grainTitle}>O que vê na imagem?</Text>
        
        <Image source={{ uri: imageUrl }} style={styles.mainImage} />
        
        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === option && (isCorrect ? styles.correctOption : styles.incorrectOption)
              ]}
              onPress={() => handleAnswer(option)}
              disabled={showResult}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderAudioToGuessGrain = (grain: Grain) => {
    const { correctWord, correctAudioUrl, falseAudioUrls } = grain.content;
    const audioOptions = [correctAudioUrl, ...falseAudioUrls].sort(() => Math.random() - 0.5);

    return (
      <View style={styles.grainContainer}>
        <Text style={styles.grainTitle}>Qual áudio corresponde a: {correctWord}?</Text>

        <View style={styles.optionsContainer}>
          {audioOptions.map((audioUrl, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <TouchableOpacity
                style={styles.audioPlayButton}
                onPress={() => playAudio(audioUrl)}
                disabled={showResult}
                accessibilityLabel={`Reproduzir áudio ${index + 1}`}
              >
                <Text style={styles.audioPlayButtonText}>▶️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.audioOptionButton,
                  selectedAnswer === audioUrl && (isCorrect ? styles.correctOption : styles.incorrectOption)
                ]}
                onPress={() => handleAnswer(audioUrl)}
                disabled={showResult}
                accessibilityLabel={`Selecionar áudio ${index + 1}`}
              >
                <Text style={styles.audioOptionText}>Áudio {index + 1}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPairsGrain = (grain: Grain) => {
    const { pairs } = grain.content;
    const isPairsOfImage = grain.type === 'pairsOfImage';
    const isLandscape = screenDimensions.width > screenDimensions.height;
    const isTablet = screenDimensions.width > 768;
    
    // Create shuffled items for matching
    const leftItems: PairItem[] = pairs.map((pair: any, index: number) => ({
      id: isPairsOfImage ? pair.imageUrl : pair.left,
      content: isPairsOfImage ? pair.imageUrl : pair.left,
      index,
      isImage: isPairsOfImage
    }));
    
    const rightItems: PairItem[] = pairs.map((pair: any, index: number) => ({
      id: pair.text || pair.right,
      content: pair.text || pair.right,
      index,
      isImage: false
    }));
    
    return (
      <View style={styles.grainContainer}>
        <Text style={styles.grainTitle}>Associe os pares:</Text>
        
        <View style={[
          styles.pairsContainer,
          !isLandscape && styles.pairsContainerVertical
        ]}>
          <View style={[
            styles.pairsColumn,
            !isLandscape && styles.pairsColumnVertical
          ]}>
            <Text style={styles.columnTitle}>Lado A</Text>
            {leftItems.map((item: PairItem, index: number) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pairItem,
                  selectedPairItem === item.id && styles.selectedPairItem,
                  matchedPairs.includes(item.id) && styles.matchedPairItem
                ]}
                onPress={() => !matchedPairs.includes(item.id) && handlePairMatch(item.id)}
                disabled={matchedPairs.includes(item.id)}
              >
                {item.isImage ? (
                  <Image source={{ uri: item.content }} style={styles.pairImage} />
                ) : (
                  <Text style={styles.pairText}>{item.content}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={[
            styles.pairsColumn,
            !isLandscape && styles.pairsColumnVertical
          ]}>
            <Text style={styles.columnTitle}>Lado B</Text>
            {rightItems.map((item: PairItem, index: number) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pairItem,
                  selectedPairItem === item.id && styles.selectedPairItem,
                  matchedPairs.includes(item.id) && styles.matchedPairItem
                ]}
                onPress={() => !matchedPairs.includes(item.id) && handlePairMatch(item.id)}
                disabled={matchedPairs.includes(item.id)}
              >
                <Text style={styles.pairText}>{item.content}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderCurrentGrain = () => {
    const currentGrain = grains[currentGrainIndex];
    if (!currentGrain) return null;

    switch (currentGrain.type) {
      case 'textToComplete':
        return renderTextToCompleteGrain(currentGrain);
      case 'testQuestion':
        return renderTestQuestionGrain(currentGrain);
      case 'imagesToGuess':
        return renderImagesToGuessGrain(currentGrain);
      case 'textToGuess':
        return renderTextToGuessGrain(currentGrain);
      case 'audioToGuess':
        return renderAudioToGuessGrain(currentGrain);
      case 'pairsOfText':
      case 'pairsOfImage':
        return renderPairsGrain(currentGrain);
      default:
        return <Text>Tipo de grain não suportado: {currentGrain.type}</Text>;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Carregando página de teste...</Text>
      </View>
    );
  }

  if (grains.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Nenhum grain encontrado para esta página.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar ao Editor</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>{pageTitle || 'Teste da Página'}</Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Grain {currentGrainIndex + 1} de {grains.length}
          </Text>
          <Text style={styles.scoreText}>
            Pontuação: {score}/{totalAnswered}
          </Text>
        </View>
      </View>

      {/* Current Grain */}
      {renderCurrentGrain()}

      {/* Result feedback */}
      {showResult && (
        <View style={[styles.resultContainer, isCorrect ? styles.correctResult : styles.incorrectResult]}>
          <Text style={styles.resultText}>
            {isCorrect ? '✅ Correto!' : '❌ Incorreto!'}
          </Text>
          {!isCorrect && grains[currentGrainIndex] && (
            <Text style={styles.correctAnswerText}>
              Resposta correta: {
                grains[currentGrainIndex].type === 'imagesToGuess' 
                  ? grains[currentGrainIndex].content.correctWord
                  : grains[currentGrainIndex].content.correctAnswer
              }
            </Text>
          )}
        </View>
      )}

      {/* Navigation buttons */}
      <View style={styles.buttonContainer}>
        {showResult || grains[currentGrainIndex]?.type === 'pairsOfText' || grains[currentGrainIndex]?.type === 'pairsOfImage' ? (
          <TouchableOpacity style={styles.nextButton} onPress={nextGrain}>
            <Text style={styles.nextButtonText}>
              {currentGrainIndex < grains.length - 1 ? 'Próximo Grain' : 'Finalizar Teste'}
            </Text>
          </TouchableOpacity>
        ) : null}
        
        <TouchableOpacity style={styles.finishButton} onPress={finishTest}>
          <Text style={styles.finishButtonText}>Finalizar Teste</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  audioPlayButton: {
    backgroundColor: COLORS.blue100,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.base,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.blue300,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    minWidth: 44,
    minHeight: 44,
  },
  audioPlayButtonText: {
    fontSize: 22,
    color: COLORS.blue600,
    fontWeight: 'bold',
    textAlign: 'center',
  },
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
    marginTop: SPACING.sm,
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  header: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  pageTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  progressText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    fontSize: Math.min(TYPOGRAPHY.fontSize.base, 16),
  },
  scoreText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: Math.min(TYPOGRAPHY.fontSize.base, 16),
  },
  grainContainer: {
    backgroundColor: COLORS.surface,
    margin: SPACING.base,
    marginHorizontal: Platform.OS === 'web' ? SPACING.lg : SPACING.base,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.base,
    maxWidth: Platform.OS === 'web' ? 1200 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  grainTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    marginBottom: SPACING.base,
    textAlign: 'center',
    fontSize: Math.max(TYPOGRAPHY.fontSize.lg, 18),
  },
  phrase: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.base,
    textAlign: 'center',
    fontSize: Math.max(TYPOGRAPHY.fontSize.base, 16),
  },
  question: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    marginBottom: SPACING.lg,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.base,
    textAlign: 'center',
    fontSize: Math.max(TYPOGRAPHY.fontSize.base, 16),
  },
  optionsContainer: {
    gap: SPACING.md,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  optionButton: {
    backgroundColor: COLORS.gray50,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 48, // Better touch target
  },
  optionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    textAlign: 'center',
    fontSize: Math.max(TYPOGRAPHY.fontSize.base, 16),
  },
  correctOption: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.success,
  },
  incorrectOption: {
    backgroundColor: COLORS.errorLight,
    borderColor: COLORS.error,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
    maxWidth: 800,
    alignSelf: 'center',
  },
  imagesContainerLandscape: {
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  imageOption: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    minWidth: 140,
    maxWidth: 200,
  },
  imageOptionPortrait: {
    width: '48%',
    minWidth: 140,
    maxWidth: 180,
  },
  imageOptionLandscape: {
    width: '23%',
    minWidth: 160,
    maxWidth: 180,
  },
  optionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mainImage: {
    width: '100%',
    height: Math.min(Dimensions.get('window').width * 0.6, 300),
    maxHeight: 300,
    borderRadius: BORDER_RADIUS.base,
    marginBottom: SPACING.lg,
    resizeMode: 'cover',
    alignSelf: 'center',
    maxWidth: 500,
  },
  audioOptionButton: {
    backgroundColor: COLORS.blue50,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.blue500,
    alignItems: 'center',
    minHeight: 48, // Better touch target
  },
  audioOptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.blue600,
    fontWeight: '500',
    fontSize: Math.max(TYPOGRAPHY.fontSize.base, 16),
  },
  pairsContainer: {
    flexDirection: 'row',
    gap: SPACING.base,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  pairsContainerVertical: {
    flexDirection: 'column',
    gap: SPACING.lg,
  },
  pairsColumn: {
    flex: 1,
    minWidth: 0, // Allow text to wrap properly
  },
  pairsColumnVertical: {
    flex: 0,
    width: '100%',
  },
  columnTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
    fontSize: Math.max(TYPOGRAPHY.fontSize.base, 16),
  },
  pairItem: {
    backgroundColor: COLORS.gray50,
    padding: SPACING.md,
    marginBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPairItem: {
    backgroundColor: COLORS.warningLight,
    borderColor: COLORS.warning,
  },
  matchedPairItem: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.success,
  },
  pairText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text.primary,
    textAlign: 'center',
    fontSize: Math.max(TYPOGRAPHY.fontSize.sm, 14),
  },
  pairImage: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    resizeMode: 'cover',
  },
  resultContainer: {
    margin: SPACING.base,
    marginHorizontal: Platform.OS === 'web' ? SPACING.lg : SPACING.base,
    padding: SPACING.base,
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center',
    maxWidth: Platform.OS === 'web' ? 1200 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  correctResult: {
    backgroundColor: COLORS.successLight,
    borderColor: COLORS.success,
    borderWidth: 1,
  },
  incorrectResult: {
    backgroundColor: COLORS.errorLight,
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  resultText: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.xs,
    fontSize: Math.max(TYPOGRAPHY.fontSize.lg, 18),
  },
  correctAnswerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.text.secondary,
    textAlign: 'center',
    fontSize: Math.max(TYPOGRAPHY.fontSize.sm, 14),
  },
  buttonContainer: {
    padding: SPACING.base,
    paddingHorizontal: Platform.OS === 'web' ? SPACING.lg : SPACING.base,
    gap: SPACING.md,
    maxWidth: Platform.OS === 'web' ? 1200 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center',
    ...SHADOWS.base,
    minHeight: 48, // Better touch target
  },
  nextButtonText: {
    ...TYPOGRAPHY.label,
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: Math.max(TYPOGRAPHY.fontSize.base, 16),
  },
  finishButton: {
    backgroundColor: COLORS.gray600,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center',
    ...SHADOWS.base,
    minHeight: 48, // Better touch target
  },
  finishButtonText: {
    ...TYPOGRAPHY.label,
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: Math.max(TYPOGRAPHY.fontSize.base, 16),
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center',
    ...SHADOWS.base,
    minHeight: 48, // Better touch target
  },
  backButtonText: {
    ...TYPOGRAPHY.label,
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: Math.max(TYPOGRAPHY.fontSize.base, 16),
  },
});

export default PageTestScreen;
