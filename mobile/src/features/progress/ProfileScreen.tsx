import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { progressApi } from '../../api/endpoints/progress';
import { useAuth } from '../../store/authStore';
import { Loader, ErrorView, PrimaryButton, Muted } from '../../components/ui';
import { theme } from '../../lib/theme';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const signOut = useAuth((s) => s.signOut);
  const q = useQuery({ queryKey: ['progress', 'me'], queryFn: () => progressApi.me() });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Text style={s.header}>Profile</Text>
      {q.isLoading ? (
        <Loader />
      ) : q.isError || !q.data ? (
        <ErrorView onRetry={() => q.refetch()} />
      ) : (
        <View style={s.body}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {(q.data.displayName || '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={s.name}>{q.data.displayName || 'Anonymous'}</Text>
          <Muted>{q.data.rank > 0 ? `Ranked #${q.data.rank}` : 'Unranked'}</Muted>

          <View style={s.stats}>
            <Stat label="XP" value={q.data.totalXp} />
            <Stat label="Streak" value={`${q.data.currentStreak}🔥`} />
            <Stat label="Best" value={q.data.longestStreak} />
          </View>

          <View style={{ height: 16 }} />
          <PrimaryButton label="Log out" variant="ghost" onPress={() => void signOut()} />
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  header: { color: theme.colors.text, fontSize: 26, fontWeight: '800', padding: 16 },
  body: { padding: 16, alignItems: 'center', gap: 6 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { color: theme.colors.primaryText, fontSize: 34, fontWeight: '800' },
  name: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: 12, marginTop: 20, alignSelf: 'stretch' },
  stat: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  statLabel: { color: theme.colors.muted, fontSize: 12 },
});
