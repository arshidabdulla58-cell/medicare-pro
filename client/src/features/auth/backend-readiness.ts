import { create } from 'zustand';

export const useBackendStatus = create<{ status: 'idle' | 'connecting' | 'ready' | 'unavailable' }>(() => ({ status: 'idle' }));
let pending: Promise<void> | undefined;
export function waitForBackend(): Promise<void> {
  if (useBackendStatus.getState().status === 'ready') return Promise.resolve();
  pending ??= (async () => {
    useBackendStatus.setState({ status: 'connecting' });
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      try {
        const response = await fetch('/api/v1/health/ready', { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
        if (response.ok && (await response.json()).data?.status === 'ready') {
          useBackendStatus.setState({ status: 'ready' });
          return;
        }
      } catch { /* A sleeping service can time out; retry only the read-only health request. */ }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    useBackendStatus.setState({ status: 'unavailable' });
    throw new Error('The service is taking longer to connect. Please try again shortly.');
  })().finally(() => { pending = undefined; });
  return pending;
}
