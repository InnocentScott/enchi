import { review, INITIAL_STATE, SrsState } from './sm2';

describe('SM-2 review', () => {
  it('grows intervals on a good streak (1 -> 6 -> ~16)', () => {
    let s: SrsState = { ...INITIAL_STATE };
    s = review(s, 5);
    expect(s.repetitions).toBe(1);
    expect(s.intervalDays).toBe(1);
    s = review(s, 4);
    expect(s.repetitions).toBe(2);
    expect(s.intervalDays).toBe(6);
    s = review(s, 5);
    expect(s.repetitions).toBe(3);
    expect(s.intervalDays).toBeGreaterThan(6); // round(6 * EF)
  });

  it('resets repetitions and interval on a failure (quality < 3)', () => {
    let s: SrsState = { repetitions: 5, easeFactor: 2.5, intervalDays: 40 };
    s = review(s, 1);
    expect(s.repetitions).toBe(0);
    expect(s.intervalDays).toBe(1);
  });

  it('never lets ease factor drop below 1.3', () => {
    let s: SrsState = { ...INITIAL_STATE };
    for (let i = 0; i < 10; i++) s = review(s, 0);
    expect(s.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('raises ease factor on perfect recall', () => {
    const s = review({ ...INITIAL_STATE }, 5);
    expect(s.easeFactor).toBeGreaterThan(INITIAL_STATE.easeFactor);
  });
});
