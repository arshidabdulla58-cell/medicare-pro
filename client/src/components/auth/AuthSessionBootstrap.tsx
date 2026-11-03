import { useEffect } from 'react';
import { authApi } from '../../features/auth/auth-api';
import { useAuthStore } from '../../features/auth/auth-store';

export function AuthSessionBootstrap() {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setAuthReady = useAuthStore((state) => state.setAuthReady);

  useEffect(() => {
    let active = true;
    const initialAccessToken = useAuthStore.getState().accessToken;
    void authApi.refresh().then((session) => {
      if (active) setSession(session.accessToken, session.user);
    }).catch(() => {
      if (active && useAuthStore.getState().accessToken === initialAccessToken) clearSession();
    }).finally(() => { if (active) setAuthReady(); });
    return () => { active = false; };
  }, [clearSession, setAuthReady, setSession]);

  return null;
}
