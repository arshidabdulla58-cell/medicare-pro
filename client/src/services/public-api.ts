import axios from 'axios';
import type { z } from 'zod';
import type { contactSchema } from '../features/contact/contact-schema';

const http = axios.create({ baseURL: '/api/v1', timeout: 10_000, headers: { Accept: 'application/json' } });

export type Department = { id: string; name: string; slug: string; summary: string; iconKey: string };
export type Doctor = {
  id: string;
  displayName: string;
  specialty: string;
  departmentName?: string;
  qualification: string;
  experienceYears: number;
  biography?: string;
};
type DataResponse<T> = { data: T };

export const publicApi = {
  async departments() {
    const { data } = await http.get<DataResponse<Department[]>>('/public/departments');
    return data.data;
  },
  async doctors() {
    const { data } = await http.get<DataResponse<Doctor[]>>('/public/doctors');
    return data.data;
  },
  async submitContact(payload: z.infer<typeof contactSchema>) {
    const { data } = await http.post<DataResponse<{ reference: string }>>('/public/contact', payload);
    return data.data;
  },
};
