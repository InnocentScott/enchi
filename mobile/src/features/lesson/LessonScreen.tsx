import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearnStackParamList } from '../../navigation/types';
import { contentApi } from '../../api/endpoints/content';
import { Vocabulary } from '../../api/types';
import { audioUrl } from '../../api/endpoints/media';
import { Loader, ErrorView, PrimaryButton, Muted } from '../../components/ui';
import { theme } from '../../lib/theme';

export function LessonScreen({ route, navigation }: NativeStackScreenProps<LearnStackParamList, 'Lesson'>) {
  const { lessonId, title } = route.params;
  const q = useQuery({ queryKey: ['lesson', lessonId], queryFn: () => contentApi.lesson(lessonId) });

  // Phát audio TTS rồi unload khi xong (tránh rò bộ nhớ — theo skill).
  const play = useCallback(async (text: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl(text, 'en') });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) void sound.unloadAsync();
      });
    } catch {
      /* ignore playback errors */
    }
  }, []);

  if (q.isLoading) return <Loader />;
  if (q.isError || !q.data) return <ErrorView onRetry={() => q.refetch()} />;

  const hasQuiz = q.data.quizzes.length > 0;

  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={s.content}>
      <Muted>{q.data.vocabulary.length} words</Muted>
      {q.data.vocabulary.map((v: Vocabulary) => (
        <View key={v.id} style={s.card}>
          <View style={s.cardHeader}>
            <View style={{ flexShrink: 1 }}>
              <Text style={s.term}>{v.term}</Text>
              {v.reading ? <Text style={s.reading}>{v.reading}</Text> : null}
              <Text style={s.meaning}>{v.meaning}</Text>
            </View>
            <Pressable style={s.play} onPress={() => play(v.term)}>
              <Text style={s.playIcon}>▶</Text>
            </Pressable>
          </View>
          {v.exampleText ? <Text style={s.example}>“{v.exampleText}”</Text> : null}
        </View>
      ))}
      {hasQuiz ? (
        <PrimaryButton label="Start Quiz" onPress={() => navigation.navigate('Quiz', { lessonId, title })} />
      ) : (
        <Muted>No quiz for this lesson yet.</Muted>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  term: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  reading: { color: theme.colors.primary, fontSize: 13 },
  meaning: { color: theme.colors.muted, fontSize: 15, marginTop: 2 },
  example: { color: theme.colors.muted, fontStyle: 'italic', fontSize: 13 },
  play: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: theme.colors.primary, fontSize: 16 },
});
