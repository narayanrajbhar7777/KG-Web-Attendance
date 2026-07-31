export type Role = 'Admin' | 'Employee';

export interface User {
  id: string;
  code: string;
  name: string;
  role: Role;
  image?: string;
  designation?: string;
  employee_list?: any[];
  manager_code?: string | null;
  manager_name?: string | null;
  token?: string;
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

export interface AttendancePolicy {
  id: string; // the database row id
  employeeId: string;
  inTime: string;
  outTime: string;
  weekOffs: number[];
}

export type RequestType = 'Leave' | 'Missed Punch' | 'Misspunch';
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface AppRequest {
  id: string;
  userId: string;
  managerId?: string;
  type: RequestType;
  date: string; // Used as 'From Date' for leaves
  toDate?: string; // Used as 'To Date' for leaves
  createdAt?: string;
  updatedAt?: string;
  reason: string;
  status: RequestStatus;
  // For Missed Punch
  inTime?: string;
  outTime?: string;
  // For Leave
  leaveType?: string;
  approver_notes?: string;
  actionedDate?: string;
}

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface EmployeeLeave {
  id: string;
  employeeId: string; // Links to user.id
  leaveTypeId: string; // Links to leaveType.id
  allocatedDays: number;
}

export interface AppNotification {
  id: string;
  targetUserId?: string; // If undefined, it's for Admins
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface WorkerCutOffData {
  e_comp: string;
  brname: string;
  manager_code: string;
  mgrname: string;
  worker_code: string;
  worker_name?: string;
  designation?: string;
  extend_for: string;
  day_start_time: string;
  day_close_time: string;
  _isNew?: boolean;
}
