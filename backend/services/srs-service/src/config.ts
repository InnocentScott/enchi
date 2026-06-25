// Đọc env một lần, fail-fast nếu thiếu.
export interface Config {
  port: number;
  databaseUrl: string;
  rabbitUrl: string;
}

export function loadConfig(): Config {
  const databaseUrl = process.env.SRS_DATABASE_URL;
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!databaseUrl) throw new Error('SRS_DATABASE_URL is required');
  if (!rabbitUrl) throw new Error('RABBITMQ_URL is required');
  return {
    port: Number(process.env.PORT ?? 8004),
    databaseUrl,
    rabbitUrl,
  };
}
