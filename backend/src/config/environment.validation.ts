/** Validate and normalize environment variables once, when the API starts. */
export function validateEnvironment(environment: Record<string, unknown>) {
  const port = Number(environment.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const frontendUrl = String(environment.FRONTEND_URL ?? 'http://localhost:3000');
  try {
    new URL(frontendUrl);
  } catch {
    throw new Error('FRONTEND_URL must be a valid absolute URL.');
  }

  const redisPort = Number(environment.REDIS_PORT ?? 6379);
  if (!Number.isInteger(redisPort) || redisPort < 1 || redisPort > 65535) {
    throw new Error('REDIS_PORT must be an integer between 1 and 65535.');
  }

  return {
    ...environment,
    PORT: port,
    FRONTEND_URL: frontendUrl,
    REDIS_HOST: String(environment.REDIS_HOST ?? 'localhost'),
    REDIS_PORT: redisPort,
    GEMINI_MODEL: String(environment.GEMINI_MODEL ?? 'gemini-3.7-flash'),
  };
}
