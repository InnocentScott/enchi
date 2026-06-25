// API Gateway base URL. Trên thiết bị thật/emulator, đặt EXPO_PUBLIC_API_URL = IP LAN của máy
// (Android emulator: http://10.0.2.2:8088). Mặc định localhost:8088 (cổng gateway local).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8088';
