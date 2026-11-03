import { AlertCircle, LoaderCircle } from 'lucide-react';
import { Button } from '../ui/Button';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-600" role="status"><LoaderCircle className="animate-spin text-teal-700" size={20} aria-hidden="true" />{label}</div>;
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="surface-card mx-auto max-w-xl p-8 text-center" role="alert"><div className="icon-box mx-auto mb-4"><AlertCircle size={22} /></div><h2 className="text-lg font-semibold text-slate-900">We couldn't load this information</h2><p className="mt-2 text-sm leading-6 text-slate-600">Check your connection and try again.</p><Button className="mt-5" variant="secondary" onClick={onRetry}>Try again</Button></div>;
}
