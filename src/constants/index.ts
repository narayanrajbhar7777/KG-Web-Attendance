export const KG_WEB_APP0_API_URL = `http://192.168.100.22:8080/KG_WEB_APP0/KGAPI`;
export const KG_WEB_APP_API_URL = ` http://172.16.34.22:8080/kg_web_app/KGAPI`
export const KG_WEB_MAIL_API_URL = `http://172.16.37.219:5000/api`;
export const constTOKEN = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU5NTBlM2RjLTZhYjMtNGYwMi04NDZiLTcyMTk2NjVmOTQzNSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzg0ODY3NDQzLCJleHAiOjE3ODU0NzIyNDN9.H0PdN--1Stf-ZVMAiqgZgfU-4d2f1Bq39FEdz2jK1I4`;

export const BUFFER_TIME = '';

export const ATTENDANCE_STATUSES = [
  { code: 'P', label: 'Present' },
  { code: 'H', label: 'Holiday' },
  { code: 'WO', label: 'Week Off' },
  { code: 'L', label: 'Leave' },
  { code: 'P/MP', label: 'Present/Missed Punch' },
  { code: 'M', label: 'Missed Punch' },
  { code: 'In', label: 'In' },
  { code: 'A', label: 'Absent' },
  { code: 'HD', label: 'Half Day' },
  { code: 'PH', label: 'Present on Holiday' },
  { code: 'EL', label: 'Earned Leave' },
  { code: 'HDEL', label: 'Half Day Earned Leave' },
  { code: 'EO', label: 'Early Out' },
  { code: 'NJ', label: 'Not Joined' },
  { code: 'LWP', label: 'Leave without Pay' }
];

export const ATTENDANCE_STATUS_MAP: Record<string, string> = ATTENDANCE_STATUSES.reduce((acc, curr) => {
  acc[curr.code] = curr.label;
  return acc;
}, {} as Record<string, string>);

export const DEFAULT_ATTENDANCE_COLORS: Record<string, string> = {
  'P': '#28a745',
  'H': '#e024ff',
  'M': '#d81b60',
  'P/MP': '#d81b60',
  'In': '#007bff',
  'A': '#f43f5e',
  'WO': '#6b8e23',
  'L': '#6f42c1',
  'HD': '#3b82f6',
  'PH': '#059669',
};
