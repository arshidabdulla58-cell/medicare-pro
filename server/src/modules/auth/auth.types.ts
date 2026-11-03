export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'DOCTOR'
  | 'RECEPTIONIST'
  | 'NURSE'
  | 'PHARMACIST'
  | 'LAB_TECHNICIAN'
  | 'PATIENT';

export type AuthUserDto = { id: string; email: string; firstName: string; lastName: string; role: Role };
