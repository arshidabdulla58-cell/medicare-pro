import type { Role } from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: { id: string; hospitalId: string; role: Role; firstName: string; lastName: string };
    }
  }
}

export {};
