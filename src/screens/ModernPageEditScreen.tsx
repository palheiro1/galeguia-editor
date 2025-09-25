import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, BORDER_RADIUS } from '../styles/designSystem';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import ModernSidebar from '../components/ModernSidebar';

// Types
type PageEditScreenRouteParams = {
  lessonId: string;
  courseId: string;
  pageId?: string;
  refresh?: boolean;
};

type Grain = {
  id: string;
  page_id: string;
  position: number;
  type: string;
  content: any;
  created_at: string;
  updated_at: string;
};

type PageType = 'Introduction' | 'Booster' | 'Comparation' | 'Review' | 'Custom';

const PAGE_TYPE_PATTERNS: Record<Exclude<PageType, 'Custom'>, string[]> = {
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
  ],
};

const GRAIN_TYPE_LABELS: Record<string, string> = {
  textToComplete: 'Texto para Completar',
  testQuestion: 'Pergunta de Teste',
  imagesToGuess: 'Imagens para Adivinhar',
  textToGuess: 'Texto para Adivinhar',
  audioToGuess: 'Áudio para Adivinhar',
  pairsOfText: 'Pares de Texto',
  pairsOfImage: 'Pares de Imagem',
};

const ModernPageEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = useAuth();
  const { lessonId, courseId, pageId } = route.params as PageEditScreenRouteParams;

  // Page data states
  const [title, setTitle] = useState('');
  const [position, setPosition] = useState(1);
  const [pageType, setPageType] = useState<PageType>('Introduction');
  const [customGrainTypes, setCustomGrainTypes] = useState<string[]>(new Array(15).fill('textToComplete'));
  
  // Grains and loading states
  const [grains, setGrains] = useState<Grain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGrains, setIsLoadingGrains] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedGrainSelector, setExpandedGrainSelector] = useState<number | null>(null);

  useEffect(() => {
    initializeData();
  }, [pageId, lessonId]);



  const initializeData = async () => {
    setIsLoading(true);
    try {
      if (pageId) {
        await loadPageData();
        await loadGrains();
      } else {
        await setInitialPosition();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setInitialPosition = async () => {
    const { data, error } = await supabase
      .from('pages')
      .select('position')
      .eq('lesson_id', lessonId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting initial position:', error);
      setPosition(1);
    } else if (data) {
      setPosition(data.position + 1);
    } else {
      setPosition(1);
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
      setPosition(data.position || 0);
      setPageType((data.type as PageType) || 'Introduction');
      
      if (data.type === 'Custom' && data.grain_pattern) {
        setCustomGrainTypes(data.grain_pattern);
      } else {
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

  const handleSavePage = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, insira um título para a página.');
      return;
    }

    setIsSaving(true);
    try {
      const pageData = {
        title: title.trim(),
        lesson_id: lessonId,
        position: position,
        type: pageType,
        grain_pattern: pageType === 'Custom' ? customGrainTypes : PAGE_TYPE_PATTERNS[pageType] || [],
      };

      let savedPageId = pageId;

      if (pageId) {
        // Update existing page
        const { error } = await supabase
          .from('pages')
          .update(pageData)
          .eq('id', pageId);

        if (error) throw error;
      } else {
        // Create new page
        const { data, error } = await supabase
          .from('pages')
          .insert([pageData])
          .select()
          .single();

        if (error) throw error;
        savedPageId = data.id;

        // Create grains based on the pattern
        const grainPattern = pageType === 'Custom' ? customGrainTypes : PAGE_TYPE_PATTERNS[pageType] || [];
        const grainInserts = grainPattern.map((grainType, index) => ({
          page_id: savedPageId,
          position: index + 1,
          type: grainType,
          content: getDefaultGrainContent(grainType),
        }));

        const { error: grainsError } = await supabase
          .from('grains')
          .insert(grainInserts);

        if (grainsError) throw grainsError;
      }

      Alert.alert('Sucesso', 'Página guardada com sucesso!');
      if (!pageId) {
        // Navigate to edit the newly created page
        (navigation as any).replace('PageEdit', { 
          pageId: savedPageId, 
          lessonId, 
          courseId 
        });
      } else {
        await loadGrains(); // Refresh grains
      }
    } catch (error) {
      console.error('Error saving page:', error);
      Alert.alert('Erro', 'Não foi possível guardar a página.');
    } finally {
      setIsSaving(false);
    }
  };

  const getDefaultGrainContent = (grainType: string) => {
    switch (grainType) {
      case 'textToComplete':
        return { text: '', blanks: [] };
      case 'testQuestion':
        return { question: '', options: [], correct: 0 };
      case 'imagesToGuess':
        return { images: [], correct: 0 };
      case 'textToGuess':
        return { text: '', options: [], correct: 0 };
      case 'audioToGuess':
        return { audio_url: '', options: [], correct: 0 };
      case 'pairsOfText':
        return { pairs: [] };
      case 'pairsOfImage':
        return { pairs: [] };
      default:
        return {};
    }
  };

  const handleNavigateToGrainEdit = (grainId: string) => {
    (navigation as any).navigate('GrainEdit', { grainId, pageId });
  };

  const handleCreateGrain = (position: number) => {
    const grainType = pageType === 'Custom' ? customGrainTypes[position - 1] : PAGE_TYPE_PATTERNS[pageType]?.[position - 1];
    (navigation as any).navigate('GrainEdit', { 
      pageId, 
      position, 
      grainType,
      lessonId,
      courseId 
    });
  };

  const handleNavigate = (route: string) => {
    if (route === 'CourseList') {
      (navigation as any).navigate('CourseList');
    } else if (route === 'CourseBuilder') {
      (navigation as any).navigate('CourseBuilder', { courseId });
    }
  };

  const updateCustomGrainType = (index: number, grainType: string) => {
    const newCustomGrainTypes = [...customGrainTypes];
    newCustomGrainTypes[index] = grainType;
    setCustomGrainTypes(newCustomGrainTypes);
  };

  const handlePageTypeChange = (newPageType: PageType) => {
    console.log('Changing page type from', pageType, 'to', newPageType);
    setPageType(newPageType);
    
    // Update grain types based on new page type
    if (newPageType !== 'Custom' && PAGE_TYPE_PATTERNS[newPageType]) {
      setCustomGrainTypes([...PAGE_TYPE_PATTERNS[newPageType]]);
    } else if (newPageType === 'Custom') {
      setCustomGrainTypes(new Array(15).fill('textToComplete'));
    }
    
    // Close any expanded grain selectors
    setExpandedGrainSelector(null);
  };

  const handleBackToCourse = () => {
    (navigation as any).navigate('CourseBuilder', { courseId });
  };

  const renderTopBar = () => (
    <View style={styles.topbar}>
      <View style={styles.topbarInner}>
        <Text style={styles.pageTitle}>
          {pageId ? 'Editar Página' : 'Nova Página'}
        </Text>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.btn} onPress={handleBackToCourse}>
            <MaterialIcons name="arrow-back" size={16} color={COLORS.text} />
            <Text style={styles.btnText}>Voltar ao Curso</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.btnSecondary}
            onPress={() => (navigation as any).navigate('PageTest', { pageId })}
            disabled={!pageId}
          >
            <MaterialIcons name="play-arrow" size={16} color={COLORS.accent} />
            <Text style={styles.btnSecondaryText}>Provar Página</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.btnPrimary, isSaving && styles.btnDisabled]} 
            onPress={handleSavePage}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <MaterialIcons name="save" size={16} color="white" />
            )}
            <Text style={styles.btnPrimaryText}>
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEditorPanel = () => (
    <View style={styles.panel}>
      <ScrollView style={styles.editor}>
        {/* Page Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Título da Página</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Introdução à Página"
          />
        </View>

        {/* Position */}
        <View style={styles.field}>
          <Text style={styles.label}>Posição da Página</Text>
          <TextInput
            style={styles.input}
            value={position.toString()}
            onChangeText={(text) => setPosition(parseInt(text) || 1)}
            placeholder="Ex: 1"
            keyboardType="numeric"
          />
        </View>

        {/* Page Type */}
        <View style={styles.field}>
          <Text style={styles.label}>Tipo de Página</Text>
          <View style={styles.radioGroup}>
            {(['Introduction', 'Booster', 'Comparation', 'Review', 'Custom'] as PageType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.radioOption}
                onPress={() => handlePageTypeChange(type)}
              >
                <View style={[styles.radioButton, pageType === type && styles.radioButtonSelected]}>
                  {pageType === type && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={[styles.radioLabel, pageType === type && styles.radioLabelSelected]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Page Structure */}
        <View style={styles.pageStructureSection}>
          <Text style={styles.blockTitle}>Estrutura da Página (15 Grains)</Text>
          <Text style={styles.structureDescription}>
            {pageType === 'Custom' 
              ? 'Configure o tipo de grain para cada uma das 15 posições (clique para editar):'
              : `Estrutura automática para páginas do tipo "${pageType}":`
            }
          </Text>
          
          {Array.from({ length: 15 }, (_, index) => {
            const position = index + 1;
            const grainType = pageType === 'Custom' 
              ? customGrainTypes[index] 
              : PAGE_TYPE_PATTERNS[pageType]?.[index] || 'textToComplete';
            
            return (
              <View key={position} style={styles.grainStructureRow}>
                <Text style={styles.grainPositionLabel}>{position}.</Text>
                <View style={styles.grainTypeSelectorContainer}>
                  {pageType === 'Custom' ? (
                    <View style={styles.grainCustomSelector}>
                      <TouchableOpacity 
                        style={[styles.grainTypeSelector, styles.grainTypeSelectorEditable]}
                        onPress={() => setExpandedGrainSelector(expandedGrainSelector === index ? null : index)}
                      >
                        <Text style={styles.grainTypeSelectorText}>
                          {GRAIN_TYPE_LABELS[grainType] || grainType}
                        </Text>
                        <MaterialIcons 
                          name={expandedGrainSelector === index ? "expand-less" : "expand-more"} 
                          size={16} 
                          color={COLORS.primary} 
                        />
                      </TouchableOpacity>
                      
                      {expandedGrainSelector === index && (
                        <View style={styles.grainRadioGroup}>
                          {Object.entries(GRAIN_TYPE_LABELS).map(([type, label]) => (
                            <TouchableOpacity
                              key={type}
                              style={styles.grainRadioOption}
                              onPress={() => {
                                updateCustomGrainType(index, type);
                                setExpandedGrainSelector(null);
                              }}
                            >
                              <View style={[styles.grainRadioButton, grainType === type && styles.grainRadioButtonSelected]}>
                                {grainType === type && <View style={styles.grainRadioButtonInner} />}
                              </View>
                              <Text style={[styles.grainRadioLabel, grainType === type && styles.grainRadioLabelSelected]}>
                                {label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={[styles.grainTypeSelector, styles.grainTypeSelectorReadonly]}>
                      <Text style={[styles.grainTypeSelectorText, styles.grainTypeSelectorTextReadonly]}>
                        {GRAIN_TYPE_LABELS[grainType] || grainType}
                      </Text>
                      <MaterialIcons name="lock" size={12} color={COLORS.muted} />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={[styles.btnPrimary, isSaving && styles.btnDisabled]} 
            onPress={handleSavePage}
            disabled={isSaving}
          >
            <MaterialIcons name="save" size={16} color="white" />
            <Text style={styles.btnPrimaryText}>Guardar Página</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.btnSecondary}
            onPress={() => (navigation as any).navigate('PageTest', { pageId })}
            disabled={!pageId}
          >
            <MaterialIcons name="play-arrow" size={16} color={COLORS.accent} />
            <Text style={styles.btnSecondaryText}>Provar Página</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.btnDanger}
            onPress={() => Alert.alert('Confirmar', 'Deseja eliminar esta página?')}
            disabled={!pageId}
          >
            <MaterialIcons name="delete" size={16} color="white" />
            <Text style={styles.btnDangerText}>Eliminar Página</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  const renderGrainsPanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <Text style={styles.panelTitle}>
          Grains da Página ({grains.length}/15)
        </Text>
        <TouchableOpacity 
          style={styles.addGrainButton}
          onPress={() => handleCreateGrain(grains.length + 1)}
          disabled={grains.length >= 15}
        >
          <MaterialIcons name="add" size={16} color={COLORS.accent} />
          <Text style={styles.addGrainButtonText}>Adicionar Grain</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.grainsList}>
        {isLoadingGrains ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          grains.map((grain) => (
            <TouchableOpacity
              key={grain.id}
              style={styles.grainCard}
              onPress={() => handleNavigateToGrainEdit(grain.id)}
            >
              <View style={styles.grainCardContent}>
                <Text style={styles.grainCardType}>
                  {grain.position}. {GRAIN_TYPE_LABELS[grain.type] || grain.type}
                </Text>
                <Text style={styles.grainCardDescription} numberOfLines={2}>
                  {getGrainDescription(grain)}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.grainDeleteButton}
                onPress={() => Alert.alert('Confirmar', 'Deseja eliminar este grain?')}
              >
                <MaterialIcons name="close" size={16} color="white" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  const getGrainDescription = (grain: Grain): string => {
    try {
      const content = typeof grain.content === 'string' ? JSON.parse(grain.content) : grain.content;
      
      switch (grain.type) {
        case 'textToComplete':
          return content.text || 'Sem conteúdo';
        case 'testQuestion':
          return content.question || 'Sem pergunta';
        case 'imagesToGuess':
          return 'Imagens para adivinhar';
        case 'pairsOfText':
          return `${content.pairs?.length || 0} pares de texto`;
        case 'pairsOfImage':
          return `${content.pairs?.length || 0} pares de imagem`;
        default:
          return 'Conteúdo do grain';
      }
    } catch (error) {
      return 'Erro ao carregar conteúdo';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {pageId ? 'Carregando página...' : 'Preparando nova página...'}
        </Text>
      </View>
    );
  }

  const { width } = Dimensions.get('window');
  const isLargeScreen = width >= 1200;

  return (
    <View style={styles.app}>
      <ModernSidebar
        currentRoute="PageEdit"
        onNavigate={handleNavigate}
      />
      
      <View style={styles.main}>
        {renderTopBar()}
        
        <View style={styles.content}>
          <View style={[styles.builder, !isLargeScreen && styles.builderSmall]}>
            {renderEditorPanel()}
            {pageId && renderGrainsPanel()}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  app: {
    flex: 1,
    flexDirection: 'row',
    minHeight: '100vh' as any,
  },
  main: {
    flex: 1,
    flexDirection: 'column',
  },
  topbar: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 10,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  topbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnText: {
    color: COLORS.text,
    fontSize: 14,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnSecondaryText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '500',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...SHADOWS.sm,
  },
  btnPrimaryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  btnDanger: {
    backgroundColor: COLORS.danger,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...SHADOWS.sm,
  },
  btnDangerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 16,
  },
  builder: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  builderSmall: {
    flexDirection: 'column',
  },
  panel: {
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.sm,
    overflow: 'hidden',
    flex: 1,
  },
  panelHead: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  editor: {
    padding: 16,
    flex: 1,
  },
  field: {
    marginBottom: 16,
    gap: 6,
    position: 'relative' as any,
  },
  label: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg2,
    color: COLORS.text,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg2,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  selectText: {
    fontSize: 14,
    color: COLORS.text,
  },
  pageStructureSection: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.lg,
    padding: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
    marginBottom: 16,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  structureDescription: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  grainStructureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  grainPositionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
    minWidth: 30,
    marginRight: 12,
  },
  grainTypeSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.line,
    ...SHADOWS.sm,
  },
  grainTypeSelectorText: {
    fontSize: 12,
    color: COLORS.text,
    flex: 1,
  },
  grainTypeSelectorEditable: {
    borderColor: COLORS.primary + '40',
    backgroundColor: COLORS.primary + '05',
  },
  grainTypeSelectorReadonly: {
    opacity: 0.7,
  },
  grainTypeSelectorTextReadonly: {
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  grainTypeSelectorContainer: {
    flex: 1,
    position: 'relative' as any,
  },

  actionRow: {
    gap: 12,
    marginTop: 16,
  },
  addGrainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  addGrainButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.accent,
  },
  grainsList: {
    padding: 12,
  },
  grainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.bg2,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  grainCardContent: {
    flex: 1,
    gap: 4,
  },
  grainCardType: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  grainCardDescription: {
    fontSize: 12,
    color: COLORS.text,
  },
  grainDeleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    gap: 12,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
  },

  radioGroup: {
    gap: 12,
    paddingVertical: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  radioLabelSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  grainCustomSelector: {
    flex: 1,
  },
  grainRadioGroup: {
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.bg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.line,
    gap: 8,
  },
  grainRadioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  grainRadioButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.line,
    backgroundColor: COLORS.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grainRadioButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  grainRadioButtonInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  grainRadioLabel: {
    fontSize: 12,
    color: COLORS.text,
    flex: 1,
  },
  grainRadioLabelSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default ModernPageEditScreen;