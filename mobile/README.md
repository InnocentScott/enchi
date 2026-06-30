# 📱 EnChi Mobile (React Native + Expo)

The single client of the EnChi system. Plan details: [`../plan_frontend.md`](../plan_frontend.md).
The backend is a separate repo: [`../backend`](../backend).

## Run

```bash
cd mobile
npm install
# point to the API Gateway. A real device/emulator CANNOT use localhost:
#   - Android emulator:  http://10.0.2.2:8088
#   - real device:       http://<your-machine-LAN-IP>:8088
$env:EXPO_PUBLIC_API_URL = "http://localhost:8088"   # PowerShell (web); or set it in the corresponding shell
npm start                  # open with Expo Go (QR) / emulator
npm run typecheck          # tsc --noEmit
```

> The backend must be running (`cd ../backend && docker compose up -d`). The default local gateway port is `8088` (see `backend/.env`).

## Structure (`src/`)

```text
src/
├── api/            # client.ts (axios + JWT refresh) + types.ts + endpoints/{auth,content,progress,srs,media}
├── features/       # auth · courses · lesson · quiz · review · progress · leaderboard
├── components/     # ui.tsx (Screen/Card/Button/Loader…), TextField.tsx
├── navigation/     # RootNavigator (auth flow vs tabs) + typed param lists
├── store/          # authStore (zustand — client state)
└── lib/            # queryClient, theme, env
```

## Principles (per the `react-native-expo-practices` skill)
- **Server state → TanStack Query**; **client state (auth) → Zustand**.
- All requests go through `src/api/client.ts` → gateway; tokens in `expo-secure-store`; auto-refresh on 401.
- After `submitQuiz`: invalidate `['progress','me']`, `['srs','due']`, `['leaderboard']`.
- TTS audio plays via `expo-av`, unload when done.

## Remaining (future improvements)
- The Review screen currently displays by `vocabId` (SRS only stores the id) — need to add a `content` endpoint to fetch vocab by ids so the words can be shown.
- Polish UI/animation (streak/XP) — use the `design-taste-frontend` skill + Reanimated.
- i18n (i18next) for a bilingual interface.
