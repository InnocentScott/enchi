// Logic chấm điểm THUẦN — không phụ thuộc Nest/Prisma, dễ unit-test.

export interface AnswerInput {
  questionId: string;
  optionId: string;
}

export interface QuestionForScoring {
  id: string;
  vocabId: string | null;
  correctOptionId: string | null;
}

export interface VocabResult {
  vocabId: string;
  correct: boolean;
  quality: number; // 0-5 cho SM-2 (SRS service tiêu thụ qua event)
}

export interface ScoreResult {
  score: number;
  total: number;
  results: VocabResult[];
}

// Ánh xạ đúng/sai -> quality SM-2: đúng = 5, sai = 2 (SM-2 coi quality < 3 là "quên", reset lịch).
const QUALITY_CORRECT = 5;
const QUALITY_WRONG = 2;

export function scoreQuiz(questions: QuestionForScoring[], answers: AnswerInput[]): ScoreResult {
  const chosenByQuestion = new Map(answers.map((a) => [a.questionId, a.optionId]));
  let score = 0;
  const results: VocabResult[] = [];

  for (const q of questions) {
    const chosen = chosenByQuestion.get(q.id);
    const correct = chosen != null && q.correctOptionId != null && chosen === q.correctOptionId;
    if (correct) score++;
    if (q.vocabId) {
      results.push({
        vocabId: q.vocabId,
        correct,
        quality: correct ? QUALITY_CORRECT : QUALITY_WRONG,
      });
    }
  }

  return { score, total: questions.length, results };
}
