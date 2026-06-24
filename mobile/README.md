# 📱 EnChi Mobile (React Native + Expo)

Client duy nhất của hệ thống EnChi. Chi tiết kế hoạch: [`../plan_frontend.md`](../plan_frontend.md).
Backend là repo riêng: [`../backend`](../backend).

## Khởi tạo (chạy 1 lần — Expo managed)

```bash
cd mobile
npx create-expo-app@latest . --template blank-typescript
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs \
  react-native-screens react-native-safe-area-context \
  expo-secure-store expo-av expo-file-system react-native-reanimated
npm install @tanstack/react-query zustand axios react-hook-form zod i18next react-i18next
```

> File `src/api/client.ts` (đã có sẵn trong scaffold) là glue gọi backend qua gateway — giữ lại
> khi generator tạo project. Đặt `EXPO_PUBLIC_API_URL` trỏ tới gateway (vd. `http://localhost`,
> hoặc IP LAN khi chạy trên thiết bị thật).

## Cấu trúc mục tiêu (`src/`)

```text
src/
├── api/            # client.ts + endpoints/ (auth, content, progress, srs, media)
├── features/       # auth, courses, lesson, quiz, review, progress, leaderboard
├── components/     # Button, Card, ProgressBar, AudioButton, ...
├── store/          # authStore, sessionStore (zustand)
├── hooks/          # useAuth, useAudioPlayer, useReviewQueue
├── lib/            # queryClient, theme, constants
└── i18n/
```

## Map màn hình → service: xem `plan_frontend.md` §3.
Sau khi submit quiz, invalidate query: `progress/me`, `srs/due`, `leaderboard`.
