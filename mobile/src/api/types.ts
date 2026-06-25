export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface Course {
  id: string;
  title: string;
  language: string;
  level?: string | null;
}

export interface LessonSummary {
  id: string;
  title: string;
  order: number;
}

export interface CourseDetail extends Course {
  lessons: LessonSummary[];
}

export interface Vocabulary {
  id: string;
  term: string;
  reading?: string | null;
  meaning: string;
  exampleText?: string | null;
}

export interface LessonDetail {
  id: string;
  title: string;
  order: number;
  vocabulary: Vocabulary[];
  quizzes: { id: string; title: string }[];
}

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  type: string;
  prompt: string;
  options: QuizOption[];
}

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface SubmitResult {
  submissionId: string;
  score: number;
  total: number;
  results: { vocabId: string; correct: boolean; quality: number }[];
}

export interface Progress {
  userId: string;
  displayName: string;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  rank: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalXp: number;
}

export interface DueCard {
  vocabId: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string;
}
