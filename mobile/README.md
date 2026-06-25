# 📱 EnChi Mobile (React Native + Expo)

Client duy nhất của hệ thống EnChi. Chi tiết kế hoạch: [`../plan_frontend.md`](../plan_frontend.md).
Backend là repo riêng: [`../backend`](../backend).

## Chạy

```bash
cd mobile
npm install
# trỏ tới API Gateway. Thiết bị thật/emulator KHÔNG dùng localhost được:
#   - Android emulator:  http://10.0.2.2:8088
#   - thiết bị thật:     http://<IP-LAN-máy-bạn>:8088
$env:EXPO_PUBLIC_API_URL = "http://localhost:8088"   # PowerShell (web); hoặc set trong shell tương ứng
npm start                  # mở bằng Expo Go (QR) / emulator
npm run typecheck          # tsc --noEmit
```

> Backend phải đang chạy (`cd ../backend && docker compose up -d`). Cổng gateway local mặc định `8088` (xem `backend/.env`).

## Cấu trúc (`src/`)

```text
src/
├── api/            # client.ts (axios + JWT refresh) + types.ts + endpoints/{auth,content,progress,srs,media}
├── features/       # auth · courses · lesson · quiz · review · progress · leaderboard
├── components/     # ui.tsx (Screen/Card/Button/Loader…), TextField.tsx
├── navigation/     # RootNavigator (auth flow vs tabs) + typed param lists
├── store/          # authStore (zustand — client state)
└── lib/            # queryClient, theme, env
```

## Nguyên tắc (theo skill `react-native-expo-practices`)
- **Server state → TanStack Query**; **client state (auth) → Zustand**.
- Mọi request qua `src/api/client.ts` → gateway; token ở `expo-secure-store`; tự refresh khi 401.
- Sau `submitQuiz`: invalidate `['progress','me']`, `['srs','due']`, `['leaderboard']`.
- Audio TTS phát bằng `expo-av`, unload khi xong.

## Còn lại (nâng cấp sau)
- Màn Review hiện hiển thị theo `vocabId` (SRS chỉ lưu id) — cần thêm endpoint `content` lấy vocab theo ids để hiện từ.
- Polish UI/animation (streak/XP) — dùng skill `design-taste-frontend` + Reanimated.
- i18n (i18next) cho song ngữ giao diện.
