import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import { fetchRequests, fetchUsers, fetchEmployeeDataExternal } from '../../api';
import type { AppRequest, User } from '../../types';
import { Calendar, EyeOff, Table, Check, X, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';
import { AttendanceTable, type ColumnDef } from '../../components/AttendanceTable';
import { getStatusColor, normalizeAttendanceStatus, calculateTime } from '../../utils/attendanceUtils';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateRequestStatus: apiUpdateRequestStatus, addNotification } = useAppData();
  const [requests, setRequests] = useState<AppRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [recentPunchesData, setRecentPunchesData] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const todayStr = format(new Date(), 'dd-MMM-yyyy');

        let reqsData = [];
        try {
          if (user) {
            const managerId = user.code ? user.code.replace('FP', '') : '';
            reqsData = await fetchRequests(managerId);
          }
        } catch (e) { console.error("Failed fetchRequests:", e); }

        let usersData: any[] = [];
        try { usersData = await fetchUsers(); } catch (e) { console.error("Failed fetchUsers:", e); }

        let extData = null;
        if (user) {
          try { extData = await fetchEmployeeDataExternal(user.id, todayStr, todayStr); } catch (e) { console.error("Failed fetchEmployeeDataExternal:", e); }
        }

        setRequests(reqsData || []);
        setUsers(usersData || []);

        if (extData) {
          const empList = extData.empDet?.EMP_DATA || [];
          const punchData = extData.punchDet?.EMP_PUNCH_DATA || [];

          let allEmployees = empList.map((e: any) => ({
            id: e.e_code,
            name: e.e_name,
            code: e.e_code,
            designation: e.e_desg
          }));

          if (user && !allEmployees.some((e: any) => e.code === user.code)) {
            allEmployees.unshift({
              id: user.code,
              name: user.name,
              code: user.code,
              designation: user.designation
            });
          }

          setUsers(allEmployees);

          const processed = allEmployees.map((emp: any) => {
            const p = punchData.find((p: any) => String(p.emp_id) === String(emp.code));

            const checkIn = p?.intime ? p.intime.split(' ')[1]?.substring(0, 5) : '-';
            const checkOut = p?.outtime ? p.outtime.split(' ')[1]?.substring(0, 5) : '-';

            const { total } = calculateTime(checkIn, checkOut);
            const duration = total;

            const currDate = format(new Date(), 'yyyy-MM-dd');
            const pDate = p?.logindate ? p.logindate.split(' ')[0] : currDate;

            const status = normalizeAttendanceStatus(p?.status, checkIn, checkOut, pDate);

            return {
              id: emp.code + '-' + Math.random(),
              code: emp.code,
              name: emp.name || 'Unknown',
              date: p?.logindate ? p.logindate.split(' ')[0] : currDate,
              checkIn,
              checkOut,
              duration,
              status
            };
          });

          processed.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
          setRecentPunchesData(processed);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      }
    };
    if (user) {
      loadData();
    }
  }, [user]);

  const updateRequestStatus = async (id: string, status: AppRequest['status'], reason: string, req?: AppRequest) => {
    await apiUpdateRequestStatus(id, status, reason, req);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
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

  const pendingLeaves = requests.filter(r => r.type === 'Leave' && r.status === 'Pending').length;
  const approvedLeaves = requests.filter(r => r.type === 'Leave' && r.status === 'Approved').length;
  const rejectedLeaves = requests.filter(r => r.type === 'Leave' && r.status === 'Rejected').length;

  const pendingPunches = requests.filter(r => r.type === 'Misspunch' && r.status === 'Pending').length;
  const approvedPunches = requests.filter(r => r.type === 'Misspunch' && r.status === 'Approved').length;
  const rejectedPunches = requests.filter(r => r.type === 'Misspunch' && r.status === 'Rejected').length;

  const pendingRequestsList = requests.filter(r => r.status === 'Pending');

  const pendingLeaveList = pendingRequestsList.filter(r => {
    if (r.type !== 'Leave') return false;
    if (!leavesSearch) return true;
    const user = users.find(u => u.id === r.userId || u.code === r.userId);
    const searchTarget = user ? `${user.name} ${user.code}` : r.userId;
    return searchTarget.toLowerCase().includes(leavesSearch.toLowerCase());
  });

  const pendingPunchList = pendingRequestsList.filter(r => {
    if (r.type !== 'Misspunch') return false;
    if (!punchesSearch) return true;
    const user = users.find(u => u.id === r.userId || u.code === r.userId);
    const searchTarget = user ? `${user.name} ${user.code}` : r.userId;
    return searchTarget.toLowerCase().includes(punchesSearch.toLowerCase());
  });

  const processedLeaveRequests = requests.filter(r => {
    if (r.status === 'Pending' || r.type !== 'Leave') return false;
    if (!leaveReportSearch) return true;
    const user = users.find(u => u.id === r.userId || u.code === r.userId);
    const searchTarget = user ? `${user.name} ${user.code}` : r.userId;
    return searchTarget.toLowerCase().includes(leaveReportSearch.toLowerCase());
  });

  const processedMisspunchRequests = requests.filter(r => {
    if (r.status === 'Pending' || r.type !== 'Misspunch') return false;
    if (!punchReportSearch) return true;
    const user = users.find(u => u.id === r.userId || u.code === r.userId);
    const searchTarget = user ? `${user.name} ${user.code}` : r.userId;
    return searchTarget.toLowerCase().includes(punchReportSearch.toLowerCase());
  });

  const pagedPendingLeaveList = pendingLeaveList.slice(leavesPage * itemsPerPage, (leavesPage + 1) * itemsPerPage);
  const pagedPendingPunchList = pendingPunchList.slice(punchesPage * itemsPerPage, (punchesPage + 1) * itemsPerPage);
  const pagedProcessedLeaveRequests = processedLeaveRequests.slice(leaveReportPage * itemsPerPage, (leaveReportPage + 1) * itemsPerPage);
  const pagedProcessedMisspunchRequests = processedMisspunchRequests.slice(punchReportPage * itemsPerPage, (punchReportPage + 1) * itemsPerPage);

  const recentPresentCount = recentPunchesData.filter(r => ['P', 'P/MP', 'HD', 'M', 'In', 'PH'].includes(r.status)).length;
  const recentAbsentCount = recentPunchesData.filter(r => r.status === 'A').length;
  const recentLeaveCount = recentPunchesData.filter(r => r.status === 'L').length;

  const PaginationFooter = ({ page, setPage, total, label }: any) => {
    const totalPages = Math.ceil(total / itemsPerPage);
    if (total === 0) return (
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
    { key: 'status', label: 'Status', render: (item) => <span className={`text-sm font-medium ${getStatusColor(item.status)}`}>{item.status}</span> },
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

          {/* Missing Punch Card */}
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700/60 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1">
            <div className="p-6 pb-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-[17px] font-bold text-slate-800 dark:text-white">Missing Punch</h3>
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
                    <th className="py-4 px-6">Code</th>
                    <th className="py-4 px-6 ">Name</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Reason</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {pendingLeaveList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No pending leave requests found.
                      </td>
                    </tr>
                  ) : (
                    pagedPendingLeaveList.map((req) => {
                      const emp = users.find(u => String(u.id).replace('FP', '') === String(req.userId).replace('FP', '') || String(u.code).replace('FP', '') === String(req.userId).replace('FP', ''));
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors">
                          <td className="py-4 px-6 text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {emp?.code || req.userId}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-medium text-slate-500 dark:text-slate-400 text-[13px] uppercase whitespace-nowrap">{emp?.name || 'Unknown'}</span>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{req.date ? format(new Date(req.date), 'MMM dd, yyyy') : 'N/A'}</p>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{req.leaveType}</span>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400">
                            <p className="truncate max-w-[150px]" title={req.reason}>{req.reason}</p>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex flex-col sm:flex-row items-end justify-end gap-2">
                              <button
                                onClick={() => {
                                  updateRequestStatus(req.id, 'Approved', req.reason, req);
                                  addNotification(`Your Leave request on ${format(new Date(req.date), 'MMM dd')} has been Approved`, req.userId);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => {
                                  updateRequestStatus(req.id, 'Rejected', req.reason, req);
                                  addNotification(`Your Leave request on ${format(new Date(req.date), 'MMM dd')} has been Rejected`, req.userId);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded border border-red-200 dark:border-red-500/30 text-xs font-bold transition-colors"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
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

          {/* Pending Missing Punch Requests */}
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
                    <th className="py-4 px-6">Code</th>
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">In</th>
                    <th className="py-4 px-6">Out</th>
                    <th className="py-4 px-6">Reason</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {pendingPunchList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No pending punch requests found.
                      </td>
                    </tr>
                  ) : (
                    pagedPendingPunchList.map((req) => {
                      const emp = users.find(u => String(u.id).replace('FP', '') === String(req.userId).replace('FP', '') || String(u.code).replace('FP', '') === String(req.userId).replace('FP', ''));
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors">
                          <td className="py-4 px-6 text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                            {emp?.code || req.userId}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-medium text-slate-500 dark:text-slate-400 text-[13px] uppercase whitespace-nowrap">{emp?.name || 'Unknown'}</span>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{req.date ? format(new Date(req.date), 'MMM dd, yyyy') : 'N/A'}</p>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{req.inTime || '-'}</span>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{req.outTime || '-'}</span>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-500 dark:text-slate-400">
                            <p className="truncate max-w-[150px]" title={req.reason}>{req.reason}</p>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex flex-col sm:flex-row items-end justify-end gap-2">
                              <button
                                onClick={() => {
                                  updateRequestStatus(req.id, 'Approved', req.reason, req);
                                  addNotification(`Your Misspunch request on ${format(new Date(req.date), 'MMM dd')} has been Approved`, req.userId);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => {
                                  updateRequestStatus(req.id, 'Rejected', req.reason, req);
                                  addNotification(`Your Misspunch request on ${format(new Date(req.date), 'MMM dd')} has been Rejected`, req.userId);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded border border-red-200 dark:border-red-500/30 text-xs font-bold transition-colors"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
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
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                <div
                  className="bg-purple-50 dark:bg-purple-500/10 p-1.5 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-colors cursor-pointer"
                  onClick={() => navigate('/admin/leave-requests-report')}
                >
                  <Table className="w-4 h-4" />
                </div>
                <h3 className="text-[17px] font-bold text-slate-800 dark:text-white">Leave Requests Report</h3>
              </div>
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
                  {processedLeaveRequests.length === 0 ? (
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

          {/* Missing Punch Report Table */}
          <div className="flex flex-col bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                <div
                  className="bg-indigo-50 dark:bg-indigo-500/10 p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer"
                  onClick={() => navigate('/admin/missing-punch-report')}
                >
                  <Table className="w-4 h-4" />
                </div>
                <h3 className="text-[17px] font-bold text-slate-800 dark:text-white">Missing Punch Report</h3>
              </div>
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
                  {processedMisspunchRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No missing punch reports found.
                      </td>
                    </tr>
                  ) : (
                    pagedProcessedMisspunchRequests.map((req) => {
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
            <PaginationFooter page={punchReportPage} setPage={setPunchReportPage} total={processedMisspunchRequests.length} label="entries" />
          </div>
        </div>

        {/* Recent Punching Table */}
        <div className="h-[450px]">
          <AttendanceTable
            data={recentPunchesData}
            columns={recentPunchesColumns}
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
                </div>
                <div className="hidden sm:flex items-center gap-4 text-[11px] font-bold bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-emerald-600 dark:text-emerald-400">Present: {recentPresentCount}</span>
                  <span className="text-red-600 dark:text-red-400">Absent: {recentAbsentCount}</span>
                  <span className="text-amber-600 dark:text-amber-400">Leave: {recentLeaveCount}</span>
                </div>
              </div>
            }
            customBottomLeft={
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(), 'EEEE, dd-MM-yyyy')}</span>
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
