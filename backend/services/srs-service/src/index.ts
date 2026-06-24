import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

app.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'srs-service' });
});

// Các từ tới hạn ôn hôm nay (due_date <= now). Implement Phase 4.
app.get('/srs/due', (_req: Request, res: Response) => {
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'GET /srs/due chưa được implement' });
});

// Ghi nhận trả lời -> cập nhật SM-2 (xem src/srs/sm2.ts) -> due_date mới. Implement Phase 4.
app.post('/srs/answer', (_req: Request, res: Response) => {
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'POST /srs/answer chưa được implement' });
});

// TODO (Phase 4): consumer RabbitMQ `srs.quiz_completed` -> upsert srs_cards bằng review() từ sm2.ts.

const port = process.env.PORT ?? 8004;
app.listen(port, () => console.log(`srs-service listening on :${port}`));
