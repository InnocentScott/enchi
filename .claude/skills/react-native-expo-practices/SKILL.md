---
name: react-native-expo-practices
description: Best practices for the EnChi mobile app (React Native + Expo + TypeScript). Use whenever writing, reviewing, or debugging code under mobile/ — covers feature-based structure, strict TS, TanStack Query for server state, Zustand for client state, typed navigation, react-hook-form + zod, secure token storage + axios interceptors, audio playback/caching, list performance, and Reanimated. Load this before touching any file in mobile/. For visual/aesthetic design of screens, also load design-taste-frontend.
---

# React Native + Expo Practices (EnChi mobile)

Client duy nhất. Gọi backend qua API Gateway. TS strict, kiến trúc feature-based.

## Cấu trúc (feature-based)
```
src/
├── api/         # client.ts (axios + JWT refresh) + endpoints/ theo service
├── features/<name>/  # screens + hooks + components riêng của feature
├── components/  # UI dùng chung
├── store/       # zustand (CHỈ client state: auth, session, UI)
├── hooks/       # hook dùng chung
└── lib/         # queryClient, theme, env
```

## State — tách bạch rõ ràng (quan trọng)
- **Server state = TanStack Query.** Mọi dữ liệu từ backend (courses, lessons, progress, due cards, leaderboard) dùng `useQuery`/`useMutation`. KHÔNG nhét vào Zustand.
- **Client state = Zustand.** Chỉ: trạng thái auth (đã đăng nhập?), session làm bài tạm, toggle UI.
- Query key có cấu trúc: `['progress','me']`, `['srs','due']`, `['courses']`. Sau `submitQuiz` → `invalidateQueries` cho `['progress','me']`, `['srs','due']`, `['leaderboard']`.
- Optimistic update cho XP/streak khi submit, rollback `onError`.

## Networking
- Dùng `src/api/client.ts` (đã có): axios + interceptor đính `Bearer` + tự refresh khi 401 (single-flight). Base URL từ `EXPO_PUBLIC_API_URL` → gateway.
- Token lưu `expo-secure-store` (KHÔNG AsyncStorage cho token). Không log token.
- Mỗi service một file trong `api/endpoints/`; component không gọi `axios` trực tiếp.

## Forms & validation
- `react-hook-form` + `zod` (`zodResolver`). Mirror ràng buộc của DTO backend (email, độ dài mật khẩu) để fail sớm ở client.

## Navigation
- React Navigation với **param list typed** (`type RootStackParamList`). Không truyền param không kiểu.

## Performance
- Danh sách dài (từ vựng, leaderboard): `FlatList`/`FlashList` với `keyExtractor`, `getItemLayout` khi item cố định; tránh inline function nặng trong `renderItem`.
- `React.memo` cho item; `useCallback`/`useMemo` đúng chỗ (không lạm dụng).
- Animation gamification (XP bar, streak, confetti): **Reanimated** (chạy trên UI thread), không animate bằng `setState` mỗi frame.

## Audio (expo-av)
- Phát file TTS từ Media Service. Cache theo `text+lang` bằng `expo-file-system`; preload audio của bài học khi mở để không gọi lại Media.
- Unload `Sound` khi rời màn (tránh rò bộ nhớ).

## UX trạng thái
- Mỗi màn xử lý đủ loading / empty / error (dùng trạng thái của TanStack Query). Có skeleton cho màn chính.

## Visual design
- Khi cần làm màn hình "đẹp"/branding, **load thêm skill `design-taste-frontend`** và áp dụng.

## Anti-patterns (tránh)
- Server state trong Zustand; gọi axios trong component; token trong AsyncStorage/log; `any`; animate qua state; quên unload audio; danh sách dài dùng `.map` trong `ScrollView`.
