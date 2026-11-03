import { apiHttp } from '../auth/auth-api';

type Page<T> = { items: T[]; page: number; limit: number; total: number };
export type PatientSummary = { id: string; patientNumber: string; firstName: string; lastName: string; phone?: string; status: string; createdAt: string };
export type DepartmentSummary = { id: string; name: string; slug: string; summary: string; status: string; isPublic: boolean };
export type DoctorSummary = { id: string; displayName: string; specialty: string; qualification: string; experienceYears: number; status: string; isPublic: boolean; availabilityTimeZone?: string; weeklyAvailability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }> };
export type AppointmentSummary = { id: string; patient: { patientNumber: string; firstName: string; lastName: string }; doctor: { displayName: string; specialty: string }; startsAt: string; endsAt: string; timeZone: string; status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'; reason?: string };
export type DashboardSummary = { range: { days: number; from: string; to: string }; metrics: { totalPatients: number; totalDoctors: number; activeDepartments: number; todayAppointments: number; pendingAppointments: number }; appointmentTrend: Array<{ date: string; count: number }>; departmentStats: Array<{ name: string; doctors: number }>; upcomingAppointments: Array<{ id: string; patient: { patientNumber: string; firstName: string; lastName: string }; doctor: { displayName: string; specialty: string }; startsAt: string; endsAt: string; timeZone: string; status: string }> };
const unwrap = <T,>(response: { data: { data: T } }) => response.data.data;

export const operationsApi = {
  activity: async (page = 1) => unwrap<Page<{ id: string; action: string; resourceType: string; timestamp: string }>>(await apiHttp.get('/analytics/activity', { params: { page } })),
  dashboard: async (days = 30) => unwrap<DashboardSummary>(await apiHttp.get('/analytics/dashboard', { params: { days } })),
  patients: async (search = '') => unwrap<Page<PatientSummary>>(await apiHttp.get('/patients', { params: { search, page: 1, limit: 25 } })),
  departments: async () => unwrap<Page<DepartmentSummary>>(await apiHttp.get('/departments', { params: { page: 1, limit: 100 } })),
  doctors: async (search = '') => unwrap<Page<DoctorSummary>>(await apiHttp.get('/doctors', { params: { search, page: 1, limit: 25 } })),
  createPatient: async (input: { firstName: string; lastName: string; phone?: string }) => unwrap<{ id: string; patientNumber: string }>(await apiHttp.post('/patients', input)),
  updatePatient: async (id: string, input: { firstName?: string; lastName?: string; phone?: string }) => unwrap<{ id: string; patientNumber: string; firstName: string; lastName: string; status: string }>(await apiHttp.patch(`/patients/${id}`, input)),
  createDepartment: async (input: { name: string; slug: string; summary: string; iconKey: 'heart' | 'pulse' | 'stethoscope'; sortOrder: number; isPublic: boolean; status: 'ACTIVE' | 'INACTIVE' }) => unwrap<{ id: string }>(await apiHttp.post('/departments', input)),
  updateDepartment: async (id: string, input: { name?: string; slug?: string; summary?: string; iconKey?: 'heart' | 'pulse' | 'stethoscope'; sortOrder?: number; isPublic?: boolean; status?: 'ACTIVE' | 'INACTIVE' }) => unwrap<{ id: string }>(await apiHttp.patch(`/departments/${id}`, input)),
  createDoctor: async (input: { displayName: string; specialty: string; qualification: string; experienceYears: number; isPublic: boolean; status: 'ACTIVE' | 'INACTIVE'; availabilityTimeZone?: string; weeklyAvailability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }> }) => unwrap<{ id: string }>(await apiHttp.post('/doctors', input)),
  updateDoctor: async (id: string, input: { displayName?: string; specialty?: string; qualification?: string; experienceYears?: number; isPublic?: boolean; status?: 'ACTIVE' | 'INACTIVE'; availabilityTimeZone?: string; weeklyAvailability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }> }) => unwrap<{ id: string }>(await apiHttp.patch(`/doctors/${id}`, input)),
  appointments: async (page = 1, limit = 100) => unwrap<Page<AppointmentSummary>>(await apiHttp.get('/appointments', { params: { page, limit } })),
  availability: async (doctorId: string, days = 14) => unwrap<{ doctor: { id: string; timeZone: string }; slots: Array<{ startsAt: string; endsAt: string; timeZone: string }> }>(await apiHttp.get('/appointments/availability', { params: { doctorId, days } })),
  createAppointment: async (input: { patientId?: string; doctorId: string; startsAt: string; timeZone: string; reason?: string }) => unwrap<{ id: string; status: string }>(await apiHttp.post('/appointments', input)),
  updateAppointmentStatus: async (id: string, status: 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW') => unwrap<{ id: string; status: string }>(await apiHttp.patch(`/appointments/${id}/status`, { status })),
};
