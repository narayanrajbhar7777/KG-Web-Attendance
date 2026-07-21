import { format } from 'date-fns';
import type { ColumnDef } from '../components/AttendanceTable';

const safeFormat = (dateStr: any, fmt: string = 'dd-MM-yyyy') => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '-' : format(d, fmt);
};

export const getLeaveReportColumns = (users: any[]): ColumnDef<any>[] => [
  { key: 'code', label: 'Code', render: (req) => { const emp = users.find(u => u.id === req.userId); return <span className="text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{emp?.code || req.userId}</span>; } },
  { key: 'name', label: 'Name', render: (req) => { const emp = users.find(u => u.id === req.userId); return <span className="font-medium text-slate-500 dark:text-slate-400 text-[11px] uppercase whitespace-nowrap">{emp?.name || 'Unknown Employee'}</span>; } },
  { key: 'fromDate', label: 'From', render: (req) => <span className="text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{safeFormat(req.date)}</span> },
  { key: 'toDate', label: 'To', render: (req) => <span className="text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{req.toDate ? safeFormat(req.toDate) : safeFormat(req.date)}</span> },
  { key: 'count', label: 'Count', render: (req) => <span className="text-sm text-slate-600 dark:text-slate-300 font-medium text-center whitespace-nowrap">{req.toDate ? Math.ceil((new Date(req.toDate).getTime() - new Date(req.date).getTime()) / (1000 * 3600 * 24)) + 1 : 1}</span> },
  { key: 'type', label: 'Type', render: (req) => <span className="text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{req.leaveType}</span> },
  { key: 'reason', label: 'Reason', render: (req) => <p className="text-sm text-slate-700 dark:text-slate-300 font-medium max-w-[200px] truncate" title={req.reason}>{req.reason}</p> },
  {
    key: 'status', label: 'Status', render: (req) => (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${req.status === 'Approved'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
        : req.status === 'Rejected'
          ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
        }`}>
        {req.status}
      </span>
    )
  }
];

export const getMissingPunchReportColumns = (users: any[]): ColumnDef<any>[] => [
  { key: 'code', label: 'Code', render: (req) => { const emp = users.find(u => u.id === req.userId); return <span className="text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{emp?.code || req.userId}</span>; } },
  { key: 'name', label: 'Name', render: (req) => { const emp = users.find(u => u.id === req.userId); return <span className="font-medium text-slate-500 dark:text-slate-400 text-[11px] uppercase whitespace-nowrap">{emp?.name || 'Unknown Employee'}</span>; } },
  { key: 'date', label: 'Date', render: (req) => <span className="text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{safeFormat(req.date)}</span> },
  { key: 'inTime', label: 'In', render: (req) => <span className="text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{req.inTime || '-'}</span> },
  { key: 'outTime', label: 'Out', render: (req) => <span className="text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">{req.outTime || '-'}</span> },
  { key: 'reason', label: 'Reason', render: (req) => <p className="text-sm text-slate-600 dark:text-slate-300 font-medium max-w-[200px] truncate" title={req.reason}>{req.reason}</p> },
  {
    key: 'status', label: 'Status', render: (req) => (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${req.status === 'Approved'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
        : req.status === 'Rejected'
          ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
        }`}>
        {req.status}
      </span>
    )
  }
];
