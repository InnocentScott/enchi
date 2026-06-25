import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { srsApi } from '../../api/endpoints/srs';
import { Loader, ErrorView, Muted, PrimaryButton } from '../../components/ui';
import { theme } from '../../lib/theme';

export function ReviewScreen() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['srs', 'due'], queryFn: () => srsApi.due(50) });
  const mutation = useMutation({
    mutationFn: (v: { vocabId: string; quality: number }) => srsApi.answer(v.vocabId, v.quality),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['srs', 'due'] }),
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Text style={s.header}>Review</Text>
      {q.isLoading ? (
        <Loader />
      ) : q.isError ? (
        <ErrorView onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          contentContainerStyle={s.list}
          data={q.data}
          keyExtractor={(c) => c.vocabId}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>All caught up! 🎉</Text>
              <Muted>No words are due for review right now.</Muted>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <Muted>Due · interval {item.intervalDays}d · reps {item.repetitions}</Muted>
              <View style={s.actions}>
                <View style={s.flex}>
                  <PrimaryButton
                    label="Again"
                    variant="danger"
                    onPress={() => mutation.mutate({ vocabId: item.vocabId, quality: 1 })}
                  />
                </View>
                <View style={s.flex}>
                  <PrimaryButton
                    label="Good"
                    onPress={() => mutation.mutate({ vocabId: item.vocabId, quality: 4 })}
                  />
                </View>
                <View style={s.flex}>
                  <PrimaryButton
                    label="Easy"
                    variant="success"
                    onPress={() => mutation.mutate({ vocabId: item.vocabId, quality: 5 })}
                  />
                </View>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { color: theme.colors.text, fontSize: 26, fontWeight: '800', padding: 16 },
  list: { paddingHorizontal: 16, gap: 12, paddingBottom: 24 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  actions: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  empty: { alignItems: 'center', gap: 8, marginTop: 60 },
  emptyTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
});
