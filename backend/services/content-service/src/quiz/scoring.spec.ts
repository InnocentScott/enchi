import { scoreQuiz, QuestionForScoring, AnswerInput } from './scoring';

const questions: QuestionForScoring[] = [
  { id: 'q1', vocabId: 'v1', correctOptionId: 'o1' },
  { id: 'q2', vocabId: 'v2', correctOptionId: 'o3' },
  { id: 'q3', vocabId: null, correctOptionId: 'o5' }, // không gắn vocab -> không vào results
];

describe('scoreQuiz', () => {
  it('counts correct answers and maps quality per vocab', () => {
    const answers: AnswerInput[] = [
      { questionId: 'q1', optionId: 'o1' }, // correct
      { questionId: 'q2', optionId: 'o4' }, // wrong
      { questionId: 'q3', optionId: 'o5' }, // correct but no vocab
    ];
    const r = scoreQuiz(questions, answers);
    expect(r.total).toBe(3);
    expect(r.score).toBe(2);
    expect(r.results).toEqual([
      { vocabId: 'v1', correct: true, quality: 5 },
      { vocabId: 'v2', correct: false, quality: 2 },
    ]);
  });

  it('treats missing answers as wrong', () => {
    const r = scoreQuiz(questions, []);
    expect(r.score).toBe(0);
    expect(r.results.every((x) => !x.correct && x.quality === 2)).toBe(true);
    expect(r.results).toHaveLength(2); // chỉ 2 câu có vocab
  });

  it('does not award a point when correctOptionId is null', () => {
    const r = scoreQuiz(
      [{ id: 'q1', vocabId: 'v1', correctOptionId: null }],
      [{ questionId: 'q1', optionId: 'whatever' }],
    );
    expect(r.score).toBe(0);
  });
});
