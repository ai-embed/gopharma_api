import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

export function loadBackendEnv(): void {
  const envFiles =
    process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID
      ? ['.env.test', '.env']
      : ['.env'];

  for (const envFile of envFiles) {
    loadEnvFile(resolve(process.cwd(), envFile));
  }
}

function loadEnvFile(envPath: string): void {
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
