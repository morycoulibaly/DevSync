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

  return { ...environment, PORT: port, FRONTEND_URL: frontendUrl };
}
