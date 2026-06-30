// Axios client gọi backend qua API Gateway. Đính JWT + tự refresh khi 401.
// Cần: npm install axios ; npx expo install expo-secure-store
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost';

// [DEBUG] In URL thật bundle đã nhúng — nếu hiện localhost thì .env chưa được nhúng lại (cần restart --clear).
console.log('[api] BASE_URL =', BASE_URL, '| raw env =', process.env.EXPO_PUBLIC_API_URL);

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export const api = axios.create({ baseURL: BASE_URL, timeout: 10_000 });

export async function setTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

// Đính access token vào mọi request.
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(ACCESS_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // [DEBUG] In URL đầy đủ của mỗi request đi ra.
  console.log('[api] →', config.method?.toUpperCase(), `${config.baseURL ?? ''}${config.url ?? ''}`);
  return config;
});

// Tự refresh khi 401 (chống refresh đồng thời bằng 1 promise dùng chung).
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => {
    // [DEBUG] Request thành công.
    console.log('[api] ←', res.status, `${res.config.baseURL ?? ''}${res.config.url ?? ''}`);
    return res;
  },
  async (error: AxiosError) => {
    // [DEBUG] In chi tiết lỗi: có response không? code gì? URL gì?
    console.log('[api] ✗ ERROR', {
      message: error.message,
      code: error.code,
      url: `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`,
      status: error.response?.status,
      data: error.response?.data,
    });
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (error.response?.status !== 401 || original._retried) {
      return Promise.reject(error);
    }
    original._retried = true;

    refreshing ??= (async () => {
      const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!refresh) return null;
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh });
        await setTokens(data.accessToken, data.refreshToken);
        return data.accessToken as string;
      } catch {
        await clearTokens();
        return null;
      }
    })();

    const newAccess = await refreshing;
    refreshing = null;
    if (!newAccess) return Promise.reject(error);

    original.headers.Authorization = `Bearer ${newAccess}`;
    return api(original);
  },
);
