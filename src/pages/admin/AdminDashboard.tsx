import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import { fetchRequests, fetchEmployeePunchData, fetchWorkerCutoff, fetchManagerCutoff } from '../../api';
import type { AppRequest, User } from '../../types';
import { Calendar, EyeOff, Table, Check, X, Clock, Search, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { AttendanceTable, type ColumnDef } from '../../components/AttendanceTable';
import { isRecordLate, processAttendanceRecord } from '../../utils/attendanceUtils';
import { ATTENDANCE_STATUS, DEFAULT_ATTENDANCE_COLORS, REQUEST_STATUS, ATTENDANCE_BASE_MAP } from '../../constants';
import Loader from '../../components/Loader';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateRequestStatus: apiUpdateRequestStatus, addNotification, customColors, attendanceGlobalRules } = useAppData();
  const [requests, setRequests] = useState<AppRequest[]>([]);
  const [actionNotes, setActionNotes] = useState<{ [key: string]: string }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [recentPunchesData, setRecentPunchesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentPunchingFilter, setRecentPunchingFilter] = useState<'All' | 'Present' | 'Absent' | 'Leave' | 'Late'>('All');
  const [leaveReportFilter, setLeaveReportFilter] = useState<string>('All');
  const [missedPunchFilter, setMissedPunchFilter] = useState<string>('All');
  const [currentDate] = useState<Date>(new Date());

  const loadData = async () => {
    setLoading(true);
    try {
      const todayStr = format(currentDate, 'dd-MMM-yyyy');

      let reqsData = [];
      try {
        if (user) {
          const managerId = user.code ? user.code.replace('FP', '') : '';
          reqsData = await fetchRequests(managerId);
        }
      } catch (e) { console.error("Failed fetchRequests:", e); }

      let extData;
      if (user) {
        try { extData = await fetchEmployeePunchData(user.id, todayStr, todayStr, true); } catch (e) { console.error("Failed fetchEmployeePunchData:", e); }
      }
      const sortedReqs = (reqsData || []).sort((a: any, b: any) => {
        const idA = typeof a.id === 'string' ? parseInt(a.id, 10) : (a.id || 0);
        const idB = typeof b.id === 'string' ? parseInt(b.id, 10) : (b.id || 0);
        return idB - idA;
      });
      setRequests(sortedReqs);

      let cutoffs: any[] = [];
      let managerCutoffData: any = undefined;
      if (user) {
        try {
          cutoffs = await fetchWorkerCutoff({
            e_comp: user.company || 'FP',
            brname: '',
            manager_code: user.code
          });
        } catch (e) { console.error("Failed to fetch worker cutoffs:", e); }
        try {
          const mgrData = await fetchManagerCutoff({
            e_comp: user.company || 'FP',
            manager_code: user.code
          });
          if (mgrData && mgrData.length > 0) managerCutoffData = mgrData[0];
        } catch (e) { console.error("Failed to fetch manager cutoff:", e); }
      }

      if (extData) {
        const punchData = extData?.EMP_PUNCH_DATA || [];
        let allEmployees: User[] = (user?.employee_list || []).map((e: any) => ({
          id: e.e_code,
          name: e.e_name,
          code: e.e_code,
          designation: e.e_desg,
          role: 'Employee'
        }));

        if (!allEmployees.some((e: User) => e.code === user?.code) && user) {
          allEmployees.unshift({
            id: user.code,
            name: user.name,
            code: user.code,
            designation: user.designation,
            role: user.role
          });
        }

        setUsers(allEmployees as User[]);

        const processed = allEmployees.map((emp: any) => {
          const p = punchData.find((p: any) => String(p.emp_id) === String(emp.code));

          const empCutoff = cutoffs.find((c: any) => c.worker_code === emp.code);
          const empRequests = reqsData.filter((r: any) =>
            String(r.userId) === String(emp.code) ||
            String(r.userId) === String(emp.id) ||
            String(r.userId) === String(emp.code).replace('FP', '')
          );
          const processedRecord = processAttendanceRecord(p, empCutoff, attendanceGlobalRules, managerCutoffData, empRequests, currentDate);

          return {
            id: emp.code + '-' + Math.random(),
            code: emp.code,
            name: emp.name || 'Unknown',
            date: processedRecord.date,
            checkIn: processedRecord.checkIn,
            checkOut: processedRecord.checkOut,
            duration: processedRecord.duration,
            status: processedRecord.status
          };
        });

        processed.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setRecentPunchesData(processed);
      }
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentDate, attendanceGlobalRules]);

  const updateRequestStatus = async (id: string, status: AppRequest['status'], reason: string, req?: AppRequest) => {
    await apiUpdateRequestStatus(id, status, reason, req, actionNotes[id]);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setActionNotes(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const [leavesSearch, setLeavesSearch] = useState('');
  const [punchesSearch, setPunchesSearch] = useState('');
  const [leaveReportSearch, setLeaveReportSearch] = useState('');
  const [punchReportSearch, setPunchReportSearch] = useState('');

  const [leavesPage, setLeavesPage] = useState(0);
  const [punchesPage, setPunchesPage] = useState(0);
  const [leaveReportPage, setLeaveReportPage] = useState(0);
  const [punchReportPage, setPunchReportPage] = useState(0);
  const itemsPerPage = 10;

  const pendingLeaves = requests.filter(r => r.type === 'Leave' && r.status === REQUEST_STATUS.PENDING.code).length;
  const approvedLeaves = requests.filter(r => r.type === 'Leave' && r.status === REQUEST_STATUS.APPROVED.code).length;
  const rejectedLeaves = requests.filter(r => r.type === 'Leave' && r.status === REQUEST_STATUS.REJECTED.code).length;

  const pendingPunches = requests.filter(r => (r.type === ATTENDANCE_BASE_MAP.MISSPUNCH.label || r.type === ATTENDANCE_BASE_MAP.MISSPUNCH.value) && r.status === REQUEST_STATUS.PENDING.code).length;
  const approvedPunches = requests.filter(r => (r.type === ATTENDANCE_BASE_MAP.MISSPUNCH.label || r.type === ATTENDANCE_BASE_MAP.MISSPUNCH.value) && r.status === REQUEST_STATUS.APPROVED.code).length;
  const rejectedPunches = requests.filter(r => (r.type === ATTENDANCE_BASE_MAP.MISSPUNCH.label || r.type === ATTENDANCE_BASE_MAP.MISSPUNCH.value) && r.status === REQUEST_STATUS.REJECTED.code).length;

  const pendingRequestsList = requests.filter(r => r.status === REQUEST_STATUS.PENDING.code);

  const pendingLeaveList = pendingRequestsList.filter(r => {
    if (r.type !== 'Leave') return false;
    if (!leavesSearch) return true;
    const user = users.find(u => u.id === r.userId || u.code === r.userId);
    const searchTarget = user ? `${user.name} ${user.code}` : r.userId;
    return searchTarget.toLowerCase().includes(leavesSearch.toLowerCase());
  });

  const pendingPunchList = pendingRequestsList.filter(r => {
    if (r.type !== ATTENDANCE_BASE_MAP.MISSPUNCH.label && r.type !== ATTENDANCE_BASE_MAP.MISSPUNCH.value) return false;
    if (!punchesSearch) return true;
    const user = users.find(u => u.id === r.userId || u.code === r.userId);
    const searchTarget = user ? `${user.name} ${user.code}` : r.userId;
    return searchTarget.toLowerCase().includes(punchesSearch.toLowerCase());
  });

  const processedLeaveRequests = requests.filter(r => {
    if (r.status === REQUEST_STATUS.PENDING.code || r.type !== 'Leave') return false;
    if (leaveReportFilter !== 'All' && r.status !== leaveReportFilter) return false;
    if (!leaveReportSearch) return true;
    const user = users.find(u => u.id === r.userId || u.code === r.userId);
    const searchTarget = user ? `${user.name} ${user.code}` : r.userId;
    return searchTarget.toLowerCase().includes(leaveReportSearch.toLowerCase());
  });

  const processedMissedPunchRequests = requests.filter(r => {
    if (r.status === REQUEST_STATUS.PENDING.code || (r.type !== ATTENDANCE_BASE_MAP.MISSPUNCH.label && r.type !== ATTENDANCE_BASE_MAP.MISSPUNCH.value)) return false;
    if (missedPunchFilter !== 'All' && r.status !== missedPunchFilter) return false;
    if (!punchReportSearch) return true;
    const user = users.find(u => u.id === r.userId || u.code === r.userId);
    const searchTarget = user ? `${user.name} ${user.code}` : r.userId;
    return searchTarget.toLowerCase().includes(punchReportSearch.toLowerCase());
  });

  const pagedPendingLeaveList = pendingLeaveList.slice(leavesPage * itemsPerPage, (leavesPage + 1) * itemsPerPage);
  const pagedPendingPunchList = pendingPunchList.slice(punchesPage * itemsPerPage, (punchesPage + 1) * itemsPerPage);
  const pagedProcessedLeaveRequests = processedLeaveRequests.slice(leaveReportPage * itemsPerPage, (leaveReportPage + 1) * itemsPerPage);
  const pagedprocessedMissedPunchRequests = processedMissedPunchRequests.slice(punchReportPage * itemsPerPage, (punchReportPage + 1) * itemsPerPage);

  const recentPresentCount = recentPunchesData.filter(r => [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.PRESENT_MISSPUNCH, ATTENDANCE_STATUS.HALF_DAY, ATTENDANCE_STATUS.MISSPUNCH, ATTENDANCE_STATUS.IN, ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY].includes(r.status)).length;
  const recentAbsentCount = recentPunchesData.filter(r => r.status === ATTENDANCE_STATUS.ABSENT).length;
  const recentLeaveCount = recentPunchesData.filter(r => r.status === ATTENDANCE_STATUS.LEAVE).length;
  const recentLateCount = recentPunchesData.filter(r => isRecordLate(r.checkIn)).length;

  const PaginationFooter = ({ page, setPage, total, label }: any) => {
    const totalPages = Math.ceil(total / itemsPerPage);

    if (total === 0)

      return (

        <div className="p-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-[#182333]/50 transition-colors">
          <span>Showing 0 entries</span>
        </div>
      );
    return (
      <div className="p-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-[#182333]/50 transition-colors">
        <span>Showing {Math.min(page * itemsPerPage + 1, total)} to {Math.min((page + 1) * itemsPerPage, total)} of {total} {label}</span>
        <div className="flex gap-1">
          <button onClick={() => setPage((p: number) => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded bg-slate-200 disabled:opacity-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Prev</button>
          <button onClick={() => setPage((p: number) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 rounded bg-slate-200 disabled:opacity-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Next</button>
        </div>
      </div>
    );
  };

  const recentPunchesColumns: ColumnDef<any>[] = [
    { key: 'code', label: 'Code', render: (item) => <span className="text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{item.code || '-'}</span> },
    { key: 'name', label: 'Name', render: (item) => <span className="font-medium text-slate-500 dark:text-slate-400 text-[13px] uppercase whitespace-nowrap">{item.name}</span> },
    { key: 'checkIn', label: 'In', render: (item) => <span className="text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{item.checkIn !== '-' ? item.checkIn : '-'}</span> },
    { key: 'checkOut', label: 'Out', render: (item) => <span className="text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{item.checkOut !== '-' ? item.checkOut : '-'}</span> },
    { key: 'duration', label: 'Working Hr', render: (item) => <span className="text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">{item.duration !== '-' ? item.duration : '-'}</span> },
    { key: 'status', label: 'Status', render: (item) => <span className="text-sm font-bold" style={{ color: customColors[item.status] || DEFAULT_ATTENDANCE_COLORS[item.status] || '' }}>{item.status}</span> },
  ];

  return (
    <div className="flex flex-col animate-fade-in-up gap-4 pb-2">

      {/* Main content area */}
      <div className="flex flex-col gap-4">

        {/* Top Cards */}
        <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Leave Requests Card */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700/60 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1">
            <div className="p-6 pb-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[17px] font-bold text-slate-800 dark:text-white">Leave Requests</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pending approval actions</p>
                </div>
                <div className="bg-blue-50 dark:bg-white/10 p-2.5 rounded-lg text-blue-500 dark:text-white">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-[#2a374a]/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 text-center transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Pending</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingLeaves}</p>
                </div>
                <div className="bg-slate-50 dark:bg-[#2a374a]/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 text-center transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Approved</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{approvedLeaves}</p>
                </div>
                <div className="bg-slate-50 dark:bg-[#2a374a]/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 text-center transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Rejected</p>
                  <p className="text-2xl font-bold text-red-500 dark:text-red-400">{rejectedLeaves}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Missed Punch Card */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700/60 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1">
            <div className="p-6 pb-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[17px] font-bold text-slate-800 dark:text-white">Missed Punch</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Attendance discrepancy tracking</p>
                </div>
                <div className="bg-slate-100 dark:bg-white/10 p-2.5 rounded-lg text-slate-600 dark:text-white">
                  <EyeOff className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-[#2a374a]/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 text-center transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Pending</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingPunches}</p>
                </div>
                <div className="bg-slate-50 dark:bg-[#2a374a]/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 text-center transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Approved</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{approvedPunches}</p>
                </div>
                <div className="bg-slate-50 dark:bg-[#2a374a]/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 text-center transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Rejected</p>
                  <p className="text-2xl font-bold text-red-500 dark:text-red-400">{rejectedPunches}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Requests Tables */}
        <div className="shrink-0 grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Pending Leave Requests */}
          <div className="flex flex-col bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60 bg-yellow-50/50 dark:bg-yellow-900/10">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 dark:bg-yellow-500/20 p-1.5 rounded-lg text-yellow-600 dark:text-yellow-400">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-[17px] font-bold text-slate-800 dark:text-white">Action Required: Leaves</h3>
                <span className="bg-yellow-200 text-yellow-800 dark:bg-yellow-500/30 dark:text-yellow-300 py-0.5 px-2 rounded-full text-xs font-bold">{pendingLeaveList.length}</span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Employee..."
                  value={leavesSearch}
                  onChange={(e) => setLeavesSearch(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto custom-scrollbar h-[310px] relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-[#1e293b] z-10">
                  <tr className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 transition-colors">
                    <th className="py-4 px-6 text-right">Action</th>
                    <th className="py-4 px-6">Code</th>
                    <th className="py-4 px-6 ">Name</th>
                    <th className="py-4 px-6">Date</th>
                    {/* <th className="py-4 px-6">Type</th> */}
                    <th className="py-4 px-6">Reason</th>
                    <th className="py-4 px-6">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-16">
                        <Loader />
                      </td>
                    </tr>
                  ) : pendingLeaveList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No pending leave requests found.
                      </td>
                    </tr>
                  ) : (
                    pagedPendingLeaveList.map((req) => {
                      const emp = users.find(u => String(u.id).replace('FP', '') === String(req.userId).replace('FP', '') || String(u.code).replace('FP', '') === String(req.userId).replace('FP', ''));
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors">
                          <td className="py-4 px-4 text-right">
                            <div className="flex flex-col sm:flex-row items-end justify-end gap-2">
                              <button
                                onClick={() => {
                                  updateRequestStatus(req.id, 'Approved', req.reason, req);
                                  addNotification(`Your Leave request on ${format(new Date(req.date), 'MMM dd')} has been Approved`, req.userId);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  updateRequestStatus(req.id, 'Rejected', req.reason, req);
                                  addNotification(`Your Leave request on ${format(new Date(req.date), 'MMM dd')} has been Rejected`, req.userId);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded border border-red-200 dark:border-red-500/30 text-xs font-bold transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {emp?.code || req.userId}
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-medium text-slate-500 dark:text-slate-400 text-[13px] uppercase whitespace-nowrap">{emp?.name || 'Unknown'}</span>
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{req.date ? format(new Date(req.date), 'MMM dd, yyyy') : 'N/A'}</p>
                          </td>
                          {/* <td className="py-4 px-6 whitespace-nowrap">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{req.leaveType}</span>
                          </td> */}
                          <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400">
                            <p className="truncate max-w-[150px]" title={req.reason}>{req.reason}</p>
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="text"
                              placeholder="Note (optional)"
                              value={actionNotes[req.id] || ''}
                              onChange={(e) => setActionNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                              className="w-32 text-xs px-2 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded outline-none focus:ring-1 focus:ring-blue-500 dark:text-white placeholder:text-slate-400"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter page={leavesPage} setPage={setLeavesPage} total={pendingLeaveList.length} label="entries" />
          </div>

          {/* Pending Missed Punch Requests */}
          <div className="flex flex-col bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60 bg-yellow-50/50 dark:bg-yellow-900/10">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 dark:bg-yellow-500/20 p-1.5 rounded-lg text-yellow-600 dark:text-yellow-400">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-[17px] font-bold text-slate-800 dark:text-white">Action Required: Punches</h3>
                <span className="bg-yellow-200 text-yellow-800 dark:bg-yellow-500/30 dark:text-yellow-300 py-0.5 px-2 rounded-full text-xs font-bold">{pendingPunchList.length}</span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Employee..."
                  value={punchesSearch}
                  onChange={(e) => setPunchesSearch(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto custom-scrollbar h-[310px] relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-[#1e293b] z-10">
                  <tr className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 transition-colors">
                    <th className="py-4 px-6 text-right">Action</th>
                    <th className="py-4 px-6">Code</th>
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">In</th>
                    <th className="py-4 px-6">Out</th>
                    <th className="py-4 px-6">Reason</th>
                    <th className="py-4 px-6">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16">
                        <Loader />
                      </td>
                    </tr>
                  ) : pendingPunchList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No pending punch requests found.
                      </td>
                    </tr>
                  ) : (
                    pagedPendingPunchList.map((req) => {
                      const emp = users.find(u => String(u.id).replace('FP', '') === String(req.userId).replace('FP', '') || String(u.code).replace('FP', '') === String(req.userId).replace('FP', ''));
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors">
                          <td className="py-4 px-3 text-right">
                            <div className="flex flex-col sm:flex-row items-end justify-end gap-2">
                              <button
                                onClick={() => {
                                  updateRequestStatus(req.id, 'Approved', req.reason, req);
                                  addNotification(`Your Missed Punch request on ${format(new Date(req.date), 'MMM dd')} has been Approved`, req.userId);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  updateRequestStatus(req.id, 'Rejected', req.reason, req);
                                  addNotification(`Your Missed Punch request on ${format(new Date(req.date), 'MMM dd')} has been Rejected`, req.userId);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded border border-red-200 dark:border-red-500/30 text-xs font-bold transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {emp?.code || req.userId}
                          </td>
                          <td className="py-4 px-3">
                            <span className="font-medium text-slate-500 dark:text-slate-400 text-[13px] uppercase whitespace-nowrap">{emp?.name || 'Unknown'}</span>
                          </td>
                          <td className="py-4 px-3 whitespace-nowrap">
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{req.date ? format(new Date(req.date), 'MMM dd, yyyy') : 'N/A'}</p>
                          </td>
                          <td className="py-4 px-3 whitespace-nowrap">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{req.inTime || '-'}</span>
                          </td>
                          <td className="py-4 px-3 whitespace-nowrap">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{req.outTime || '-'}</span>
                          </td>
                          <td className="py-4 px-3 text-sm text-slate-500 dark:text-slate-400">
                            <p className="truncate max-w-[150px]" title={req.reason}>{req.reason}</p>
                          </td>
                          <td className="py-4 px-3">
                            <input
                              type="text"
                              placeholder="Note (optional)"
                              value={actionNotes[req.id] || ''}
                              onChange={(e) => setActionNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                              className="w-32 text-xs px-2 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded outline-none focus:ring-1 focus:ring-blue-500 dark:text-white placeholder:text-slate-400"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter page={punchesPage} setPage={setPunchesPage} total={pendingPunchList.length} label="entries" />
          </div>
        </div>

        <div className="shrink-0 grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Leave Requests Report Table */}
          <div className="flex flex-col bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
            <div className="p-5 flex flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60 w-full overflow-x-auto custom-scrollbar">
              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-purple-50 dark:bg-purple-500/10 p-1.5 rounded-lg text-purple-600 dark:text-purple-400">
                  <Table className="w-4 h-4" />
                </div>
                <h3 className="text-[17px] font-bold text-slate-800 dark:text-white whitespace-nowrap">Leave Request Report</h3>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold shrink-0">
                  <button
                    onClick={() => setLeaveReportFilter('All')}
                    className={`min-w-[80px] h-[36px] flex items-center justify-center rounded-lg border transition-colors ${leaveReportFilter === 'All' ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                  >
                    All: {approvedLeaves + rejectedLeaves}
                  </button>
                  <button
                    onClick={() => setLeaveReportFilter(REQUEST_STATUS.APPROVED.code)}
                    className={`min-w-[80px] h-[36px] flex items-center justify-center rounded-lg border transition-colors ${leaveReportFilter === REQUEST_STATUS.APPROVED.code ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                  >
                    Approved: {approvedLeaves}
                  </button>
                  <button
                    onClick={() => setLeaveReportFilter(REQUEST_STATUS.REJECTED.code)}
                    className={`min-w-[80px] h-[36px] flex items-center justify-center rounded-lg border transition-colors ${leaveReportFilter === REQUEST_STATUS.REJECTED.code ? 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                  >
                    Rejected: {rejectedLeaves}
                  </button>
                </div>
                <button onClick={() => navigate('/admin/leave-requests-report')} title="Show Report" className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded transition-colors flex items-center justify-center">
                  <ExternalLink className="w-5 h-5" />
                </button>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Employee..."
                    value={leaveReportSearch}
                    onChange={(e) => setLeaveReportSearch(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

            </div>

            <div className="overflow-x-auto overflow-y-auto custom-scrollbar h-[310px] relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-[#1e293b] z-10">
                  <tr className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 transition-colors">
                    <th className="py-4 px-4">Code</th>
                    <th className="py-4 px-4">Name</th>
                    <th className="py-4 px-4">From</th>
                    <th className="py-4 px-4">To</th>
                    <th className="py-4 px-4 text-center">Count</th>
                    <th className="py-4 px-4">Type</th>
                    <th className="py-4 px-4">Reason</th>
                    <th className="py-4 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16">
                        <Loader />
                      </td>
                    </tr>
                  ) : processedLeaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No leave reports found.
                      </td>
                    </tr>
                  ) : (
                    pagedProcessedLeaveRequests.map((req) => {
                      const emp = users.find(u => String(u.id).replace('FP', '') === String(req.userId).replace('FP', '') || String(u.code).replace('FP', '') === String(req.userId).replace('FP', ''));
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors group">
                          <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {emp?.code || req.userId}
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <p className="font-medium text-slate-500 dark:text-slate-400 text-[13px] uppercase whitespace-nowrap">
                              {emp?.name ? <span className="capitalize">{emp.name}</span> : 'Unknown'}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {format(new Date(req.date), 'dd-MM-yyyy')}
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {req.toDate ? format(new Date(req.toDate), 'dd-MM-yyyy') : format(new Date(req.date), 'dd-MM-yyyy')}
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium text-center whitespace-nowrap">
                            {req.toDate ? Math.ceil((new Date(req.toDate).getTime() - new Date(req.date).getTime()) / (1000 * 3600 * 24)) + 1 : 1}
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {req.leaveType}
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400">
                            <p className="truncate max-w-[150px]" title={req.reason}>{req.reason}</p>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${req.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                              : req.status === 'Rejected'
                                ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                              }`}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter page={leaveReportPage} setPage={setLeaveReportPage} total={processedLeaveRequests.length} label="entries" />
          </div>

          {/* Missed Punch Report Table */}
          <div className="flex flex-col bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
            <div className="p-5 flex flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60 w-full overflow-x-auto custom-scrollbar">
              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <Table className="w-4 h-4" />
                </div>
                <h3 className="text-[17px] font-bold text-slate-800 dark:text-white whitespace-nowrap">Missed Punch Report</h3>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold shrink-0">
                  <button
                    onClick={() => setMissedPunchFilter('All')}
                    className={`min-w-[80px] h-[36px] flex items-center justify-center rounded-lg border transition-colors ${missedPunchFilter === 'All' ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                  >
                    All: {approvedPunches + rejectedPunches}
                  </button>
                  <button
                    onClick={() => setMissedPunchFilter(REQUEST_STATUS.APPROVED.code)}
                    className={`min-w-[80px] h-[36px] flex items-center justify-center rounded-lg border transition-colors ${missedPunchFilter === REQUEST_STATUS.APPROVED.code ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                  >
                    Approved: {approvedPunches}
                  </button>
                  <button
                    onClick={() => setMissedPunchFilter(REQUEST_STATUS.REJECTED.code)}
                    className={`min-w-[80px] h-[36px] flex items-center justify-center rounded-lg border transition-colors ${missedPunchFilter === REQUEST_STATUS.REJECTED.code ? 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                  >
                    Rejected: {rejectedPunches}
                  </button>
                </div>
                <button onClick={() => navigate('/admin/missing-punch-report')} title="Show Report" className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded transition-colors flex items-center justify-center">
                  <ExternalLink className="w-5 h-5" />
                </button>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Employee..."
                    value={punchReportSearch}
                    onChange={(e) => setPunchReportSearch(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

            </div>

            <div className="overflow-x-auto overflow-y-auto custom-scrollbar h-[310px] relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-[#1e293b] z-10">
                  <tr className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 transition-colors">
                    <th className="py-4 px-4">Code</th>
                    <th className="py-4 px-4">Name</th>
                    <th className="py-4 px-4">Date</th>
                    <th className="py-4 px-4">In</th>
                    <th className="py-4 px-4">Out</th>
                    <th className="py-4 px-4">Reason</th>
                    <th className="py-4 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16">
                        <Loader />
                      </td>
                    </tr>
                  ) : processedMissedPunchRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No Missed Punch reports found.
                      </td>
                    </tr>
                  ) : (
                    pagedprocessedMissedPunchRequests.map((req) => {
                      const emp = users.find(u => String(u.id).replace('FP', '') === String(req.userId).replace('FP', '') || String(u.code).replace('FP', '') === String(req.userId).replace('FP', ''));
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors group">
                          <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {emp?.code || req.userId}
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <p className="font-medium text-slate-500 dark:text-slate-400 text-[13px] uppercase whitespace-nowrap">
                              {emp?.name ? <span className="capitalize">{emp.name}</span> : 'Unknown'}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {format(new Date(req.date), 'dd-MM-yyyy')}
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {req.inTime || '-'}
                          </td>
                          <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {req.outTime || '-'}
                          </td>
                          <td className="py-4 px-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-[200px] truncate" title={req.reason}>
                              {req.reason}
                            </p>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${req.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                              : req.status === 'Rejected'
                                ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                              }`}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <PaginationFooter page={punchReportPage} setPage={setPunchReportPage} total={processedMissedPunchRequests.length} label="entries" />
          </div>
        </div>

        {/* Recent Punching Table */}
        <div className="h-[450px]">
          <AttendanceTable
            data={recentPunchesData.filter(r => {
              if (recentPunchingFilter === 'Present') return [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.PRESENT_MISSPUNCH, ATTENDANCE_STATUS.HALF_DAY, ATTENDANCE_STATUS.MISSPUNCH, ATTENDANCE_STATUS.IN, ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY].includes(r.status);
              if (recentPunchingFilter === 'Absent') return r.status === ATTENDANCE_STATUS.ABSENT;
              if (recentPunchingFilter === 'Leave') return r.status === ATTENDANCE_STATUS.LEAVE;
              if (recentPunchingFilter === 'Late') return isRecordLate(r.checkIn);
              return true; // 'All'
            })}
            columns={recentPunchesColumns}
            loading={loading}
            className="!bg-white dark:!bg-[#1e293b] shadow-sm hover:shadow-md transition-all duration-300 dark:!border-slate-700/60"
            searchable={true}
            searchPlaceholder="Search Employee..."
            customTopLeft={
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div onClick={() => navigate('/admin/summary')} className="bg-blue-50 dark:bg-white/10 p-1.5 rounded-lg text-blue-500 dark:text-white cursor-pointer hover:bg-blue-100 dark:hover:bg-white/20 transition-colors" title="Open Full Page">
                    <Table className="w-4 h-4" />
                  </div>
                  <h2 className="text-[17px] font-bold text-slate-800 dark:text-white">Recent Punching</h2>
                  {/* <div className="relative z-50 ml-2">
                    <DatePicker
                      selected={currentDate}
                      onChange={(date) => { if (date) setCurrentDate(date); }}
                      maxDate={new Date()}
                      dateFormat="dd MMM yyyy"
                      className="px-3 h-[36px] bg-slate-100 hover:bg-slate-200 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] font-semibold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white dark:[color-scheme:dark] w-[130px] text-slate-700 cursor-pointer text-center transition-colors"
                    />
                  </div> */}
                </div>
                <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold">
                  <button
                    onClick={() => setRecentPunchingFilter('All')}
                    className={`min-w-[100px] h-[36px] flex items-center justify-center rounded-lg border transition-colors ${recentPunchingFilter === 'All' ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                  >
                    All: {recentPunchesData.length}
                  </button>
                  <button
                    onClick={() => setRecentPunchingFilter('Present')}
                    className={`min-w-[100px] h-[36px] flex items-center justify-center rounded-lg border transition-colors ${recentPunchingFilter === 'Present' ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                  >
                    Present: {recentPresentCount}
                  </button>
                  <button
                    onClick={() => setRecentPunchingFilter('Absent')}
                    className={`min-w-[100px] h-[36px] flex items-center justify-center rounded-lg border transition-colors ${recentPunchingFilter === 'Absent' ? 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                  >
                    Absent: {recentAbsentCount}
                  </button>
                  <button
                    onClick={() => setRecentPunchingFilter('Leave')}
                    className={`min-w-[100px] h-[36px] flex items-center justify-center rounded-lg border transition-colors ${recentPunchingFilter === 'Leave' ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                  >
                    Leave: {recentLeaveCount}
                  </button>
                  <button
                    onClick={() => setRecentPunchingFilter('Late')}
                    className={`min-w-[100px] h-[36px] flex items-center justify-center rounded-lg border transition-colors ${recentPunchingFilter === 'Late' ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}
                  >
                    Late: {recentLateCount}
                  </button>
                </div>
              </div>
            }
            customBottomLeft={
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <Calendar className="w-4 h-4" />
                <span>{format(currentDate, 'EEEE, dd-MM-yyyy')}</span>
              </div>
            }
            searchFn={(item, query) =>
              item.name.toLowerCase().includes(query.toLowerCase()) ||
              item.code.toLowerCase().includes(query.toLowerCase())
            }
            itemsPerPage={15}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
