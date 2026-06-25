export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type LearnStackParamList = {
  Courses: undefined;
  CourseDetail: { courseId: string; title: string };
  Lesson: { lessonId: string; title: string };
  Quiz: { lessonId: string; title: string };
};

export type AppTabParamList = {
  LearnTab: undefined;
  Review: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};
