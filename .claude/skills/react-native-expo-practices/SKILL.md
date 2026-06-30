---
name: react-native-expo-practices
description: Best practices for the EnChi mobile app (React Native + Expo + TypeScript). Use whenever writing, reviewing, or debugging code under mobile/ — covers feature-based structure, strict TS, TanStack Query for server state, Zustand for client state, typed navigation, react-hook-form + zod, secure token storage + axios interceptors, audio playback/caching, list performance, and Reanimated. Load this before touching any file in mobile/. For visual/aesthetic design of screens, also load design-taste-frontend.
---

# React Native + Expo Practices (EnChi mobile)

The single client. Calls the backend through the API Gateway. TS strict, feature-based architecture.

## Structure (feature-based)
```
src/
├── api/         # client.ts (axios + JWT refresh) + endpoints/ per service
├── features/<name>/  # screens + hooks + components specific to the feature
├── components/  # shared UI
├── store/       # zustand (client state ONLY: auth, session, UI)
├── hooks/       # shared hooks
└── lib/         # queryClient, theme, env
```

## State — keep it clearly separated (important)
- **Server state = TanStack Query.** All data from the backend (courses, lessons, progress, due cards, leaderboard) uses `useQuery`/`useMutation`. Do NOT stuff it into Zustand.
- **Client state = Zustand.** Only: auth state (logged in?), the in-progress quiz session, UI toggles.
- Structured query keys: `['progress','me']`, `['srs','due']`, `['courses']`. After `submitQuiz` → `invalidateQueries` for `['progress','me']`, `['srs','due']`, `['leaderboard']`.
- Optimistic update for XP/streak on submit, rollback `onError`.

## Networking
- Use `src/api/client.ts` (already present): axios + an interceptor that attaches `Bearer` and auto-refreshes on 401 (single-flight). Base URL from `EXPO_PUBLIC_API_URL` → gateway.
- Store the token in `expo-secure-store` (NOT AsyncStorage for the token). Do not log the token.
- One file per service in `api/endpoints/`; components never call `axios` directly.

## Forms & validation
- `react-hook-form` + `zod` (`zodResolver`). Mirror the backend DTO constraints (email, password length) to fail early on the client.

## Navigation
- React Navigation with a **typed param list** (`type RootStackParamList`). Do not pass untyped params.

## Performance
- Long lists (vocabulary, leaderboard): `FlatList`/`FlashList` with `keyExtractor`, plus `getItemLayout` when items have a fixed size; avoid heavy inline functions in `renderItem`.
- `React.memo` for items; `useCallback`/`useMemo` where appropriate (do not overuse).
- Gamification animations (XP bar, streak, confetti): **Reanimated** (runs on the UI thread), do not animate via `setState` every frame.

## Audio (expo-av)
- Play TTS files from the Media Service. Cache by `text+lang` with `expo-file-system`; preload a lesson's audio when it opens so the Media Service is not called again.
- Unload the `Sound` when leaving the screen (avoid memory leaks).

## UX states
- Every screen handles loading / empty / error properly (using TanStack Query's states). Provide a skeleton for the main screens.

## Visual design
- When a screen needs to look "polished"/on-brand, **also load the `design-taste-frontend` skill** and apply it.

## Anti-patterns (avoid)
- Server state in Zustand; calling axios inside a component; token in AsyncStorage/logs; `any`; animating via state; forgetting to unload audio; long lists using `.map` inside a `ScrollView`.
