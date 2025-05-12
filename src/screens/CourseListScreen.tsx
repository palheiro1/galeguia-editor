import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const COLORS = {
  primary: '#6366f1',
  secondary: '#4f46e5',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  published: boolean;
  created_at: string;
  creator_id: string;
  creator_username?: string;
};

export default function CourseListScreen({ navigation }: any) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { profile } = useAuth();

  const fetchCourses = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      let query = supabase.from('courses').select('*');

      if (profile.role !== 'admin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq('creator_id', user.id);
        } else {
          setCourses([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        if (profile.role === 'admin') {
          const coursesWithUsernames = await Promise.all(
            data.map(async (course: any) => {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('username')
                .eq('user_id', course.creator_id)
                .maybeSingle();
              return {
                ...course,
                creator_username: profileData?.username || 'Desconhecido'
              };
            })
          );
          setCourses(coursesWithUsernames);
        } else {
          setCourses(data);
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar cursos.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchCourses();
    }, [profile])
  );

  const deleteCourse = async (id: string) => {
    const confirmMessage = 'Eliminar este curso? Isso não pode ser desfeito.';
    const performDelete = async () => {
      try {
        setLoading(true);
        await supabase.from('courses').delete().eq('id', id);
        Alert.alert('Sucesso', 'Curso eliminado');
        fetchCourses();
      } catch {
        Alert.alert('Erro', 'Erro ao eliminar curso');
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

  const createNewCourse = () => navigation.navigate('CourseEdit', { courseId: null });
  const editCourse = (courseId: string) => navigation.navigate('CourseEdit', { courseId });

  const renderCourseItem = ({ item }: { item: Course }) => (
    <View style={styles.courseCard}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.statusBadge, item.published ? styles.publishedBadge : styles.draftBadge]}>
            <MaterialIcons name={item.published ? 'public' : 'drafts'} size={14} color={item.published ? COLORS.success : COLORS.warning} />
            <Text style={styles.statusText}>{item.published ? 'Publicado' : 'Rascunho'}</Text>
          </View>
        </View>
        {item.description && <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>}
        {profile?.role === 'admin' && item.creator_username && (
          <View style={styles.authorContainer}>
            <MaterialIcons name="person" size={14} color={COLORS.textSecondary} />
            <Text style={styles.authorText}>{item.creator_username}</Text>
          </View>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.createdDate}>Criado em: {new Date(item.created_at).toLocaleDateString()}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.iconButton, styles.editButton]} onPress={() => editCourse(item.id)}>
              <MaterialIcons name="edit" size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, styles.deleteButton]} onPress={() => deleteCourse(item.id)}>
              <MaterialIcons name="delete" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={styles.headerTitle}>Meus Cursos</Text>
        <TouchableOpacity style={styles.createButton} onPress={createNewCourse}>
          <MaterialIcons name="add" size={24} color="white" />
          <Text style={styles.createButtonText}>Novo Curso</Text>
        </TouchableOpacity>
      </LinearGradient>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : courses.length === 0 ? (
        <Text style={{ textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 }}>Ainda não há cursos.</Text>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourseItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchCourses} colors={[COLORS.primary]} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingVertical: Platform.OS === 'web' ? 24 : 20,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  courseCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  publishedBadge: {
    backgroundColor: '#dcfce7',
  },
  draftBadge: {
    backgroundColor: '#fef9c3',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  authorText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  createdDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: COLORS.danger,
  },
  list: {
    paddingBottom: 40,
  },
});
