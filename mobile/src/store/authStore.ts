import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setTokens, clearTokens } from '../api/client';

type Status = 'loading' | 'authed' | 'guest';

interface AuthState {
  status: Status;
  hydrate: () => Promise<void>;
  signIn: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'loading',
  hydrate: async () => {
    const token = await SecureStore.getItemAsync('access_token');
    set({ status: token ? 'authed' : 'guest' });
  },
  signIn: async (accessToken, refreshToken) => {
    await setTokens(accessToken, refreshToken);
    set({ status: 'authed' });
  },
  signOut: async () => {
    await clearTokens();
    set({ status: 'guest' });
  },
}));
