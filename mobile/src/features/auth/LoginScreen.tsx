import React, { useState } from 'react';
import { View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { authApi } from '../../api/endpoints/auth';
import { useAuth } from '../../store/authStore';
import { Screen, Card, PrimaryButton, Title, Muted } from '../../components/ui';
import { TextField } from '../../components/TextField';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
});
type Form = z.infer<typeof schema>;

export function LoginScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Login'>) {
  const signIn = useAuth((s) => s.signIn);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (v: Form) => authApi.login(v.email, v.password),
    onSuccess: (t) => signIn(t.accessToken, t.refreshToken),
    onError: () => setServerError('Invalid email or password'),
  });

  return (
    <Screen>
      <View style={{ gap: 6, marginTop: 24, marginBottom: 8 }}>
        <Title>Welcome back 👋</Title>
        <Muted>Master English & Chinese, one review at a time.</Muted>
      </View>
      <Card>
        <TextField
          control={control}
          name="email"
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          error={formState.errors.email?.message}
        />
        <TextField
          control={control}
          name="password"
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          error={formState.errors.password?.message}
        />
        {serverError ? <Muted>{serverError}</Muted> : null}
        <PrimaryButton
          label="Log in"
          loading={mutation.isPending}
          onPress={handleSubmit((v) => {
            setServerError(null);
            mutation.mutate(v);
          })}
        />
        <PrimaryButton label="Create an account" variant="ghost" onPress={() => navigation.navigate('Register')} />
      </Card>
    </Screen>
  );
}
