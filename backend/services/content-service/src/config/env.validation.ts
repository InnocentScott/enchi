import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('8002'),
  CONTENT_DATABASE_URL: z.string().min(1, 'CONTENT_DATABASE_URL is required'),
  RABBITMQ_URL: z.string().min(1, 'RABBITMQ_URL is required'),
});

export type Env = z.infer<typeof envSchema>;

// Fail-fast lúc bootstrap nếu env thiếu/không hợp lệ.
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }
  return parsed.data;
}
