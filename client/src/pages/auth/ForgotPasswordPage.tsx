import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { cloneElement, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { AuthPageShell } from '../../components/auth/AuthPageShell';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../features/auth/auth-api';
import { getAuthErrorMessage } from '../../features/auth/auth-error';
import { emailFormSchema, type EmailFormValues } from '../../features/auth/auth-schemas';

export function ForgotPasswordPage() {
  const form = useForm<EmailFormValues>({ resolver: zodResolver(emailFormSchema), defaultValues: { email: '' } });
  const mutation = useMutation({ mutationFn: authApi.forgotPassword });
  return <AuthPageShell title="Reset your password" subtitle="We’ll send instructions if this address belongs to an active account.">
    {mutation.isSuccess ? <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900" role="status">{mutation.data.message} Check your inbox and spam folder.</div> : null}
    {mutation.isError ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800" role="alert">{getAuthErrorMessage(mutation.error)}</p> : null}
    {!mutation.isSuccess ? <form className="mt-7 grid gap-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values.email))} noValidate><AuthField label="Email address" error={form.formState.errors.email?.message}><input className="form-control" type="email" autoComplete="email" {...form.register('email')} /></AuthField><Button className="w-full" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Sending…' : 'Send reset instructions'}</Button></form> : null}
    <p className="mt-7 text-center text-sm text-slate-600"><Link className="font-semibold text-teal-800" to="/login">Return to sign in</Link></p>
  </AuthPageShell>;
}

function AuthField({ label, error, children }: { label: string; error: string | undefined; children: ReactElement }) {
  const id = 'auth-email-address';
  const props = { id, ...(error ? { 'aria-describedby': `${id}-error` } : {}) };
  return <div><label htmlFor={id} className="form-label">{label}</label>{cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, props)}{error ? <p id={`${id}-error`} className="form-error">{error}</p> : null}</div>;
}
