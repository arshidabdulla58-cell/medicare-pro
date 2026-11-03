import { env } from './env.js';

const localDevelopmentOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

export function isTrustedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return origin === env.CLIENT_ORIGIN || (env.NODE_ENV !== 'production' && localDevelopmentOrigins.has(origin));
}
