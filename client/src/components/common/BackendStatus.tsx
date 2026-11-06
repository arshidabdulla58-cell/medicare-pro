import { useBackendStatus } from '../../features/auth/backend-readiness';

export function BackendStatus() {
  const status = useBackendStatus((state) => state.status);
  if (status === 'idle' || status === 'ready') return null;
  return <div role="status" className="border-b border-teal-200 bg-teal-50 px-4 py-3 text-center text-sm text-teal-900">{status === 'connecting' ? 'Connecting to appointment services. The first connection may take about a minute. You can browse the website while you wait.' : 'Appointment services are taking longer to connect. Please try signing in again shortly.'}</div>;
}
