import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

// Lấy user id mà API Gateway đã verify (header X-User-Id). KHÔNG tự verify JWT ở đây.
export const UserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const header = req.headers['x-user-id'];
  const userId = Array.isArray(header) ? header[0] : header;
  if (!userId) {
    throw new UnauthorizedException('missing X-User-Id (request must go through the gateway)');
  }
  return userId;
});
