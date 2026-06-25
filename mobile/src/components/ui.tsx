import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Body contentContainerStyle={scroll ? s.scrollContent : undefined} style={s.flex}>
        {children}
      </Body>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'success' | 'danger';
}) {
  const bg =
    variant === 'primary'
      ? theme.colors.primary
      : variant === 'success'
        ? theme.colors.success
        : variant === 'danger'
          ? theme.colors.danger
          : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && s.ghost,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.primaryText} />
      ) : (
        <Text style={[s.buttonText, variant === 'ghost' && { color: theme.colors.primary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Loader() {
  return (
    <View style={s.centered}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={s.centered}>
      <Text style={s.errorText}>{message ?? 'Something went wrong'}</Text>
      {onRetry && <PrimaryButton label="Retry" variant="ghost" onPress={onRetry} />}
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={s.muted}>{children}</Text>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  flex: { flex: 1 },
  scrollContent: { padding: theme.spacing(2), gap: theme.spacing(1.5) },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing(1),
  },
  button: {
    borderRadius: theme.radius,
    paddingVertical: theme.spacing(1.75),
    paddingHorizontal: theme.spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: { borderWidth: 1, borderColor: theme.colors.primary },
  buttonText: { color: theme.colors.primaryText, fontWeight: '700', fontSize: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing(3), gap: theme.spacing(2) },
  errorText: { color: theme.colors.danger, textAlign: 'center' },
  title: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
  muted: { color: theme.colors.muted, fontSize: 13 },
});
