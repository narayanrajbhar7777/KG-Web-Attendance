export const KG_WEB_APP0_API_URL = `http://192.168.100.22:8080/KG_WEB_APP0/KGAPI`;
export const ATTENDANCE_STATUSES = [
  { code: 'P', label: 'Present' },
  { code: 'H', label: 'Holiday' },
  { code: 'WO', label: 'Week Off' },
  { code: 'L', label: 'Leave' },
  { code: 'P/MP', label: 'Present/Misspunch' },
  { code: 'M', label: 'Misspunch' },
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
