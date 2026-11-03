import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { cloneElement, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { AuthPageShell } from '../../components/auth/AuthPageShell';
import { Button } from '../../components/ui/Button';
import { authApi } from '../../features/auth/auth-api';
import { getAuthErrorMessage } from '../../features/auth/auth-error';
import { useAuthStore } from '../../features/auth/auth-store';
import { loginFormSchema, type LoginFormValues } from '../../features/auth/auth-schemas';

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema), defaultValues: { email: '', password: '' } });
  const mutation = useMutation({ mutationFn: authApi.login, onSuccess: (session) => { setSession(session.accessToken, session.user); navigate(['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'].includes(session.user.role) ? '/workspace' : session.user.role === 'PATIENT' ? '/my-appointments' : '/'); } });
  return <AuthPageShell title="Welcome back" subtitle="Sign in with your MediCare Pro account.">
    {mutation.isError ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800" role="alert">{getAuthErrorMessage(mutation.error)}</p> : null}
    <form className="mt-7 grid gap-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
      <AuthField label="Email address" error={form.formState.errors.email?.message}><input className="form-control" type="email" autoComplete="email" {...form.register('email')} /></AuthField>
      <AuthField label="Password" error={form.formState.errors.password?.message}><input className="form-control" type="password" autoComplete="current-password" {...form.register('password')} /></AuthField>
      <div className="-mt-2 text-right"><Link className="text-xs font-semibold text-teal-800 hover:text-teal-950" to="/forgot-password">Forgot password?</Link></div>
      <Button className="w-full" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Signing in…' : 'Sign in'}</Button>
    </form>
    <p className="mt-7 text-center text-sm text-slate-600">New to MediCare Pro? <Link className="font-semibold text-teal-800" to="/register">Create a patient account</Link></p>
  </AuthPageShell>;
}

function AuthField({ label, error, children }: { label: string; error: string | undefined; children: ReactElement }) {
  const id = `auth-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  const props = { id, ...(error ? { 'aria-describedby': `${id}-error` } : {}) };
  return <div><label htmlFor={id} className="form-label">{label}</label>{cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, props)}{error ? <p id={`${id}-error`} className="form-error">{error}</p> : null}</div>;
}
