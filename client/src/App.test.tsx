import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { publicApi } from './services/public-api';
import { authApi } from './features/auth/auth-api';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('project shell', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    vi.spyOn(publicApi, 'departments').mockResolvedValue([]);
    vi.spyOn(publicApi, 'doctors').mockResolvedValue([]);
    vi.spyOn(authApi, 'refresh').mockRejectedValue(new Error('No active session in test.'));
  });

  it('renders the public home page and navigation', async () => {
    render(<QueryClientProvider client={queryClient}><App /></QueryClientProvider>);
    expect(await screen.findByRole('heading', { name: /A healthier path/i }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('renders an accessible sign-in page', async () => {
    render(<MemoryRouter initialEntries={['/login']}><QueryClientProvider client={queryClient}><LoginPage /></QueryClientProvider></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});
