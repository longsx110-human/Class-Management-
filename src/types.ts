export type UserRole = 'admin' | 'hoc_vu' | 'sales';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  password?: string; // Standard password for mock auth
  createdAt?: string;
  updatedAt?: string;
}

export type ClassStatus = 'active' | 'upcoming' | 'full' | 'cancelled';

export interface Class {
  id: string;
  name: string;
  level: string;
  teacher: string;
  schedule: string;
  startDate: string;
  room: string;
  enrolledCount: number;
  maxCapacity: number;
  status: ClassStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
  syllabusUrl?: string;
  syllabusName?: string;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface ClassRequest {
  id: string;
  requestedLevel: string;
  preferredSchedule: string;
  expectedStartDate: string;
  interestCount: number;
  targetHeadcount: number;
  notes: string;
  submittedBy: string; // user id
  submittedByName: string; // user name
  status: RequestStatus;
  rejectionReason?: string;
  approvedClassId?: string;
  createdAt: string;
  updatedAt: string;
  documentUrl?: string;
  documentName?: string;
}

export interface EnrollmentLog {
  id: string;
  classId: string;
  className: string;
  updatedBy: string; // user id
  updatedByName: string; // user name
  previousCount: number;
  newCount: number;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}
