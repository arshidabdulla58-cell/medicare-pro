import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore, type AuthRole, type AuthUser } from './auth-store';
import { waitForBackend } from './backend-readiness';

export const apiHttp = axios.create({ baseURL: '/api/v1', timeout: 12_000, withCredentials: true });
type Envelope<T> = { data: T };
type Session = { user: AuthUser; accessToken: string };

export const authApi = {
  async login(input: { email: string; password: string }) {
    const { data } = await apiHttp.post<Envelope<Session>>('/auth/login', input);
    return data.data;
  },
  async register(input: { firstName: string; lastName: string; email: string; phone?: string | undefined; password: string }) {
    const { data } = await apiHttp.post<Envelope<Session>>('/auth/register', input);
    return data.data;
  },
  async refresh() {
    const { data } = await apiHttp.post<Envelope<Session>>('/auth/refresh');
    return data.data;
  },
  async logout() {
    await apiHttp.post('/auth/logout');
  },
  async forgotPassword(email: string) {
    const { data } = await apiHttp.post<Envelope<{ message: string }>>('/auth/forgot-password', { email });
    return data.data;
  },
  async resetPassword(token: string, password: string) {
    const { data } = await apiHttp.post<Envelope<{ message: string }>>('/auth/reset-password', { token, password });
    return data.data;
  },
};

let refreshRequest: Promise<Session> | null = null;

apiHttp.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await waitForBackend();
  const { accessToken } = useAuthStore.getState();
  if (accessToken && config.url !== '/auth/refresh') config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiHttp.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config || error.response?.status !== 401) throw error;
    const config = error.config as InternalAxiosRequestConfig & { _authRetry?: boolean };
    if (config._authRetry || config.url === '/auth/refresh' || config.url === '/auth/login' || config.url === '/auth/register') throw error;
    config._authRetry = true;
    refreshRequest ??= apiHttp.post<Envelope<Session>>('/auth/refresh').then((response) => response.data.data).finally(() => { refreshRequest = null; });
    try {
      const session = await refreshRequest;
      useAuthStore.getState().setSession(session.accessToken, session.user);
      config.headers.Authorization = `Bearer ${session.accessToken}`;
      return await apiHttp.request(config);
    } catch {
      useAuthStore.getState().clearSession();
      throw error;
    }
  },
);

export function userCanAccess(user: AuthUser | null, roles: AuthRole[]) {
  return Boolean(user && roles.includes(user.role));
}
