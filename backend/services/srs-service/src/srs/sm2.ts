// Thuật toán SM-2 (SuperMemo). Phần "khó" của dự án — pure function, dễ unit-test.
// Tham khảo: https://super-memory.com/english/ol/sm2.htm

export interface SrsState {
  /** Số lần ôn liên tiếp đúng (n). */
  repetitions: number;
  /** Ease factor (EF), tối thiểu 1.3. */
  easeFactor: number;
  /** Khoảng cách ôn tiếp theo, tính bằng ngày. */
  intervalDays: number;
}

export const INITIAL_STATE: SrsState = {
  repetitions: 0,
  easeFactor: 2.5,
  intervalDays: 0,
};

const MIN_EASE_FACTOR = 1.3;

/**
 * Cập nhật trạng thái SRS sau một lần trả lời.
 * @param state Trạng thái hiện tại của thẻ.
 * @param quality Chất lượng trả lời 0–5 (0 = quên hoàn toàn, 5 = nhớ hoàn hảo).
 * @returns Trạng thái mới + số ngày tới hạn ôn kế tiếp.
 */
export function review(state: SrsState, quality: number): SrsState {
  const q = clamp(Math.round(quality), 0, 5);

  // Trả lời sai (q < 3): reset chuỗi, ôn lại sau 1 ngày.
  if (q < 3) {
    return {
      repetitions: 0,
      easeFactor: adjustEaseFactor(state.easeFactor, q),
      intervalDays: 1,
    };
  }

  const repetitions = state.repetitions + 1;
  let intervalDays: number;
  if (repetitions === 1) {
    intervalDays = 1;
  } else if (repetitions === 2) {
    intervalDays = 6;
  } else {
    intervalDays = Math.round(state.intervalDays * state.easeFactor);
  }

  return {
    repetitions,
    easeFactor: adjustEaseFactor(state.easeFactor, q),
    intervalDays,
  };
}

/** EF' = EF + (0.1 − (5−q)·(0.08 + (5−q)·0.02)), chặn dưới 1.3. */
function adjustEaseFactor(ef: number, q: number): number {
  const next = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return Math.max(MIN_EASE_FACTOR, Number(next.toFixed(4)));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
