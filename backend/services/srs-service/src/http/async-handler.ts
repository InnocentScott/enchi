import { RequestHandler } from 'express';

// Express 4 không bắt lỗi async tự động -> wrapper đẩy mọi reject vào error middleware.
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
