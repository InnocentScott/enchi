import { api } from '../client';
import { DueCard } from '../types';

export const srsApi = {
  due: (limit = 20) => api.get<DueCard[]>(`/srs/due?limit=${limit}`).then((r) => r.data),
  answer: (vocabId: string, quality: number) =>
    api.post('/srs/answer', { vocabId, quality }).then((r) => r.data),
};
