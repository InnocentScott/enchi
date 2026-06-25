import { api } from '../client';
import { Course, CourseDetail, LessonDetail, Quiz, SubmitResult } from '../types';

export interface QuizAnswer {
  questionId: string;
  optionId: string;
}

export const contentApi = {
  courses: () => api.get<Course[]>('/courses').then((r) => r.data),
  course: (id: string) => api.get<CourseDetail>(`/courses/${id}`).then((r) => r.data),
  lesson: (id: string) => api.get<LessonDetail>(`/lessons/${id}`).then((r) => r.data),
  quizzes: (lessonId: string) => api.get<Quiz[]>(`/quizzes/${lessonId}`).then((r) => r.data),
  submit: (quizId: string, answers: QuizAnswer[]) =>
    api.post<SubmitResult>(`/quizzes/${quizId}/submit`, { answers }).then((r) => r.data),
};
