import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearnStackParamList } from '../../navigation/types';
import { contentApi } from '../../api/endpoints/content';
import { Loader, ErrorView, Muted } from '../../components/ui';
import { theme } from '../../lib/theme';

export function CourseDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<LearnStackParamList, 'CourseDetail'>) {
  const { courseId } = route.params;
  const q = useQuery({ queryKey: ['course', courseId], queryFn: () => contentApi.course(courseId) });

  if (q.isLoading) return <Loader />;
  if (q.isError || !q.data) return <ErrorView onRetry={() => q.refetch()} />;

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={s.list}
      data={q.data.lessons}
      keyExtractor={(l) => l.id}
      ListHeaderComponent={<Muted>{q.data.lessons.length} lessons</Muted>}
      ListEmptyComponent={<Muted>No lessons yet.</Muted>}
      renderItem={({ item }) => (
        <Pressable
          style={s.row}
          onPress={() => navigation.navigate('Lesson', { lessonId: item.id, title: item.title })}
        >
          <View style={s.index}>
            <Text style={s.indexText}>{item.order}</Text>
          </View>
          <Text style={s.title}>{item.title}</Text>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  index: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: { color: theme.colors.primary, fontWeight: '800' },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: '600', flexShrink: 1 },
});
