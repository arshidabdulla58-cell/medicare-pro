import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { operationsApi, type AppointmentSummary } from '../../features/operations/operations-api';
import { PatientAppointmentsPage } from './PatientAppointmentsPage';

const booking: AppointmentSummary = {
  id: 'appointment-1',
  patient: { patientNumber: 'PT-ABC123', firstName: 'Ava', lastName: 'Park' },
  doctor: { displayName: 'Jordan Lee', specialty: 'Cardiology' },
  startsAt: '2027-02-03T03:00:00.000Z',
  endsAt: '2027-02-03T03:30:00.000Z',
  timeZone: 'Asia/Bangkok',
  status: 'CONFIRMED',
};

describe('patient appointments page', () => {
  beforeEach(() => {
    vi.spyOn(operationsApi, 'appointments').mockResolvedValue({ items: [booking], page: 1, limit: 100, total: 1 });
    vi.spyOn(operationsApi, 'doctors').mockResolvedValue({ items: [{ id: 'doctor-1', displayName: 'Jordan Lee', specialty: 'Cardiology', qualification: 'MD', experienceYears: 8, status: 'ACTIVE', isPublic: true, availabilityTimeZone: 'Asia/Bangkok', weeklyAvailability: [{ dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }] }], page: 1, limit: 25, total: 1 });
    vi.spyOn(operationsApi, 'availability').mockResolvedValue({ doctor: { id: 'doctor-1', timeZone: 'Asia/Bangkok' }, slots: [{ startsAt: '2027-02-04T03:00:00.000Z', endsAt: '2027-02-04T03:30:00.000Z', timeZone: 'Asia/Bangkok' }] });
    vi.spyOn(operationsApi, 'createAppointment').mockResolvedValue({ id: 'appointment-2', status: 'PENDING' });
    vi.spyOn(operationsApi, 'updateAppointmentStatus').mockResolvedValue({ id: booking.id, status: 'CANCELLED' });
  });

  it('shows an appointment booked for the patient and allows cancellation', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={queryClient}><PatientAppointmentsPage /></QueryClientProvider></MemoryRouter>);

    expect(await screen.findByText('Jordan Lee')).toBeInTheDocument();
    expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel appointment' }));
    expect(operationsApi.updateAppointmentStatus).toHaveBeenCalledWith('appointment-1', 'CANCELLED');
  });

  it('shows an empty state when the patient has no appointments', async () => {
    vi.mocked(operationsApi.appointments).mockResolvedValue({ items: [], page: 1, limit: 100, total: 0 });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={queryClient}><PatientAppointmentsPage /></QueryClientProvider></MemoryRouter>);

    expect(await screen.findByText('No appointments yet')).toBeInTheDocument();
  });

  it('books a patient appointment from the doctor availability list', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={queryClient}><PatientAppointmentsPage /></QueryClientProvider></MemoryRouter>);

    await user.selectOptions(await screen.findByLabelText('Doctor'), 'doctor-1');
    await user.selectOptions(await screen.findByLabelText('Available time'), '2027-02-04T03:00:00.000Z');
    await user.click(screen.getByRole('button', { name: 'Book appointment' }));

    expect(vi.mocked(operationsApi.createAppointment).mock.calls[0]?.[0]).toEqual({ doctorId: 'doctor-1', startsAt: '2027-02-04T03:00:00.000Z', timeZone: 'Asia/Bangkok' });
  });
});
