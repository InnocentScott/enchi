import React, { useState } from 'react';
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
  displayName: z.string().min(1, 'Required').max(40),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
});
type Form = z.infer<typeof schema>;

export function RegisterScreen(_: NativeStackScreenProps<AuthStackParamList, 'Register'>) {
  const signIn = useAuth((s) => s.signIn);
  const [serverError, setServerError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: (v: Form) => authApi.register(v.email, v.password, v.displayName),
    onSuccess: (t) => signIn(t.accessToken, t.refreshToken),
    onError: (e: unknown) => {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setServerError(status === 409 ? 'Email already registered' : 'Could not create account');
    },
  });

  return (
    <Screen>
      <Title>Create your account</Title>
      <Card>
        <TextField
          control={control}
          name="displayName"
          label="Display name"
          placeholder="Your name"
          autoCapitalize="sentences"
          error={formState.errors.displayName?.message}
        />
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
          label="Sign up"
          loading={mutation.isPending}
          onPress={handleSubmit((v) => {
            setServerError(null);
            mutation.mutate(v);
          })}
        />
      </Card>
    </Screen>
  );
}
