import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform, // Import Platform
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect

// Define the Course type based on our database schema
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

  // Fetch courses based on user role
  const fetchCourses = async () => {
    // Guard: Don't fetch if profile hasn't loaded yet
    if (!profile) {
      console.log("fetchCourses skipped: profile not loaded yet.");
      return;
    }

    try {
      setLoading(true);
      console.log(`Fetching courses for role: ${profile.role}`);

      // Query depends on user role (admin sees all, creator sees own)
      let query = supabase.from('courses').select('*');

      // If not admin, only show user's own courses
      if (profile.role !== 'admin') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log(`Fetching courses for creator_id: ${user.id}`);
          query = query.eq('creator_id', user.id);
        } else {
          console.warn("Profile exists but user is null, cannot fetch creator courses.");
          setCourses([]);
          setLoading(false);
          return;
        }
      } else {
        console.log("Fetching all courses as admin.");
      }

      // Sort by created date, newest first
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        throw error;
      }

      if (data) {
        console.log(`Fetched ${data.length} courses.`);
        setCourses(data as Course[]);
      } else {
        console.log("No courses found for the current filter.");
        setCourses([]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert('Error', `Failed to load courses: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  // Use useFocusEffect to refresh the list when navigating back
  useFocusEffect(
    React.useCallback(() => {
      console.log("CourseListScreen focused, fetching courses...");
      fetchCourses();
    }, [profile]) // Add profile to dependency array
  );

  // Delete a course
  const deleteCourse = async (id: string) => {
    console.log(`Delete button pressed for course ID: ${id}`);

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this course? This will also delete all associated modules and lessons and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          // *** TEMPORARILY SIMPLIFY onPress ***
          onPress: () => {
            console.log(`Alert's "Delete" button clicked for course ID: ${id}. Supabase call commented out.`);
            // Temporarily comment out the actual deletion logic
            /*
            try {
              setLoading(true);
              const { error } = await supabase.from('courses').delete().eq('id', id);

              if (error) {
                console.error('Supabase delete error:', error);
                throw error;
              }

              Alert.alert('Success', 'Course deleted successfully');
            } catch (error) {
              console.error('Error during course deletion process:', error);
              Alert.alert(
                'Error',
                `Failed to delete course: ${error instanceof Error ? error.message : 'Unknown error'}. Check console and RLS policies.`
              );
            } finally {
              setLoading(false);
            }
            */
          }
        }
      ]
    );
  };

  // Create a new course
  const createNewCourse = () => {
    navigation.navigate('CourseEdit', { courseId: null });
  };

  // Edit an existing course
  const editCourse = (courseId: string) => {
    navigation.navigate('CourseEdit', { courseId });
  };

  // Render each course item
  const renderCourseItem = ({ item }: { item: Course }) => (
    <View style={styles.courseItem}>
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle}>{item.title}</Text>
        <Text style={styles.courseDescription} numberOfLines={2}>
          {item.description || 'No description'}
        </Text>

        <View style={styles.statusContainer}>
          <Text style={item.published ? styles.publishedBadge : styles.draftBadge}>
            {item.published ? 'Published' : 'Draft'}
          </Text>
        </View>
      </View>

      <View style={styles.courseActions}>
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => editCourse(item.id)}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={() => deleteCourse(item.id)}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Courses</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={createNewCourse}
        >
          <Text style={styles.createButtonText}>+ Create Course</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
        </View>
      ) : courses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {profile ? "You don't have any courses yet. Click \"Create Course\" to get started." : "Loading profile..."}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
    color: '#666',
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  courseItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
      }
    }),
  },
  courseInfo: {
    marginBottom: 12,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  courseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  publishedBadge: {
    fontSize: 12,
    color: '#34a853',
    backgroundColor: '#e6f4ea',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  draftBadge: {
    fontSize: 12,
    color: '#f29900',
    backgroundColor: '#fef7e0',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  courseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    fontSize: 12,
  },
  editButton: {
    backgroundColor: '#4285F4',
  },
  deleteButton: {
    backgroundColor: '#ea4335',
  },
});