import React from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearnStackParamList } from '../../navigation/types';
import { contentApi } from '../../api/endpoints/content';
import { Loader, ErrorView, Muted } from '../../components/ui';
import { theme } from '../../lib/theme';

export function CoursesScreen({ navigation }: NativeStackScreenProps<LearnStackParamList, 'Courses'>) {
  const q = useQuery({ queryKey: ['courses'], queryFn: () => contentApi.courses() });

  if (q.isLoading) return <Loader />;
  if (q.isError) return <ErrorView onRetry={() => q.refetch()} />;

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={s.list}
      data={q.data}
      keyExtractor={(c) => c.id}
      ListEmptyComponent={<Muted>No courses yet.</Muted>}
      renderItem={({ item }) => (
        <Pressable
          style={s.card}
          onPress={() => navigation.navigate('CourseDetail', { courseId: item.id, title: item.title })}
        >
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.meta}>
            {item.language.toUpperCase()} · {item.level ?? 'all levels'}
          </Text>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  meta: { color: theme.colors.muted, fontSize: 13 },
});
