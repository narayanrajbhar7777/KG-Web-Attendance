import React, { useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { Calendar, EyeOff, Filter, Download, MoreVertical, ArrowRight, Table, Check, X, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';

const AdminDashboard: React.FC = () => {
  const { requests, users, updateRequestStatus, addNotification } = useAppData();
  const employees = users.filter(u => u.role === 'Employee');

  const [leavesSearch, setLeavesSearch] = useState('');
  const [punchesSearch, setPunchesSearch] = useState('');
  const [leaveReportSearch, setLeaveReportSearch] = useState('');
  const [punchReportSearch, setPunchReportSearch] = useState('');
  const [recentPunchingSearch, setRecentPunchingSearch] = useState('');

  const pendingLeaves = requests.filter(r => r.type === 'Leave' && r.status === 'Pending').length;
  const approvedLeaves = requests.filter(r => r.type === 'Leave' && r.status === 'Approved').length;
  const rejectedLeaves = requests.filter(r => r.type === 'Leave' && r.status === 'Rejected').length;

  const pendingPunches = requests.filter(r => r.type === 'Misspunch' && r.status === 'Pending').length;
  const approvedPunches = requests.filter(r => r.type === 'Misspunch' && r.status === 'Approved').length;
  const rejectedPunches = requests.filter(r => r.type === 'Misspunch' && r.status === 'Rejected').length;

  const pendingRequestsList = requests.filter(r => r.status === 'Pending');
  
  const pendingLeaveList = pendingRequestsList.filter(r => {
    if (r.type !== 'Leave') return false;
    const user = users.find(u => u.id === r.userId);
    return user?.name.toLowerCase().includes(leavesSearch.toLowerCase()) || user?.code.toLowerCase().includes(leavesSearch.toLowerCase());
  });

  const pendingPunchList = pendingRequestsList.filter(r => {
    if (r.type !== 'Misspunch') return false;
    const user = users.find(u => u.id === r.userId);
    return user?.name.toLowerCase().includes(punchesSearch.toLowerCase()) || user?.code.toLowerCase().includes(punchesSearch.toLowerCase());
  });

  const processedLeaveRequests = requests.filter(r => {
    if (r.status === 'Pending' || r.type !== 'Leave') return false;
    const user = users.find(u => u.id === r.userId);
    return user?.name.toLowerCase().includes(leaveReportSearch.toLowerCase()) || user?.code.toLowerCase().includes(leaveReportSearch.toLowerCase());
  });

  const processedMisspunchRequests = requests.filter(r => {
    if (r.status === 'Pending' || r.type !== 'Misspunch') return false;
    const user = users.find(u => u.id === r.userId);
    return user?.name.toLowerCase().includes(punchReportSearch.toLowerCase()) || user?.code.toLowerCase().includes(punchReportSearch.toLowerCase());
  });

  const recentPunches = [
    { id: 1, emp: employees[0], date: '2026-07-09', checkIn: '09:00 AM', checkOut: '06:30 PM', duration: '09h 30m', status: 'Approved' },
    { id: 2, emp: employees[1], date: '2026-07-10', checkIn: '09:15 AM', checkOut: '06:15 PM', duration: '09h 00m', status: 'Approved' },
    { id: 3, emp: employees[2], date: '2026-07-15', checkIn: '09:00 AM', checkOut: '06:15 PM', duration: '09h 15m', status: 'Approved' },
  ].filter(p => p.emp?.name.toLowerCase().includes(recentPunchingSearch.toLowerCase()) || p.emp?.code.toLowerCase().includes(recentPunchingSearch.toLowerCase()));

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
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{approvedPunches}</p>
                </div>
                <div className="bg-slate-50 dark:bg-[#2a374a]/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 text-center transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Rejected</p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{rejectedPunches}</p>
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
            <div className="overflow-auto custom-scrollbar max-h-[340px] relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-[#1e293b] z-10">
                  <tr className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 transition-colors">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Date & Details</th>
                    <th className="py-4 px-6 text-right">Actions</th>
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
                    pendingLeaveList.map((req) => {
                      const emp = users.find(u => u.id === req.userId);
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors">
                          <td className="py-4 px-6">
                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{emp?.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{emp?.code}</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{format(new Date(req.date), 'MMM dd, yyyy')}</p>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">{req.reason}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Type: {req.leaveType} Day</p>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex flex-col sm:flex-row items-end justify-end gap-2">
                              <button
                                onClick={() => {
                                  updateRequestStatus(req.id, 'Approved');
                                  addNotification(`Your Leave request on ${format(new Date(req.date), 'MMM dd')} has been Approved`, req.userId);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => {
                                  updateRequestStatus(req.id, 'Rejected');
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
            <div className="overflow-auto custom-scrollbar max-h-[340px] relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-[#1e293b] z-10">
                  <tr className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 transition-colors">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Date & Details</th>
                    <th className="py-4 px-6 text-right">Actions</th>
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
                    pendingPunchList.map((req) => {
                      const emp = users.find(u => u.id === req.userId);
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors">
                          <td className="py-4 px-6">
                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{emp?.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{emp?.code}</p>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{format(new Date(req.date), 'MMM dd, yyyy')}</p>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">{req.reason}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              In: {req.inTime || 'N/A'} | Out: {req.outTime || 'N/A'}
                            </p>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex flex-col sm:flex-row items-end justify-end gap-2">
                              <button
                                onClick={() => {
                                  updateRequestStatus(req.id, 'Approved');
                                  addNotification(`Your Misspunch request on ${format(new Date(req.date), 'MMM dd')} has been Approved`, req.userId);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => {
                                  updateRequestStatus(req.id, 'Rejected');
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
          </div>
        </div>

        <div className="shrink-0 grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Leave Requests Report Table */}
          <div className="flex flex-col bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="bg-purple-50 dark:bg-purple-500/10 p-1.5 rounded-lg text-purple-600 dark:text-purple-400">
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

            <div className="overflow-auto custom-scrollbar max-h-[340px] relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-[#1e293b] z-10">
                  <tr className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 transition-colors">
                    <th className="py-4 px-6">Employee Name</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Leave Details</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {processedLeaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No leave reports found.
                      </td>
                    </tr>
                  ) : (
                    processedLeaveRequests.map((req) => {
                      const emp = users.find(u => u.id === req.userId);
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-[#1e293b]">
                                {emp?.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{emp?.name}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{emp?.code}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300 font-medium">
                            {format(new Date(req.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{req.reason}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Type: {req.leaveType} Day</p>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${req.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                              : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20'
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
            <div className="p-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-[#182333]/50 transition-colors">
              <span>Showing {processedLeaveRequests.length} entries</span>
            </div>
          </div>

          {/* Missing Punch Report Table */}
          <div className="flex flex-col bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400">
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

            <div className="overflow-auto custom-scrollbar max-h-[340px] relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-[#1e293b] z-10">
                  <tr className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 transition-colors">
                    <th className="py-4 px-6">Employee Name</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Punch Details</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {processedMisspunchRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No missing punch reports found.
                      </td>
                    </tr>
                  ) : (
                    processedMisspunchRequests.map((req) => {
                      const emp = users.find(u => u.id === req.userId);
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-[#1e293b]">
                                {emp?.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{emp?.name}</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{emp?.code}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300 font-medium">
                            {format(new Date(req.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{req.reason}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Check In: {req.inTime || 'N/A'} | Check Out: {req.outTime || 'N/A'}
                            </p>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${req.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                              : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20'
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
            <div className="p-3 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-[#182333]/50 transition-colors">
              <span>Showing {processedMisspunchRequests.length} entries</span>
            </div>
          </div>
        </div>

        {/* Recent Punching Table */}
        <div className="shrink-0 bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">

          {/* Table Header Controls */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 dark:bg-white/10 p-1.5 rounded-lg text-blue-500 dark:text-white">
                <Table className="w-4 h-4" />
              </div>
              <h3 className="text-[17px] font-bold text-slate-800 dark:text-white">Recent Punching</h3>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Employee..."
                value={recentPunchingSearch}
                onChange={(e) => setRecentPunchingSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all placeholder:text-slate-400"
              />
            </div>

          </div>

          {/* Table */}
          <div className="overflow-auto custom-scrollbar max-h-[340px] relative">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-[#1e293b] z-10">
                <tr className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 transition-colors">
                  <th className="py-4 px-6">Employee Name</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Check In</th>
                  <th className="py-4 px-6">Checkout</th>
                  <th className="py-4 px-6">Duration</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {recentPunches.map((punch) => (
                  <tr key={punch.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-[#1e293b]">
                          {punch.emp?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{punch.emp?.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Engineering Dept.</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300 font-medium">{format(new Date(punch.date), 'MMM dd, yyyy')}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300 font-medium">{punch.checkIn}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300 font-medium">{punch.checkOut}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300 font-medium">{punch.duration}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        {punch.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-[#182333]/50 transition-colors">
            <span>Showing {recentPunches.length} of 128 entries</span>
            <div className="flex items-center gap-1.5">
              <button className="w-7 h-7 flex items-center justify-center border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2a374a] rounded shadow-sm text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-[#34445c] dark:hover:text-white transition-colors">&lt;</button>
              <button className="w-7 h-7 flex items-center justify-center border border-blue-600 dark:border-blue-500 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 transition-colors">1</button>
              <button className="w-7 h-7 flex items-center justify-center border border-slate-200 dark:border-slate-600 bg-white dark:bg-[#2a374a] rounded shadow-sm text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-[#34445c] dark:hover:text-white transition-colors">&gt;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
