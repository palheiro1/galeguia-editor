import { supabase } from './supabase';
import { Database } from '../types';
import { useAsyncOperation } from '../hooks/useErrorHandler';

type Course = Database['public']['Tables']['courses']['Row'];
type Module = Database['public']['Tables']['modules']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'];
type Page = Database['public']['Tables']['pages']['Row'];
type Grain = Database['public']['Tables']['grains']['Row'];

/**
 * Course management utilities
 */
export class CourseService {
  /**
   * Create a new course with structure
   */
  static async createWithStructure(courseData: {
    title: string;
    description?: string;
    coverImageUrl?: string;
    creatorId: string;
    structure: {
      modulesCount: number;
      lessonsPerModule: number;
      pagesPerLesson: number;
    };
  }) {
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: courseData.title,
        description: courseData.description,
        cover_image_url: courseData.coverImageUrl,
        creator_id: courseData.creatorId,
        published: false,
      })
      .select()
      .single();

    if (courseError || !course) {
      throw new Error(`Failed to create course: ${courseError?.message}`);
    }

    // Create modules
    const modulePromises = Array.from({ length: courseData.structure.modulesCount }, (_, i) =>
      supabase
        .from('modules')
        .insert({
          course_id: course.id,
          title: `Módulo ${i + 1}`,
          position: i + 1,
        })
        .select()
        .single()
    );

    const moduleResults = await Promise.all(modulePromises);
    const modules = moduleResults.map(result => {
      if (result.error) throw new Error(`Failed to create module: ${result.error.message}`);
      return result.data!;
    });

    // Create lessons for each module
    const lessonPromises = modules.flatMap(module =>
      Array.from({ length: courseData.structure.lessonsPerModule }, (_, i) =>
        supabase
          .from('lessons')
          .insert({
            module_id: module.id,
            title: `Lição ${i + 1}`,
            position: i + 1,
            content: '',
          })
          .select()
          .single()
      )
    );

    const lessonResults = await Promise.all(lessonPromises);
    const lessons = lessonResults.map(result => {
      if (result.error) throw new Error(`Failed to create lesson: ${result.error.message}`);
      return result.data!;
    });

    // Create pages for each lesson
    const pagePromises = lessons.flatMap(lesson =>
      Array.from({ length: courseData.structure.pagesPerLesson }, (_, i) =>
        supabase
          .from('pages')
          .insert({
            lesson_id: lesson.id,
            title: `Página ${i + 1}`,
            position: i + 1,
            type: 'Introduction', // Default page type
            content: '',
          })
          .select()
          .single()
      )
    );

    const pageResults = await Promise.all(pagePromises);
    const pages = pageResults.map(result => {
      if (result.error) throw new Error(`Failed to create page: ${result.error.message}`);
      return result.data!;
    });

    return {
      course,
      modules,
      lessons,
      pages,
      totalElements: {
        modules: modules.length,
        lessons: lessons.length,
        pages: pages.length,
        grains: pages.length * 15, // Each page has 15 grains
      },
    };
  }

  /**
   * Get course completion statistics
   */
  static async getCourseCompletion(courseId: string) {
    // Get modules
    const { data: modules, error: moduleError } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', courseId);

    if (moduleError) throw moduleError;

    // Get lessons
    const { data: lessons, error: lessonError } = await supabase
      .from('lessons')
      .select('id, module_id')
      .in('module_id', modules?.map(m => m.id) || []);

    if (lessonError) throw lessonError;

    // Get pages
    const { data: pages, error: pageError } = await supabase
      .from('pages')
      .select('id, lesson_id, title, content')
      .in('lesson_id', lessons?.map(l => l.id) || []);

    if (pageError) throw pageError;

    // Get grains
    const { data: grains, error: grainError } = await supabase
      .from('grains')
      .select('id, page_id, content')
      .in('page_id', pages?.map(p => p.id) || []);

    if (grainError) throw grainError;

    // Calculate completion statistics
    const completedPages = pages?.filter(page => 
      page.title?.trim() && page.content?.trim()
    ).length || 0;

    const completedGrains = grains?.filter(grain => {
      if (!grain.content) return false;
      
      // Check if grain has meaningful content based on type
      const content = grain.content as any;
      switch (content.type) {
        case 'textToComplete':
          return content.phrase && content.correctAnswer;
        case 'testQuestion':
          return content.question && content.correctAnswer;
        default:
          return Object.keys(content).length > 0;
      }
    }).length || 0;

    return {
      modules: { current: modules?.length || 0, total: modules?.length || 0 },
      lessons: { current: lessons?.length || 0, total: lessons?.length || 0 },
      pages: { current: completedPages, total: pages?.length || 0 },
      grains: { 
        current: completedGrains, 
        total: grains?.length || 0,
        percentage: grains?.length ? Math.round((completedGrains / grains.length) * 100) : 0
      },
    };
  }

  /**
   * Duplicate a course with all its content
   */
  static async duplicateCourse(courseId: string, newTitle: string, creatorId: string) {
    // Get original course
    const { data: originalCourse, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !originalCourse) {
      throw new Error(`Failed to fetch original course: ${courseError?.message}`);
    }

    // Create new course
    const { data: newCourse, error: newCourseError } = await supabase
      .from('courses')
      .insert({
        title: newTitle,
        description: originalCourse.description,
        cover_image_url: originalCourse.cover_image_url,
        creator_id: creatorId,
        published: false,
      })
      .select()
      .single();

    if (newCourseError || !newCourse) {
      throw new Error(`Failed to create new course: ${newCourseError?.message}`);
    }

    // Get and duplicate modules
    const { data: originalModules } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('position');

    if (originalModules) {
      for (const module of originalModules) {
        const { data: newModule } = await supabase
          .from('modules')
          .insert({
            course_id: newCourse.id,
            title: module.title,
            position: module.position,
          })
          .select()
          .single();

        if (newModule) {
          // Get and duplicate lessons
          const { data: originalLessons } = await supabase
            .from('lessons')
            .select('*')
            .eq('module_id', module.id)
            .order('position');

          if (originalLessons) {
            for (const lesson of originalLessons) {
              const { data: newLesson } = await supabase
                .from('lessons')
                .insert({
                  module_id: newModule.id,
                  title: lesson.title,
                  content: lesson.content,
                  position: lesson.position,
                })
                .select()
                .single();

              if (newLesson) {
                // Get and duplicate pages
                const { data: originalPages } = await supabase
                  .from('pages')
                  .select('*')
                  .eq('lesson_id', lesson.id)
                  .order('position');

                if (originalPages) {
                  for (const page of originalPages) {
                    const { data: newPage } = await supabase
                      .from('pages')
                      .insert({
                        lesson_id: newLesson.id,
                        title: page.title,
                        content: page.content,
                        media_url: page.media_url,
                        position: page.position,
                        type: page.type,
                        grain_pattern: page.grain_pattern,
                      })
                      .select()
                      .single();

                    if (newPage) {
                      // Get and duplicate grains
                      const { data: originalGrains } = await supabase
                        .from('grains')
                        .select('*')
                        .eq('page_id', page.id)
                        .order('position');

                      if (originalGrains) {
                        const grainInserts = originalGrains.map(grain => ({
                          page_id: newPage.id,
                          position: grain.position,
                          type: grain.type,
                          content: grain.content,
                        }));

                        await supabase.from('grains').insert(grainInserts);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return newCourse;
  }
}

/**
 * React hook for course operations
 */
export const useCourseOperations = () => {
  const createCourseWithStructure = useAsyncOperation(CourseService.createWithStructure);
  const getCourseCompletion = useAsyncOperation(CourseService.getCourseCompletion);
  const duplicateCourse = useAsyncOperation(CourseService.duplicateCourse);

  return {
    createCourseWithStructure: createCourseWithStructure.execute,
    getCourseCompletion: getCourseCompletion.execute,
    duplicateCourse: duplicateCourse.execute,
    isLoading: createCourseWithStructure.isLoading || getCourseCompletion.isLoading || duplicateCourse.isLoading,
    error: createCourseWithStructure.error || getCourseCompletion.error || duplicateCourse.error,
  };
};