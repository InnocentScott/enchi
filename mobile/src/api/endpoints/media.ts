import { API_URL } from '../../lib/env';

// Media route công khai (không qua jwt-auth) → expo-av phát trực tiếp từ URL này.
export const audioUrl = (text: string, lang = 'en') =>
  `${API_URL}/media/audio?text=${encodeURIComponent(text)}&lang=${lang}`;
