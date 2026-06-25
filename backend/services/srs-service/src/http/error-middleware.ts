import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export interface HttpError extends Error {
  status: number;
  code: string;
}

export function httpError(status: number, code: string, message: string): HttpError {
  const e = new Error(message) as HttpError;
  e.status = status;
  e.code = code;
  return e;
}

// Error middleware tập trung -> error envelope { code, message }.
export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ code: 'BAD_REQUEST', message: err.issues.map((i) => i.message).join('; ') });
    return;
  }
  const status = typeof err?.status === 'number' ? err.status : 500;
  if (status >= 500) {
    console.error(JSON.stringify({ level: 'error', msg: 'unhandled', err: String(err?.message ?? err) }));
    res.status(500).json({ code: 'INTERNAL', message: 'internal server error' });
    return;
  }
  res.status(status).json({ code: err.code ?? 'ERROR', message: err.message });
};
