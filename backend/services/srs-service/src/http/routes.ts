import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from './async-handler';
import { httpError } from './error-middleware';
import { SrsService } from '../service/srs-service';

const answerSchema = z.object({
  vocabId: z.string().min(1, 'vocabId is required'),
  quality: z.number().int().min(0).max(5),
});

export function buildRoutes(svc: SrsService): Router {
  const r = Router();

  // Các từ tới hạn ôn hôm nay.
  r.get(
    '/srs/due',
    asyncHandler(async (req, res) => {
      const userId = req.header('x-user-id');
      if (!userId) throw httpError(401, 'UNAUTHORIZED', 'missing X-User-Id');
      const limit = Math.min(Number(req.query.limit ?? 20) || 20, 100);
      res.json(await svc.getDue(userId, limit));
    }),
  );

  // Ghi nhận trả lời 1 thẻ (quality 0-5) -> lịch ôn mới.
  r.post(
    '/srs/answer',
    asyncHandler(async (req, res) => {
      const userId = req.header('x-user-id');
      if (!userId) throw httpError(401, 'UNAUTHORIZED', 'missing X-User-Id');
      const { vocabId, quality } = answerSchema.parse(req.body);
      res.json(await svc.answer(userId, vocabId, quality));
    }),
  );

  return r;
}
