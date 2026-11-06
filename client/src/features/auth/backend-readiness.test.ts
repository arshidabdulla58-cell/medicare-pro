import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useBackendStatus, waitForBackend } from './backend-readiness';

beforeEach(() => { useBackendStatus.setState({ status: 'idle' }); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('shares a single readiness check across concurrent requests', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { status: 'ready' } }) });
  vi.stubGlobal('fetch', fetchMock);
  await Promise.all([waitForBackend(), waitForBackend()]);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(useBackendStatus.getState().status).toBe('ready');
});

it('retries unavailable health responses before allowing requests through', async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true, json: async () => ({ data: { status: 'ready' } }) });
  vi.stubGlobal('fetch', fetchMock);
  const ready = waitForBackend();
  expect(useBackendStatus.getState().status).toBe('connecting');
  await vi.advanceTimersByTimeAsync(3000);
  await ready;
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(useBackendStatus.getState().status).toBe('ready');
});
