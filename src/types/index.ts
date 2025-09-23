// Database types from Supabase
import { Session } from '@supabase/supabase-js';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          username: string | null;
          role: 'admin' | 'creator';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          username?: string | null;
          role?: 'admin' | 'creator';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          username?: string | null;
          role?: 'admin' | 'creator';
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          cover_image_url: string | null;
          creator_id: string;
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          cover_image_url?: string | null;
          creator_id: string;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          cover_image_url?: string | null;
          published?: boolean;
          updated_at?: string;
        };
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          position: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          position?: number;
          updated_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          content: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          content?: string | null;
          position: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string | null;
          position?: number;
          updated_at?: string;
        };
      };
      pages: {
        Row: {
          id: string;
          lesson_id: string;
          title: string;
          content: string | null;
          media_url: string | null;
          position: number;
          type: PageType;
          grain_pattern: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          title: string;
          content?: string | null;
          media_url?: string | null;
          position: number;
          type: PageType;
          grain_pattern?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string | null;
          media_url?: string | null;
          position?: number;
          type?: PageType;
          grain_pattern?: string[] | null;
          updated_at?: string;
        };
      };
      grains: {
        Row: {
          id: string;
          page_id: string;
          position: number;
          type: GrainType;
          content: GrainContent;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page_id: string;
          position: number;
          type: GrainType;
          content: GrainContent;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          position?: number;
          type?: GrainType;
          content?: GrainContent;
          updated_at?: string;
        };
      };
    };
  };
}

// Application types
export type PageType = 
  | 'Introduction' 
  | 'Booster' 
  | 'Comparation' 
  | 'Review' 
  | 'Custom' 
  | 'text'; // legacy

export type GrainType = 
  | 'textToComplete'
  | 'testQuestion'
  | 'imagesToGuess'
  | 'textToGuess'
  | 'audioToGuess'
  | 'pairsOfText'
  | 'pairsOfImage';

// Grain content types
export interface TextToCompleteContent {
  phrase: string;
  correctAnswer: string;
  falseAlternatives: [string, string, string];
}

export interface TestQuestionContent {
  question: string;
  correctAnswer: string;
  falseAlternatives: [string, string, string];
}

export interface ImagesToGuessContent {
  correctImageUrl: string;
  falseImageUrls: [string, string, string];
  correctWord: string;
}

export interface TextToGuessContent {
  imageUrl: string;
  correctAnswer: string;
  falseAlternatives: [string, string, string];
}

export interface AudioToGuessContent {
  correctWord: string;
  correctAudioUrl: string;
  falseAudioUrls: [string, string, string];
}

export interface PairsOfTextContent {
  pairs: Array<{ left: string; right: string }>;
}

export interface PairsOfImageContent {
  pairs: Array<{ imageUrl: string; text: string }>;
}

export type GrainContent = 
  | TextToCompleteContent
  | TestQuestionContent
  | ImagesToGuessContent
  | TextToGuessContent
  | AudioToGuessContent
  | PairsOfTextContent
  | PairsOfImageContent;

// Navigation types
export type RootStackParamList = {
  CourseList: undefined;
  CourseEdit: { courseId: string | null; refresh?: boolean };
  ModuleEdit: { courseId: string; moduleId: string | null; refresh?: boolean };
  LessonEdit: { moduleId: string; lessonId: string | null; refresh?: boolean };
  PageEdit: { lessonId: string; pageId?: string | null; refresh?: boolean };
  GrainEdit: { 
    pageId: string; 
    grainId?: string | null; 
    position?: number; 
    expectedGrainType?: string;
    pageType?: PageType;
    refresh?: boolean 
  };
  PageTest: { pageId: string; pageTitle?: string };
  ProfileEdit: undefined;
};

// Auth types
export interface ProfileData {
  username: string | null;
  role: 'admin' | 'creator';
}

export interface AuthContextType {
  session: Session | null;
  profile: ProfileData | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Course structure types
export interface CourseStructure {
  modulesCount: number;
  lessonsPerModule: number;
  pagesPerLesson: number;
}

export interface CourseCompletion {
  modules: { current: number; total: number };
  lessons: { current: number; total: number };
  pages: { current: number; total: number };
  grains: { current: number; total: number; percentage: number };
}

// UI Component types
export interface ButtonProps {
  title: string;
  onPress: () => void;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}

export interface CardProps {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  secureTextEntry?: boolean;
  error?: string;
  style?: any;
}

// Error handling types
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}