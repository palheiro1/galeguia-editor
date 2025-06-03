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
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { supabase } from '../lib/supabase';

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
        correct = answer === currentGrain.content.correctWord;
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
    
    return (
      <View style={styles.grainContainer}>
        <Text style={styles.grainTitle}>Qual imagem representa: {correctWord}?</Text>
        
        <View style={styles.imagesContainer}>
          {images.map((imageUrl, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.imageOption,
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
            <TouchableOpacity
              key={index}
              style={[
                styles.audioOptionButton,
                selectedAnswer === audioUrl && (isCorrect ? styles.correctOption : styles.incorrectOption)
              ]}
              onPress={() => {
                playAudio(audioUrl);
                handleAnswer(audioUrl);
              }}
              disabled={showResult}
            >
              <Text style={styles.audioOptionText}>🔊 Áudio {index + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderPairsGrain = (grain: Grain) => {
    const { pairs } = grain.content;
    const isPairsOfImage = grain.type === 'pairsOfImage';
    
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
        
        <View style={styles.pairsContainer}>
          <View style={styles.pairsColumn}>
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
          
          <View style={styles.pairsColumn}>
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
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6C757D',
  },
  emptyText: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 20,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DEE2E6',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    color: '#6C757D',
  },
  scoreText: {
    fontSize: 16,
    color: '#007BFF',
    fontWeight: '600',
  },
  grainContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  grainTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  phrase: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 20,
    lineHeight: 24,
  },
  question: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 20,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  optionText: {
    fontSize: 16,
    color: '#495057',
    textAlign: 'center',
  },
  correctOption: {
    backgroundColor: '#D4EDDA',
    borderColor: '#28A745',
  },
  incorrectOption: {
    backgroundColor: '#F8D7DA',
    borderColor: '#DC3545',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  imageOption: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    overflow: 'hidden',
  },
  optionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mainImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 20,
    resizeMode: 'cover',
  },
  audioOptionButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
    alignItems: 'center',
  },
  audioOptionText: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '500',
  },
  pairsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  pairsColumn: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
    textAlign: 'center',
  },
  pairItem: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPairItem: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFC107',
  },
  matchedPairItem: {
    backgroundColor: '#D4EDDA',
    borderColor: '#28A745',
  },
  pairText: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
  },
  pairImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    resizeMode: 'cover',
  },
  resultContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  correctResult: {
    backgroundColor: '#D4EDDA',
    borderColor: '#28A745',
    borderWidth: 1,
  },
  incorrectResult: {
    backgroundColor: '#F8D7DA',
    borderColor: '#DC3545',
    borderWidth: 1,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  correctAnswerText: {
    fontSize: 14,
    color: '#6C757D',
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
  },
  nextButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  finishButton: {
    backgroundColor: '#6C757D',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PageTestScreen;
