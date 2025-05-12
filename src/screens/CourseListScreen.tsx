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
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

type Course = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  published: boolean;
  created_at: string;
};

export default function CourseListScreen({ navigation }: any) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { profile } = useAuth();

  const fetchCourses = async () => {
    if (!profile) {
      console.log("fetchCourses ignorado: perfil ainda não carregado.");
      return;
    }

    try {
      setLoading(true);
      console.log(`A obter cursos para o papel: ${profile.role}`);

      let query = supabase.from('courses').select('*');

      if (profile.role !== 'admin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log(`A obter cursos para creator_id: ${user.id}`);
          query = query.eq('creator_id', user.id);
        } else {
          console.warn("Perfil existe mas utilizador é nulo, impossível obter cursos.");
          setCourses([]);
          setLoading(false);
          return;
        }
      } else {
        console.log("A obter todos os cursos como admin.");
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao obter cursos do Supabase:', error);
        throw error;
      }

      if (data) {
        console.log(`Obtidos ${data.length} cursos.`);
        setCourses(data as Course[]);
      } else {
        console.log("Nenhum curso encontrado para o filtro atual.");
        setCourses([]);
      }
    } catch (error) {
      console.error('Erro ao obter cursos:', error);
      Alert.alert('Erro', `Falha ao carregar cursos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      console.log("CourseListScreen focado, a obter cursos...");
      fetchCourses();
    }, [profile])
  );

  const deleteCourse = async (id: string) => {
    console.log(`Botão de eliminar premido para o curso ID: ${id}`);

    const confirmMessage = 'Tens a certeza que queres eliminar este curso? Isto também eliminará todos os módulos e lições associadas e não pode ser desfeito.';

    const performDelete = async () => {
      console.log(`Eliminação confirmada para o curso ID: ${id}`);
      try {
        setLoading(true);
        const { error } = await supabase.from('courses').delete().eq('id', id);

        if (error) {
          console.error('Erro ao eliminar no Supabase:', error);
          throw error;
        }

        Alert.alert('Sucesso', 'Curso eliminado com sucesso');
      } catch (error) {
        console.error('Erro durante a eliminação do curso:', error);
        Alert.alert(
          'Erro',
          `Falha ao eliminar curso: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Verifica a consola e políticas RLS.`
        );
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        await performDelete();
      } else {
        console.log(`Eliminação cancelada para o curso ID: ${id}`);
      }
    } else {
      Alert.alert(
        'Confirmar Eliminação',
        confirmMessage,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => console.log(`Eliminação cancelada para o curso ID: ${id}`) },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: performDelete
          }
        ]
      );
    }
  };

  const createNewCourse = () => {
    navigation.navigate('CourseEdit', { courseId: null });
  };

  const editCourse = (courseId: string) => {
    navigation.navigate('CourseEdit', { courseId });
  };

  const renderCourseItem = ({ item }: { item: Course }) => (
    <View style={styles.courseItem}>
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle}>{item.title}</Text>
        <Text style={styles.courseDescription} numberOfLines={2}>
          {item.description || 'Sem descrição'}
        </Text>

        <View style={styles.statusContainer}>
          <Text style={item.published ? styles.publishedBadge : styles.draftBadge}>
            {item.published ? 'Publicado' : 'Rascunho'}
          </Text>
        </View>
      </View>

      <View style={styles.courseActions}>
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => editCourse(item.id)}
        >
          <Text style={styles.buttonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={() => deleteCourse(item.id)}
        >
          <Text style={styles.buttonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus Cursos</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={createNewCourse}
        >
          <Text style={styles.createButtonText}>+ Criar Curso</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {profile ? "Ainda não tens cursos. Clica em 'Criar Curso' para começares." : "A carregar perfil..."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderCourseItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          extraData={loading || courses.length}
        />
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Updated background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF', // White header background
    borderBottomWidth: 1,
    borderBottomColor: '#DEE2E6', // Lighter border
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600', // Bolder
    color: '#212529', // Darker text
  },
  createButton: {
    backgroundColor: '#007BFF', // Primary blue
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8, // More rounded
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '500', // Medium weight
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6C757D', // Softer gray
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  courseItem: {
    backgroundColor: '#fff',
    borderRadius: 12, // More rounded
    marginBottom: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, // Softer shadow
        shadowRadius: 6,
      },
      android: {
        elevation: 3, // Slightly more elevation
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)', // Softer shadow for web
      }
    }),
  },
  courseInfo: {
    marginBottom: 16,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 6,
  },
  courseDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 12,
    lineHeight: 20,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  publishedBadge: {
    fontSize: 12,
    color: '#28A745', // Success green text
    backgroundColor: '#D4EDDA', // Light success green background
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16, // Pill shape
    overflow: 'hidden',
    fontWeight: '500',
  },
  draftBadge: {
    fontSize: 12,
    color: '#FFC107', // Warning yellow text
    backgroundColor: '#FFF3CD', // Light warning yellow background
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16, // Pill shape
    overflow: 'hidden',
    fontWeight: '500',
  },
  courseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  editButton: {
    backgroundColor: '#007BFF', // Primary blue
  },
  deleteButton: {
    backgroundColor: '#DC3545', // Danger red
  },
});