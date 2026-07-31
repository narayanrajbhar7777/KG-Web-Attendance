export const KG_WEB_APP0_API_URL = 'http://192.168.100.22:8080/KG_WEB_APP0/KGAPI';
export const KG_WEB_APP_API_URL = 'http://172.16.34.22:8080/kg_web_app/KGAPI';
export const KG_WEB_MAIL_API_URL = 'http://172.16.37.219:ls/api';
export const EMAIL_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU5NTBlM2RjLTZhYjMtNGYwMi04NDZiLTcyMTk2NjVmOTQzNSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxTzg0ODY3NDQzLCJleHAiOjE3ODU0NzIyNDN9.H0PdN--1Stf-ZVMAiqgZgfU-4d2f1Bq39FEdz2jK1I4';

export const FETCH_API_INTERVAL = 5000;
export const DEFAULT_IN_TIME = '09:00';
export const DEFAULT_OUT_TIME = '18:00';
export const DEFAULT_BUFFER_TIME = '15';

export const REQUEST_STATUS = {
  ALL: { code: 'All', value: 'All' },
  PENDING: { code: 'Pending', value: 'Pending' },
  APPROVED: { code: 'Approved', value: 'Approved' },
  REJECTED: { code: 'Rejected', value: 'Rejected' },
}

export const REQUEST_STATUS_CODES = Object.values(REQUEST_STATUS);

export const DATE_FORMAT = 'dd-MMM-yyyy';

export const DAYS = {
  SD: { label: 'S', name: 'Sunday', value: 0 },
  MD: { label: 'M', name: 'Monday', value: 1 },
  TD: { label: 'T', name: 'Tuesday', value: 2 },
  WED: { label: 'W', name: 'Wednesday', value: 3 },
  THD: { label: 'T', name: 'Thursday', value: 4 },
  FRD: { label: 'F', name: 'Friday', value: 5 },
  STD: { label: 'S', name: 'Saturday', value: 6 },
}

export const TRACKER_WORKING_DAYS = {
  WD: { code: 'WD', value: "Working Days" },
  PD: { code: 'PD', value: "Present Days" },
  AD: { code: 'AD', value: "Absent Days" },
  MP: { code: 'MP', value: "Missed Punch" },
  POH: { code: 'POH', value: "Present on Holiday" },
  AH: { code: 'AH', value: "Actual Hrs" },
  OH: { code: 'OH', value: "Overtime Hrs" },
  TH: { code: 'TH', value: "Total Hrs" },
}

export const ATTENDANCE_BASE_MAP = {
  ALL: { code: 'All', label: 'All', color: '#475569' },
  PRESENT: { code: 'P', label: 'Present', color: '#28a745' },
  HOLIDAY: { code: 'H', label: 'Holiday', color: '#0dcbecff' },
  WEEK_OFF: { code: 'WO', label: 'Week Off', color: '#0e5ae7ff' },
  LEAVE: { code: 'L', label: 'Leave', color: '#6f42c1' },
  PRESENT_MISSPUNCH: { code: 'P/MP', label: 'Present/Missed Punch', color: '#217da1ff' },
  MISSPUNCH: { code: 'M', label: 'Missed Punch', value: 'Misspunch', color: '#f8065fff' },
  IN: { code: 'In', label: 'In', color: '#1aa559' },
  ABSENT: { code: 'A', label: 'Absent', color: '#dc2626' },
  HALF_DAY: { code: 'HD', label: 'Half Day', color: '#3b82f6' },
  PRESENT_ON_HOLIDAY: { code: 'PH', label: 'Present on Holiday', color: '#059669' },
  EARNED_LEAVE: { code: 'EL', label: 'Earned Leave', color: '' },
  HALF_DAY_EARNED_LEAVE: { code: 'HDEL', label: 'Half Day Earned Leave', color: '' },
  EARLY_OUT: { code: 'EO', label: 'Early Out', color: '' },
  NOT_JOINED: { code: 'NJ', label: 'Not Joined', color: '' },
  LEAVE_WITHOUT_PAY: { code: 'LWP', label: 'Leave without Pay', color: '' },
  OUT: { code: 'Out', label: 'Out', color: '#64748b' },
  LATE: { code: 'Late', label: 'Late', color: '#f59e0b' }
} as const;

export const ATTENDANCE_STATUS = Object.fromEntries(
  Object.entries(ATTENDANCE_BASE_MAP).map(([key, val]) => [key, val.code])
) as { [K in keyof typeof ATTENDANCE_BASE_MAP]: typeof ATTENDANCE_BASE_MAP[K]['code'] };

const statusBaseArray = Object.values(ATTENDANCE_BASE_MAP);

export const ATTENDANCE_STATUSES = statusBaseArray.map(({ code, label }) => ({ code, label }));

export const ATTENDANCE_STATUS_CODES = statusBaseArray.map(({ code, label }) => ({ code, value: label }));

export const ATTENDANCE_STATUS_MAP: Record<string, string> = Object.fromEntries(
  statusBaseArray.map(({ code, label }) => [code, label])
);

export const DEFAULT_ATTENDANCE_COLORS: Record<string, string> = Object.fromEntries(
  statusBaseArray.filter(item => item.color !== '').map(({ code, color }) => [code, color])
);

export const ATTENDANCE_SUMMARY_FILTERS = [
  { id: ATTENDANCE_STATUS.ALL, label: ATTENDANCE_STATUS.ALL, code: ATTENDANCE_STATUS.ALL, shortForm: ATTENDANCE_STATUS.ALL },
  { id: ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.PRESENT], label: ATTENDANCE_STATUS.PRESENT, code: ATTENDANCE_STATUS.PRESENT },
  { id: ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.ABSENT], label: ATTENDANCE_STATUS.ABSENT, code: ATTENDANCE_STATUS.ABSENT },
  { id: ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.IN], label: ATTENDANCE_STATUS.IN, code: ATTENDANCE_STATUS.IN },
  { id: ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.OUT], label: ATTENDANCE_STATUS.OUT, code: ATTENDANCE_STATUS.OUT },
  { id: ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.MISSPUNCH], label: ATTENDANCE_STATUS.MISSPUNCH, code: ATTENDANCE_STATUS.MISSPUNCH },
  { id: ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.LATE], label: ATTENDANCE_STATUS.LATE, code: ATTENDANCE_STATUS.LATE },
  { id: ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.LEAVE], label: ATTENDANCE_STATUS.LEAVE, code: ATTENDANCE_STATUS.LEAVE },
  { id: ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY], label: ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY, code: ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY },
  { id: ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.WEEK_OFF], label: ATTENDANCE_STATUS.WEEK_OFF, code: ATTENDANCE_STATUS.WEEK_OFF },
  { id: ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.PRESENT_MISSPUNCH], label: ATTENDANCE_STATUS.PRESENT_MISSPUNCH, code: ATTENDANCE_STATUS.PRESENT_MISSPUNCH },
  { id: ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.HALF_DAY], label: ATTENDANCE_STATUS.HALF_DAY, code: ATTENDANCE_STATUS.HALF_DAY }
];
