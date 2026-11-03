import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { cloneElement, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthPageShell } from '../../components/auth/AuthPageShell';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../features/auth/auth-api';
import { getAuthErrorMessage } from '../../features/auth/auth-error';
import { resetFormSchema, type ResetFormValues } from '../../features/auth/auth-schemas';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const form = useForm<ResetFormValues>({ resolver: zodResolver(resetFormSchema), defaultValues: { password: '', confirmPassword: '' } });
  const mutation = useMutation({ mutationFn: (password: string) => authApi.resetPassword(token, password) });
  return <AuthPageShell title="Choose a new password" subtitle="Reset links expire after 30 minutes and can only be used once.">
    {!token ? <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="alert">This reset link is missing its token. Request a new link to continue.</p> : null}
    {mutation.isSuccess ? <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900" role="status">{mutation.data.message}</div> : null}
    {mutation.isError ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800" role="alert">{getAuthErrorMessage(mutation.error)}</p> : null}
    {token && !mutation.isSuccess ? <form className="mt-7 grid gap-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values.password))} noValidate><AuthField label="New password" error={form.formState.errors.password?.message}><input className="form-control" type="password" autoComplete="new-password" {...form.register('password')} /></AuthField><AuthField label="Confirm new password" error={form.formState.errors.confirmPassword?.message}><input className="form-control" type="password" autoComplete="new-password" {...form.register('confirmPassword')} /></AuthField><p className="text-xs text-slate-500">Use at least 12 characters.</p><Button className="w-full" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Updating…' : 'Update password'}</Button></form> : null}
    <p className="mt-7 text-center text-sm text-slate-600"><Link className="font-semibold text-teal-800" to="/login">Return to sign in</Link>{!token ? <> · <Link className="font-semibold text-teal-800" to="/forgot-password">Request a new link</Link></> : null}</p>
  </AuthPageShell>;
}

function AuthField({ label, error, children }: { label: string; error: string | undefined; children: ReactElement }) {
  const id = `auth-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  const props = { id, ...(error ? { 'aria-describedby': `${id}-error` } : {}) };
  return <div><label htmlFor={id} className="form-label">{label}</label>{cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, props)}{error ? <p id={`${id}-error`} className="form-error">{error}</p> : null}</div>;
}
