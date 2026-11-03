import { ArrowRight, HeartPulse, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { publicApi, type Department, type Doctor } from '../../services/public-api';
import { ErrorState, LoadingState } from '../common/QueryState';

const iconMap = { heart: HeartPulse, pulse: HeartPulse, stethoscope: Stethoscope } as const;

export function DepartmentGrid({ limit }: { limit?: number }) {
  const query = useQuery({ queryKey: ['public', 'departments'], queryFn: publicApi.departments });
  if (query.isPending) return <LoadingState label="Loading departments" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const departments = limit ? query.data.slice(0, limit) : query.data;
  if (departments.length === 0) return <EmptyDirectory kind="departments" />;
  return <div className="grid-3">{departments.map((department) => <DepartmentCard key={department.id} department={department} />)}</div>;
}

function DepartmentCard({ department }: { department: Department }) {
  const Icon = iconMap[department.iconKey as keyof typeof iconMap] ?? HeartPulse;
  return <article className="surface-card group p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg"><div className="icon-box"><Icon size={22} /></div><h3 className="mt-5 text-lg font-semibold text-slate-900">{department.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{department.summary}</p><Link to={`/contact?topic=APPOINTMENT&department=${encodeURIComponent(department.slug)}#contact-form`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-800">Ask about care <ArrowRight size={15} className="transition group-hover:translate-x-1" /></Link></article>;
}

export function DoctorGrid({ limit }: { limit?: number }) {
  const query = useQuery({ queryKey: ['public', 'doctors'], queryFn: publicApi.doctors });
  if (query.isPending) return <LoadingState label="Loading care team" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;
  const doctors = limit ? query.data.slice(0, limit) : query.data;
  if (doctors.length === 0) return <EmptyDirectory kind="doctors" />;
  return <div className="grid-3">{doctors.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} />)}</div>;
}

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const initials = doctor.displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return <article className="surface-card overflow-hidden p-5"><div className="flex items-center gap-4"><div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(145deg,#d8f3ed,#b7dedc)] text-sm font-bold text-teal-900">{initials}</div><div><h3 className="font-semibold text-slate-900">{doctor.displayName}</h3><p className="mt-1 text-sm text-teal-800">{doctor.specialty}</p></div></div><p className="mt-5 text-sm leading-6 text-slate-600">{doctor.biography || doctor.qualification}</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-1.5">{doctor.qualification}</span><span className="rounded-full bg-slate-100 px-3 py-1.5">{doctor.experienceYears} years' experience</span></div></article>;
}

function EmptyDirectory({ kind }: { kind: 'departments' | 'doctors' }) {
  const title = kind === 'departments' ? 'Department information is being prepared' : 'Care team profiles are being prepared';
  const body = kind === 'departments' ? 'Please contact us if you need help finding the right service.' : 'Send an enquiry and our team can help with your care request.';
  return <div className="surface-card mx-auto max-w-2xl p-8 text-center"><div className="icon-box mx-auto"><HeartPulse size={22} /></div><h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{body}</p><Link to="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-teal-800">Contact our team <ArrowRight size={15} /></Link></div>;
}
