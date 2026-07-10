export type Role = 'Admin' | 'Employee';

export interface User {
  id: string;
  code: string;
  name: string;
  role: Role;
}

export type AttendanceStatus = 'P' | 'A' | 'WO' | 'H' | 'HD' | 'PH' | 'EL' | 'HDEL' | 'L' | 'EO' | 'NJ' | 'LWP';

export interface DailyAttendance {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkIn?: string; // HH:mm
  checkOut?: string; // HH:mm
}

export interface EmployeeAttendance {
  employeeId: string;
  userId: string;
  records: DailyAttendance[];
}

export type RequestType = 'Leave' | 'Misspunch';
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface AppRequest {
  id: string;
  userId: string;
  type: RequestType;
  date: string; // Used as 'From Date' for leaves
  toDate?: string; // Used as 'To Date' for leaves
  reason: string;
  status: RequestStatus;
  // For Misspunch
  inTime?: string;
  outTime?: string;
  // For Leave
  leaveType?: string;
}

export interface AppNotification {
  id: string;
  targetUserId?: string; // If undefined, it's for Admins
  message: string;
  isRead: boolean;
  createdAt: string;
}
