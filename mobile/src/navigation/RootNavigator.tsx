import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../store/authStore';
import { theme } from '../lib/theme';
import { Loader } from '../components/ui';
import { AuthStackParamList, LearnStackParamList, AppTabParamList } from './types';
import { LoginScreen } from '../features/auth/LoginScreen';
import { RegisterScreen } from '../features/auth/RegisterScreen';
import { CoursesScreen } from '../features/courses/CoursesScreen';
import { CourseDetailScreen } from '../features/courses/CourseDetailScreen';
import { LessonScreen } from '../features/lesson/LessonScreen';
import { QuizScreen } from '../features/quiz/QuizScreen';
import { ReviewScreen } from '../features/review/ReviewScreen';
import { LeaderboardScreen } from '../features/leaderboard/LeaderboardScreen';
import { ProfileScreen } from '../features/progress/ProfileScreen';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.bg,
    card: theme.colors.surface,
    text: theme.colors.text,
    border: theme.colors.border,
    primary: theme.colors.primary,
  },
};

const headerStyle = {
  headerStyle: { backgroundColor: theme.colors.surface },
  headerTintColor: theme.colors.text,
} as const;

const Auth = createNativeStackNavigator<AuthStackParamList>();
const Learn = createNativeStackNavigator<LearnStackParamList>();
const Tabs = createBottomTabNavigator<AppTabParamList>();

function AuthFlow() {
  return (
    <Auth.Navigator screenOptions={headerStyle}>
      <Auth.Screen name="Login" component={LoginScreen} options={{ title: 'EnChi' }} />
      <Auth.Screen name="Register" component={RegisterScreen} options={{ title: 'Create account' }} />
    </Auth.Navigator>
  );
}

function LearnFlow() {
  return (
    <Learn.Navigator screenOptions={headerStyle}>
      <Learn.Screen name="Courses" component={CoursesScreen} options={{ title: 'Courses' }} />
      <Learn.Screen
        name="CourseDetail"
        component={CourseDetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
      <Learn.Screen
        name="Lesson"
        component={LessonScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
      <Learn.Screen name="Quiz" component={QuizScreen} options={{ title: 'Quiz' }} />
    </Learn.Navigator>
  );
}

function AppFlow() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
      }}
    >
      <Tabs.Screen name="LearnTab" component={LearnFlow} options={{ title: 'Learn' }} />
      <Tabs.Screen name="Review" component={ReviewScreen} />
      <Tabs.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const status = useAuth((s) => s.status);
  return (
    <NavigationContainer theme={navTheme}>
      {status === 'loading' ? <Loader /> : status === 'authed' ? <AppFlow /> : <AuthFlow />}
    </NavigationContainer>
  );
}
