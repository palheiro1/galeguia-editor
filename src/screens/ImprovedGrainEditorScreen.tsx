import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS } from '../styles/designSystem';
import { ValidatedInput } from '../components/ValidatedInput';

interface GrainTypeConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  example: string;
  color: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'image' | 'audio' | 'array';
    placeholder?: string;
    required: boolean;
    maxLength?: number;
    arrayType?: 'text' | 'image' | 'audio';
    arraySize?: number;
  }>;
}

const GRAIN_TYPES: GrainTypeConfig[] = [
  {
    id: 'textToComplete',
    name: 'Completar Texto',
    icon: 'edit',
    description: 'Frase com palavra em falta para completar',
    example: 'O gato subiu ao [BLANK]. (telhado)',
    color: COLORS.primary,
    fields: [
      {
        key: 'phrase',
        label: 'Frase (use [BLANK] para o espaço)',
        type: 'text',
        placeholder: 'O gato subiu ao [BLANK]',
        required: true,
        maxLength: 200,
      },
      {
        key: 'correctAnswer',
        label: 'Resposta Correta',
        type: 'text',
        placeholder: 'telhado',
        required: true,
        maxLength: 50,
      },
      {
        key: 'falseAlternatives',
        label: 'Alternativas Erradas (3)',
        type: 'array',
        arrayType: 'text',
        arraySize: 3,
        required: true,
      },
    ],
  },
  {
    id: 'testQuestion',
    name: 'Pergunta de Teste',
    icon: 'quiz',
    description: 'Pergunta com 4 opções de resposta',
    example: 'Qual é a capital de Portugal? A) Lisboa',
    color: COLORS.secondary,
    fields: [
      {
        key: 'question',
        label: 'Pergunta',
        type: 'text',
        placeholder: 'Qual é a capital de Portugal?',
        required: true,
        maxLength: 200,
      },
      {
        key: 'correctAnswer',
        label: 'Resposta Correta',
        type: 'text',
        placeholder: 'Lisboa',
        required: true,
        maxLength: 100,
      },
      {
        key: 'falseAlternatives',
        label: 'Alternativas Erradas (3)',
        type: 'array',
        arrayType: 'text',
        arraySize: 3,
        required: true,
      },
    ],
  },
  {
    id: 'imagesToGuess',
    name: 'Adivinhar por Imagem',
    icon: 'image',
    description: '4 imagens, escolher a que corresponde à palavra',
    example: 'Palavra: "cão" → mostrar 4 imagens',
    color: COLORS.success,
    fields: [
      {
        key: 'correctWord',
        label: 'Palavra Correta',
        type: 'text',
        placeholder: 'cão',
        required: true,
        maxLength: 50,
      },
      {
        key: 'correctImageUrl',
        label: 'Imagem Correta',
        type: 'image',
        required: true,
      },
      {
        key: 'falseImageUrls',
        label: 'Imagens Erradas (3)',
        type: 'array',
        arrayType: 'image',
        arraySize: 3,
        required: true,
      },
    ],
  },
  {
    id: 'textToGuess',
    name: 'Adivinhar por Texto',
    icon: 'text-fields',
    description: '1 imagem, escolher a palavra correta entre 4',
    example: 'Imagem de cão → escolher "cão" entre 4 palavras',
    color: COLORS.warning,
    fields: [
      {
        key: 'imageUrl',
        label: 'Imagem',
        type: 'image',
        required: true,
      },
      {
        key: 'correctAnswer',
        label: 'Palavra Correta',
        type: 'text',
        placeholder: 'cão',
        required: true,
        maxLength: 50,
      },
      {
        key: 'falseAlternatives',
        label: 'Palavras Erradas (3)',
        type: 'array',
        arrayType: 'text',
        arraySize: 3,
        required: true,
      },
    ],
  },
  {
    id: 'audioToGuess',
    name: 'Adivinhar por Áudio',
    icon: 'volume-up',
    description: '1 palavra, escolher o áudio correto entre 4',
    example: 'Palavra: "cão" → escolher áudio correto',
    color: COLORS.blue500,
    fields: [
      {
        key: 'correctWord',
        label: 'Palavra',
        type: 'text',
        placeholder: 'cão',
        required: true,
        maxLength: 50,
      },
      {
        key: 'correctAudioUrl',
        label: 'Áudio Correto',
        type: 'audio',
        required: true,
      },
      {
        key: 'falseAudioUrls',
        label: 'Áudios Errados (3)',
        type: 'array',
        arrayType: 'audio',
        arraySize: 3,
        required: true,
      },
    ],
  },
  {
    id: 'pairsOfText',
    name: 'Pares de Texto',
    icon: 'swap-horiz',
    description: 'Ligar palavras ou frases relacionadas',
    example: 'Lisboa → Portugal, Madrid → Espanha',
    color: COLORS.error,
    fields: [
      {
        key: 'pairs',
        label: 'Pares de Texto (4-6 pares)',
        type: 'array',
        arrayType: 'text',
        arraySize: 6,
        required: true,
      },
    ],
  },
  {
    id: 'pairsOfImage',
    name: 'Pares de Imagem',
    icon: 'collections',
    description: 'Ligar imagens com textos relacionados',
    example: 'Imagem de cão → palavra "cão"',
    color: COLORS.gray600,
    fields: [
      {
        key: 'pairs',
        label: 'Pares Imagem-Texto (4-6 pares)',
        type: 'array',
        arrayType: 'image',
        arraySize: 6,
        required: true,
      },
    ],
  },
];

const ImprovedGrainEditorScreen = ({ route, navigation }: any) => {
  const { pageId, grainId, position, expectedGrainType, pageType } = route.params || {};
  
  const [selectedGrainType, setSelectedGrainType] = useState<string>(
    expectedGrainType || 'textToComplete'
  );
  const [grainContent, setGrainContent] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(!expectedGrainType);

  const currentGrainConfig = GRAIN_TYPES.find(type => type.id === selectedGrainType);
  const isTypeEnforced = !!expectedGrainType && pageType !== 'Custom';

  useEffect(() => {
    if (grainId) {
      loadGrainData();
    } else {
      initializeDefaultContent();
    }
  }, [selectedGrainType]);

  const loadGrainData = async () => {
    // Implementation to load existing grain data
    setIsLoading(true);
    try {
      // Load from database
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Erro', 'Falha ao carregar dados do exercício');
    }
  };

  const initializeDefaultContent = () => {
    if (!currentGrainConfig) return;
    
    const defaultContent: any = {};
    currentGrainConfig.fields.forEach(field => {
      if (field.type === 'array') {
        if (field.key === 'pairs') {
          defaultContent[field.key] = Array(4).fill(null).map(() => ({
            left: '',
            right: field.arrayType === 'image' ? { imageUrl: '', text: '' } : ''
          }));
        } else {
          defaultContent[field.key] = Array(field.arraySize || 3).fill('');
        }
      } else {
        defaultContent[field.key] = '';
      }
    });
    setGrainContent(defaultContent);
  };

  const renderGrainTypeSelector = () => {
    if (isTypeEnforced) {
      return (
        <View style={styles.enforcedTypeContainer}>
          <MaterialIcons name="lock" size={20} color={COLORS.warning} />
          <Text style={styles.enforcedTypeText}>
            Tipo de exercício fixo para esta página: {currentGrainConfig?.name}
          </Text>
        </View>
      );
    }

    if (!showTypeSelector) {
      return (
        <View style={styles.selectedTypeContainer}>
          <View style={styles.selectedTypeHeader}>
            <MaterialIcons 
              name={currentGrainConfig?.icon as any} 
              size={24} 
              color={currentGrainConfig?.color} 
            />
            <Text style={styles.selectedTypeName}>
              {currentGrainConfig?.name}
            </Text>
            <TouchableOpacity
              style={styles.changeTypeButton}
              onPress={() => setShowTypeSelector(true)}
            >
              <Text style={styles.changeTypeText}>Mudar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.selectedTypeDescription}>
            {currentGrainConfig?.description}
          </Text>
          <Text style={styles.selectedTypeExample}>
            Exemplo: {currentGrainConfig?.example}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.grainTypeSelector}>
        <Text style={styles.sectionTitle}>Escolha o Tipo de Exercício</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {GRAIN_TYPES.map((grainType) => (
            <TouchableOpacity
              key={grainType.id}
              style={[
                styles.grainTypeCard,
                selectedGrainType === grainType.id && styles.selectedGrainTypeCard,
                { borderColor: grainType.color }
              ]}
              onPress={() => {
                setSelectedGrainType(grainType.id);
                setShowTypeSelector(false);
              }}
            >
              <MaterialIcons 
                name={grainType.icon as any} 
                size={32} 
                color={grainType.color} 
              />
              <Text style={[styles.grainTypeName, { color: grainType.color }]}>
                {grainType.name}
              </Text>
              <Text style={styles.grainTypeDescription}>
                {grainType.description}
              </Text>
              <Text style={styles.grainTypeExample}>
                {grainType.example}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderField = (field: any) => {
    switch (field.type) {
      case 'text':
        return (
          <ValidatedInput
            key={field.key}
            label={field.label}
            value={grainContent[field.key] || ''}
            onChangeText={(text: string) => 
              setGrainContent((prev: Record<string, any>) => ({ ...prev, [field.key]: text }))
            }
            placeholder={field.placeholder}
            required={field.required}
            validationRules={field.maxLength ? [{
              rule: (value: string) => value.length <= field.maxLength,
              message: `Máximo de ${field.maxLength} caracteres`
            }] : undefined}
            multiline={field.maxLength && field.maxLength > 100}
            testID={`field-${field.key}`}
          />
        );
      
      case 'array':
        if (field.key === 'pairs') {
          return renderPairsField(field);
        }
        return renderArrayField(field);
      
      case 'image':
        return renderImageField(field);
      
      case 'audio':
        return renderAudioField(field);
      
      default:
        return null;
    }
  };

  const renderArrayField = (field: any) => {
    const values = grainContent[field.key] || [];
    
    return (
      <View key={field.key} style={styles.arrayField}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        {Array(field.arraySize || 3).fill(null).map((_, index) => (
          <ValidatedInput
            key={`${field.key}-${index}`}
            label={`${field.label.split('(')[0]} ${index + 1}`}
            value={values[index] || ''}
            onChangeText={(text: string) => {
              const newValues = [...values];
              newValues[index] = text;
              setGrainContent((prev: Record<string, any>) => ({ ...prev, [field.key]: newValues }));
            }}
            placeholder={`Alternativa ${index + 1}`}
            required={field.required}
            testID={`${field.key}-${index}`}
          />
        ))}
      </View>
    );
  };

  const renderPairsField = (field: any) => {
    const pairs = grainContent[field.key] || [];
    
    return (
      <View key={field.key} style={styles.pairsField}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        {Array(field.arraySize || 4).fill(null).map((_, index) => (
          <View key={`pair-${index}`} style={styles.pairContainer}>
            <Text style={styles.pairLabel}>Par {index + 1}</Text>
            <ValidatedInput
              label="Esquerda"
              value={pairs[index]?.left || ''}
              onChangeText={(text: string) => {
                const newPairs = [...pairs];
                newPairs[index] = { ...newPairs[index], left: text };
                setGrainContent((prev: Record<string, any>) => ({ ...prev, [field.key]: newPairs }));
              }}
              placeholder="Palavra/frase da esquerda"
              testID={`pair-${index}-left`}
            />
            <ValidatedInput
              label="Direita"
              value={pairs[index]?.right || ''}
              onChangeText={(text: string) => {
                const newPairs = [...pairs];
                newPairs[index] = { ...newPairs[index], right: text };
                setGrainContent((prev: Record<string, any>) => ({ ...prev, [field.key]: newPairs }));
              }}
              placeholder="Palavra/frase da direita"
              testID={`pair-${index}-right`}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderImageField = (field: any) => {
    return (
      <View key={field.key} style={styles.mediaField}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <TouchableOpacity style={styles.mediaButton}>
          <MaterialIcons name="image" size={24} color={COLORS.primary} />
          <Text style={styles.mediaButtonText}>Selecionar Imagem</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAudioField = (field: any) => {
    return (
      <View key={field.key} style={styles.mediaField}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        <TouchableOpacity style={styles.mediaButton}>
          <MaterialIcons name="audiotrack" size={24} color={COLORS.primary} />
          <Text style={styles.mediaButtonText}>Selecionar Áudio</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const validateAndSave = async () => {
    if (!currentGrainConfig) return;
    
    // Validate required fields
    const missingFields = currentGrainConfig.fields
      .filter(field => field.required)
      .filter(field => {
        const value = grainContent[field.key];
        if (field.type === 'array') {
          return !value || value.some((item: any) => !item || (typeof item === 'string' && !item.trim()));
        }
        return !value || (typeof value === 'string' && !value.trim());
      });

    if (missingFields.length > 0) {
      Alert.alert(
        'Campos Obrigatórios',
        `Por favor, preencha: ${missingFields.map(f => f.label).join(', ')}`
      );
      return;
    }

    setIsSaving(true);
    try {
      // Save to database
      Alert.alert('Sucesso', 'Exercício salvo com sucesso!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar exercício');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando exercício...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {grainId ? 'Editar' : 'Criar'} Exercício
        </Text>
        <Text style={styles.headerSubtitle}>
          Posição {position} de 15 na página
        </Text>
      </View>

      {renderGrainTypeSelector()}

      {currentGrainConfig && !showTypeSelector && (
        <View style={styles.contentForm}>
          <Text style={styles.sectionTitle}>
            📝 Conteúdo do Exercício
          </Text>
          {currentGrainConfig.fields.map(renderField)}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.disabledButton]}
          onPress={validateAndSave}
          disabled={isSaving || showTypeSelector}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>
              {grainId ? 'Atualizar' : 'Criar'} Exercício
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray600,
    marginTop: SPACING.md,
  },
  header: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.gray900,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray600,
    marginTop: SPACING.xs,
  },
  enforcedTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    padding: SPACING.md,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 1,
    borderColor: COLORS.warning + '40',
  },
  enforcedTypeText: {
    ...TYPOGRAPHY.body,
    color: COLORS.warning,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  selectedTypeContainer: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  selectedTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  selectedTypeName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.gray900,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  changeTypeButton: {
    backgroundColor: COLORS.gray200,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.base,
  },
  changeTypeText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.gray700,
  },
  selectedTypeDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray600,
    marginBottom: SPACING.sm,
  },
  selectedTypeExample: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.gray500,
    fontStyle: 'italic',
  },
  grainTypeSelector: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.gray900,
    marginBottom: SPACING.md,
  },
  grainTypeCard: {
    width: 200,
    backgroundColor: COLORS.gray50,
    padding: SPACING.md,
    marginRight: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 2,
    alignItems: 'center',
  },
  selectedGrainTypeCard: {
    backgroundColor: COLORS.white,
    borderWidth: 3,
  },
  grainTypeName: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  grainTypeDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.gray600,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  grainTypeExample: {
    ...TYPOGRAPHY.caption,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  contentForm: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  fieldLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
    color: COLORS.gray800,
    marginBottom: SPACING.sm,
  },
  arrayField: {
    marginBottom: SPACING.lg,
  },
  pairsField: {
    marginBottom: SPACING.lg,
  },
  pairContainer: {
    backgroundColor: COLORS.gray50,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
    marginBottom: SPACING.md,
  },
  pairLabel: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: SPACING.sm,
  },
  mediaField: {
    marginBottom: SPACING.lg,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
    borderStyle: 'dashed',
  },
  mediaButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.gray200,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.gray700,
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center',
  },
  saveButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.white,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: COLORS.gray400,
  },
});

export default ImprovedGrainEditorScreen;