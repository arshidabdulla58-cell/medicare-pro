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
import { registerFormSchema, type RegisterFormValues } from '../../features/auth/auth-schemas';

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const form = useForm<RegisterFormValues>({ resolver: zodResolver(registerFormSchema), defaultValues: { firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' } });
  const mutation = useMutation({ mutationFn: authApi.register, onSuccess: (session) => { setSession(session.accessToken, session.user); navigate('/my-appointments'); } });
  return <AuthPageShell title="Create your account" subtitle="Register for your personal MediCare Pro patient account.">
    {mutation.isError ? <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800" role="alert">{getAuthErrorMessage(mutation.error)}</p> : null}
    <form className="mt-7 grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(({ confirmPassword: _confirmPassword, ...values }) => mutation.mutate(values))} noValidate>
      <AuthField label="First name" error={form.formState.errors.firstName?.message}><input className="form-control" autoComplete="given-name" {...form.register('firstName')} /></AuthField>
      <AuthField label="Last name" error={form.formState.errors.lastName?.message}><input className="form-control" autoComplete="family-name" {...form.register('lastName')} /></AuthField>
      <div className="sm:col-span-2"><AuthField label="Email address" error={form.formState.errors.email?.message}><input className="form-control" type="email" autoComplete="email" {...form.register('email')} /></AuthField></div>
      <div className="sm:col-span-2"><AuthField label="Phone (optional)" error={form.formState.errors.phone?.message}><input className="form-control" type="tel" autoComplete="tel" {...form.register('phone')} /></AuthField></div>
      <AuthField label="Password" error={form.formState.errors.password?.message}><input className="form-control" type="password" autoComplete="new-password" {...form.register('password')} /></AuthField>
      <AuthField label="Confirm password" error={form.formState.errors.confirmPassword?.message}><input className="form-control" type="password" autoComplete="new-password" {...form.register('confirmPassword')} /></AuthField>
      <div className="sm:col-span-2"><p className="text-xs leading-5 text-slate-500">Use 12 or more characters. Avoid including health information in your account password.</p><Button className="mt-4 w-full" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating account…' : 'Create patient account'}</Button></div>
    </form>
    <p className="mt-6 text-center text-sm text-slate-600">Already registered? <Link className="font-semibold text-teal-800" to="/login">Sign in</Link></p>
  </AuthPageShell>;
}

function AuthField({ label, error, children }: { label: string; error: string | undefined; children: ReactElement }) {
  const id = `auth-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  const props = { id, ...(error ? { 'aria-describedby': `${id}-error` } : {}) };
  return <div><label htmlFor={id} className="form-label">{label}</label>{cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, props)}{error ? <p id={`${id}-error`} className="form-error">{error}</p> : null}</div>;
}
