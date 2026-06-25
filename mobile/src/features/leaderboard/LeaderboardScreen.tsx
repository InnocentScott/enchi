import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { progressApi } from '../../api/endpoints/progress';
import { Loader, ErrorView, Muted } from '../../components/ui';
import { theme } from '../../lib/theme';

const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

export function LeaderboardScreen() {
  const q = useQuery({ queryKey: ['leaderboard'], queryFn: () => progressApi.leaderboard(50) });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Text style={s.header}>Leaderboard</Text>
      {q.isLoading ? (
        <Loader />
      ) : q.isError ? (
        <ErrorView onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          contentContainerStyle={s.list}
          data={q.data}
          keyExtractor={(e) => e.userId}
          ListEmptyComponent={<Muted>No one on the board yet — be the first!</Muted>}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={s.rank}>{medal(item.rank)}</Text>
              <Text style={s.name} numberOfLines={1}>
                {item.displayName || 'Anonymous'}
              </Text>
              <Text style={s.xp}>{item.totalXp} XP</Text>
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
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rank: { color: theme.colors.text, fontSize: 16, fontWeight: '800', width: 40 },
  name: { color: theme.colors.text, fontSize: 16, flex: 1 },
  xp: { color: theme.colors.primary, fontWeight: '800' },
});
