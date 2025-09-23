import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../styles/designSystem';

interface Course {
  id: string;
  title: string;
  description: string;
  author_email: string;
  published: boolean;
  cover_image_url?: string;
  created_at: string;
  modules_count?: number;
  pages_count?: number;
  progress?: number;
}

interface ModernCourseCardProps {
  course: Course;
  onEdit: (courseId: string) => void;
  onView: (courseId: string) => void;
}

const ModernCourseCard: React.FC<ModernCourseCardProps> = ({
  course,
  onEdit,
  onView,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderCover = () => {
    if (course.cover_image_url) {
      return (
        <Image 
          source={{ uri: course.cover_image_url }}
          style={styles.coverImage}
          resizeMode="cover"
        />
      );
    }
    
    // Fallback gradient cover for courses without images
    return (
      <View style={styles.coverGradient}>
        <Text style={styles.coverEmoji}>📚</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onEdit(course.id)}>
      <View style={styles.cover}>
        {renderCover()}
        <View style={[
          styles.status, 
          course.published ? styles.statusPublished : styles.statusDraft
        ]}>
          <Text style={[
            styles.statusText,
            course.published ? styles.statusTextPublished : styles.statusTextDraft
          ]}>
            ● {course.published ? 'Publicado' : 'Rascunho'}
          </Text>
        </View>
      </View>
      
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>
        
        <View style={styles.meta}>
          <MaterialIcons name="person" size={14} color={COLORS.muted} />
          <Text style={styles.metaText}>
            {course.author_email} · {formatDate(course.created_at)}
          </Text>
        </View>
        
        <Text style={styles.desc} numberOfLines={3}>
          {course.description}
        </Text>
        
        {course.progress !== undefined && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {course.modules_count || 0} módulos · {course.pages_count || 0} páginas
            </Text>
            <Text style={styles.progressPercent}>{course.progress}%</Text>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {course.progress !== undefined 
            ? (course.progress > 80 ? 'Quase concluído' : 'A desenvolver')
            : `${course.modules_count || 0} módulos · ${course.pages_count || 0} páginas`
          }
        </Text>
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.iconButton, styles.editButton]}
            onPress={() => onEdit(course.id)}
          >
            <MaterialIcons name="edit" size={18} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.iconButton, styles.viewButton]}
            onPress={() => onView(course.id)}
          >
            <MaterialIcons name="visibility" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.sm,
    minHeight: 250,
  },
  cover: {
    position: 'relative',
    height: 160,
    backgroundColor: COLORS.gray200,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverEmoji: {
    fontSize: 42,
    color: 'white',
  },
  status: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'white',
    ...SHADOWS.sm,
  },
  statusPublished: {
    // backgroundColor already white
  },
  statusDraft: {
    // backgroundColor already white
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextPublished: {
    color: COLORS.success,
  },
  statusTextDraft: {
    color: COLORS.warning,
  },
  body: {
    padding: 14,
    paddingHorizontal: 16,
    gap: 8,
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h4,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: COLORS.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  desc: {
    fontSize: 14,
    color: COLORS.gray600,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  progressPercent: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    padding: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: COLORS.primary,
  },
  viewButton: {
    backgroundColor: COLORS.accent,
  },
});

export default ModernCourseCard;