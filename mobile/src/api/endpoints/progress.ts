import { api } from '../client';
import { LeaderboardEntry, Progress } from '../types';

export const progressApi = {
  me: () => api.get<Progress>('/progress/me').then((r) => r.data),
  leaderboard: (limit = 20) =>
    api.get<LeaderboardEntry[]>(`/leaderboard?limit=${limit}`).then((r) => r.data),
};
