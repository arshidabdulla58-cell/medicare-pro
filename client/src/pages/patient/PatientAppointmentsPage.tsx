import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CalendarDays, CircleCheck, Clock3, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { ErrorState, LoadingState } from '../../components/common/QueryState';
import { operationsApi } from '../../features/operations/operations-api';

const statusStyle: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  CHECKED_IN: 'bg-sky-50 text-sky-800 ring-sky-200',
  IN_PROGRESS: 'bg-teal-50 text-teal-800 ring-teal-200',
  COMPLETED: 'bg-slate-100 text-slate-700 ring-slate-200',
  CANCELLED: 'bg-rose-50 text-rose-800 ring-rose-200',
  NO_SHOW: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function PatientAppointmentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [doctorId, setDoctorId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const limit = 20;
  const appointments = useQuery({ queryKey: ['appointments', 'mine', page], queryFn: () => operationsApi.appointments(page, limit), refetchInterval: 60_000, refetchOnWindowFocus: true });
  const doctors = useQuery({ queryKey: ['patient', 'bookable-doctors'], queryFn: () => operationsApi.doctors() });
  const availability = useQuery({ queryKey: ['availability', doctorId], queryFn: () => operationsApi.availability(doctorId, 14), enabled: Boolean(doctorId) });
  const cancel = useMutation({ mutationFn: (id: string) => operationsApi.updateAppointmentStatus(id, 'CANCELLED'), onSuccess: () => { toast.success('Appointment cancelled'); void queryClient.invalidateQueries({ queryKey: ['appointments', 'mine'] }); }, onError: () => toast.error('We could not cancel the appointment. Refresh and try again.') });
  const book = useMutation({ mutationFn: operationsApi.createAppointment, onSuccess: () => { toast.success('Appointment request sent'); setSelectedSlot(''); setPage(1); void queryClient.invalidateQueries({ queryKey: ['appointments', 'mine'] }); void queryClient.invalidateQueries({ queryKey: ['availability', doctorId] }); }, onError: (error) => { const status = error instanceof Error && 'response' in error ? (error as { response?: { status?: number } }).response?.status : undefined; toast.error(status === 409 ? 'That slot was just booked or is no longer available. Choose another time.' : 'We could not book that appointment. Check your account and try again.'); } });

  if (appointments.isLoading) return <section className="section"><div className="container"><LoadingState label="Loading your appointments" /></div></section>;
  if (appointments.isError) return <section className="section"><div className="container"><ErrorState onRetry={() => void appointments.refetch()} /></div></section>;

  const items = appointments.data?.items ?? [];
  const selectedAvailability = availability.data?.slots.find((slot) => slot.startsAt === selectedSlot);
  const submitBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!doctorId || !selectedAvailability) return;
    book.mutate({ doctorId, startsAt: selectedAvailability.startsAt, timeZone: selectedAvailability.timeZone });
  };
  return <>
    <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_85%_0%,#d9f3ed_0%,transparent_36%),linear-gradient(180deg,#f7fafb,#edf6f4)] py-12 sm:py-16">
      <div className="container"><span className="eyebrow">Patient portal</span><div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Your appointments</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Appointments booked by you or the care team appear here. This page refreshes automatically while it’s open.</p></div><Button variant="secondary" onClick={() => void appointments.refetch()} disabled={appointments.isFetching}><CalendarClock size={16}/>{appointments.isFetching ? 'Refreshing…' : 'Refresh'}</Button></div></div>
    </section>
    <section className="section"><div className="container">
      <div className="surface-card mb-8 p-5 sm:p-7"><div className="mb-5"><h2 className="text-xl font-semibold text-slate-900">Book an appointment</h2><p className="mt-1 text-sm leading-6 text-slate-600">Choose an available doctor and time. Your appointment request will appear below with a pending status.</p></div>
        {doctors.isError ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">We couldn’t load the doctor list. Please refresh the page and try again.</p> : <form onSubmit={submitBooking} className="grid gap-4 sm:grid-cols-2"><label className="field-label">Doctor<select className="field-input" value={doctorId} onChange={(event) => { setDoctorId(event.target.value); setSelectedSlot(''); }} required><option value="">Choose a doctor</option>{doctors.data?.items.filter((doctor) => doctor.status === 'ACTIVE' && doctor.isPublic).map((doctor) => <option value={doctor.id} key={doctor.id}>{doctor.displayName} · {doctor.specialty}</option>)}</select></label><label className="field-label">Available time<select className="field-input" value={selectedSlot} onChange={(event) => setSelectedSlot(event.target.value)} required disabled={!doctorId || availability.isLoading || !availability.data?.slots.length}><option value="">{!doctorId ? 'Choose a doctor first' : availability.isLoading ? 'Loading availability…' : availability.data?.slots.length ? 'Choose a 30-minute slot' : 'No open times in the next 14 days'}</option>{availability.data?.slots.map((slot) => <option key={slot.startsAt} value={slot.startsAt}>{new Date(slot.startsAt).toLocaleString(undefined, { timeZone: slot.timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {slot.timeZone}</option>)}</select></label><div className="sm:col-span-2"><Button type="submit" disabled={!selectedAvailability || book.isPending}>{book.isPending ? 'Booking…' : 'Book appointment'}</Button>{availability.data?.slots.length === 0 && <p className="mt-2 text-xs text-slate-500">This doctor has no open slots in the displayed two-week period.</p>}</div></form>}
      </div>
      {items.length === 0 ? <div className="surface-card mx-auto max-w-2xl px-6 py-14 text-center sm:px-10"><div className="icon-box mx-auto"><CalendarDays size={22}/></div><h2 className="mt-5 text-xl font-semibold text-slate-900">No appointments yet</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Appointments booked by you or reception will show here.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{items.map((appointment) => {
        const canCancel = appointment.status === 'PENDING' || appointment.status === 'CONFIRMED';
        return <article className="surface-card p-5 sm:p-6" key={appointment.id}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-teal-50 text-teal-800"><Stethoscope size={20}/></span><div><h2 className="font-semibold text-slate-900">{appointment.doctor.displayName}</h2><p className="mt-1 text-sm text-slate-600">{appointment.doctor.specialty}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyle[appointment.status] ?? statusStyle.PENDING}`}>{appointment.status.replace('_', ' ')}</span></div>
          <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"><div className="flex items-start gap-2.5 text-sm text-slate-700"><CalendarDays size={16} className="mt-0.5 shrink-0 text-teal-700"/><span>{new Date(appointment.startsAt).toLocaleDateString(undefined, { timeZone: appointment.timeZone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div><div className="flex items-start gap-2.5 text-sm text-slate-700"><Clock3 size={16} className="mt-0.5 shrink-0 text-teal-700"/><span>{new Date(appointment.startsAt).toLocaleTimeString(undefined, { timeZone: appointment.timeZone, hour: 'numeric', minute: '2-digit' })} – {new Date(appointment.endsAt).toLocaleTimeString(undefined, { timeZone: appointment.timeZone, hour: 'numeric', minute: '2-digit' })}<span className="mt-1 block text-xs text-slate-500">{appointment.timeZone}</span></span></div></div>
          {appointment.status === 'CONFIRMED' && <p className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-800"><CircleCheck size={15}/> Your appointment is confirmed.</p>}
          {canCancel && <div className="mt-5 border-t border-slate-100 pt-4"><Button size="small" variant="secondary" disabled={cancel.isPending} onClick={() => cancel.mutate(appointment.id)}>{cancel.isPending ? 'Cancelling…' : 'Cancel appointment'}</Button></div>}
        </article>;
      })}</div>}
      {appointments.data && appointments.data.total > limit && <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Appointment history pagination"><Button variant="secondary" size="small" disabled={page === 1 || appointments.isFetching} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button><span className="text-xs text-slate-600">Page {page} of {Math.ceil(appointments.data.total / limit)}</span><Button variant="secondary" size="small" disabled={page * limit >= appointments.data.total || appointments.isFetching} onClick={() => setPage((value) => value + 1)}>Next</Button></nav>}
      <p className="mt-6 text-center text-xs leading-5 text-slate-500">For urgent medical concerns, contact your local emergency services. Appointment changes made by staff may take up to a minute to appear.</p>
    </div></section>
  </>;
}
