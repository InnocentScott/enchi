import { api } from '../client';
import { TokenPair } from '../types';

export const authApi = {
  register: (email: string, password: string, displayName: string) =>
    api.post<TokenPair>('/auth/register', { email, password, displayName }).then((r) => r.data),
  login: (email: string, password: string) =>
    api.post<TokenPair>('/auth/login', { email, password }).then((r) => r.data),
};
