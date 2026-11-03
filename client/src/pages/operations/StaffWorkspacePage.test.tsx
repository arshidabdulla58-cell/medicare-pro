import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { operationsApi } from '../../features/operations/operations-api';
import { useAuthStore } from '../../features/auth/auth-store';
import { StaffWorkspacePage } from './StaffWorkspacePage';

describe('staff workspace', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession('test-access-token', { id: 'staff-1', email: 'staff@example.test', firstName: 'Morgan', lastName: 'Lee', role: 'RECEPTIONIST' });
    vi.spyOn(operationsApi, 'patients').mockResolvedValue({ items: [], page: 1, limit: 25, total: 0 });
    vi.spyOn(operationsApi, 'createPatient').mockResolvedValue({ id: 'patient-1', patientNumber: 'PT-ABC123' });
    vi.spyOn(operationsApi, 'updatePatient').mockResolvedValue({ id: 'patient-1', patientNumber: 'PT-ABC123', firstName: 'Ava-Marie', lastName: 'Park', status: 'ACTIVE' });
  });

  it('registers a patient and shows the persisted API response', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={queryClient}><StaffWorkspacePage /></QueryClientProvider></MemoryRouter>);

    await user.type(screen.getByLabelText('First name'), 'Ava');
    await user.type(screen.getByLabelText('Last name'), 'Park');
    await user.click(screen.getByRole('button', { name: 'Register patient' }));

    expect(vi.mocked(operationsApi.createPatient).mock.calls[0]?.[0]).toEqual({ firstName: 'Ava', lastName: 'Park' });
    expect(await screen.findByText('No patients yet')).toBeInTheDocument();
  });

  it('edits administrative patient details through the update API', async () => {
    const user = userEvent.setup();
    vi.mocked(operationsApi.patients).mockResolvedValue({ items: [{ id: 'patient-1', patientNumber: 'PT-ABC123', firstName: 'Ava', lastName: 'Park', phone: '5551234', status: 'ACTIVE', createdAt: '2026-11-03T00:00:00.000Z' }], page: 1, limit: 25, total: 1 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={queryClient}><StaffWorkspacePage /></QueryClientProvider></MemoryRouter>);

    await user.click(await screen.findByRole('button', { name: 'Edit Ava Park' }));
    const form = screen.getByRole('button', { name: 'Save changes' }).closest('form');
    expect(form).not.toBeNull();
    await user.clear(within(form as HTMLFormElement).getByLabelText('First name'));
    await user.type(within(form as HTMLFormElement).getByLabelText('First name'), 'Ava-Marie');
    await user.clear(within(form as HTMLFormElement).getByLabelText('Phone (optional)'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(operationsApi.updatePatient).toHaveBeenCalledWith('patient-1', { firstName: 'Ava-Marie', lastName: 'Park', phone: '' });
  });
});
