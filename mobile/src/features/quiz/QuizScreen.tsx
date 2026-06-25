import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LearnStackParamList } from '../../navigation/types';
import { contentApi, QuizAnswer } from '../../api/endpoints/content';
import { SubmitResult, QuizQuestion, QuizOption } from '../../api/types';
import { Loader, ErrorView, PrimaryButton, Muted, Card, Title } from '../../components/ui';
import { theme } from '../../lib/theme';

export function QuizScreen({ route, navigation }: NativeStackScreenProps<LearnStackParamList, 'Quiz'>) {
  const { lessonId } = route.params;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['quizzes', lessonId], queryFn: () => contentApi.quizzes(lessonId) });
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);

  const quiz = q.data?.[0];

  const mutation = useMutation({
    mutationFn: (answers: QuizAnswer[]) => contentApi.submit(quiz!.id, answers),
    onSuccess: (res) => {
      setResult(res);
      // Sau khi nộp: làm mới progress / SRS due / leaderboard.
      void qc.invalidateQueries({ queryKey: ['progress', 'me'] });
      void qc.invalidateQueries({ queryKey: ['srs', 'due'] });
      void qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });

  if (q.isLoading) return <Loader />;
  if (q.isError) return <ErrorView onRetry={() => q.refetch()} />;

  if (!quiz) {
    return (
      <View style={s.empty}>
        <Muted>No quiz available for this lesson.</Muted>
      </View>
    );
  }

  if (result) {
    return (
      <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={s.content}>
        <Card>
          <Title>
            {result.score}/{result.total} correct 🎉
          </Title>
          <Muted>+{result.score * 10} XP earned · words scheduled for spaced review.</Muted>
          <PrimaryButton label="Done" onPress={() => navigation.goBack()} />
        </Card>
      </ScrollView>
    );
  }

  const allAnswered = quiz.questions.every((qq: QuizQuestion) => Boolean(selected[qq.id]));

  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={s.content}>
      {quiz.questions.map((question: QuizQuestion, i: number) => (
        <Card key={question.id}>
          <Text style={s.prompt}>
            {i + 1}. {question.prompt}
          </Text>
          {question.options.map((opt: QuizOption) => {
            const isSel = selected[question.id] === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[s.option, isSel && s.optionSel]}
                onPress={() => setSelected((p) => ({ ...p, [question.id]: opt.id }))}
              >
                <Text style={[s.optionText, isSel && s.optionTextSel]}>{opt.text}</Text>
              </Pressable>
            );
          })}
        </Card>
      ))}
      <PrimaryButton
        label="Submit"
        disabled={!allAnswered}
        loading={mutation.isPending}
        onPress={() =>
          mutation.mutate(
            quiz.questions.map((qq: QuizQuestion) => ({ questionId: qq.id, optionId: selected[qq.id]! })),
          )
        }
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
  prompt: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  option: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionSel: { borderColor: theme.colors.primary, backgroundColor: '#28304d' },
  optionText: { color: theme.colors.text, fontSize: 15 },
  optionTextSel: { color: theme.colors.primaryText, fontWeight: '700' },
});
