import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import { format, startOfMonth, getDay, getDaysInMonth, addMonths, subMonths, isAfter, startOfDay, isSameMonth } from 'date-fns';
import { Calendar as CalendarIcon, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { ATTENDANCE_STATUS_MAP, DEFAULT_ATTENDANCE_COLORS } from '../../constants';
import { fetchEmployeePunchDataExternal, fetchEmployeeDetailsExternal, fetchEmployeeRequests } from '../../api';
import { normalizeAttendanceStatus, calculateTimeNum } from '../../utils/attendanceUtils';

const EmployeeDashboard: React.FC = () => {
  const { user, login } = useAuth();
  const { applyRequest, addNotification, customColors } = useAppData();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [empDetState, setEmpDetState] = useState<any>(null);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const frDate = format(startOfMonth(currentDate), 'dd-MMM-yyyy');
      const toDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), getDaysInMonth(currentDate)), 'dd-MMM-yyyy');

      let currentEmpDet = empDetState;
      if (!currentEmpDet) {
        const empDetRes = await fetchEmployeeDetailsExternal(user.id);
        currentEmpDet = empDetRes?.EMP_DATA?.[0];
        if (currentEmpDet) setEmpDetState(currentEmpDet);
      }

      const [requestsData, punchRes] = await Promise.all([
        fetchEmployeeRequests(user.id),
        fetchEmployeePunchDataExternal(user.id, frDate, toDate)
      ]);

      const empDet = currentEmpDet;
      const punchData = punchRes?.EMP_PUNCH_DATA || [];

      if (empDet && empDet.e_desg && user.designation !== empDet.e_desg) {
        login({ ...user, designation: empDet.e_desg });
      }

      const records = punchData
        .filter((p: any) => p.emp_id === user.code || String(p.emp_id) === String(user.code))
        .map((p: any) => {
          const date = p.logindate ? p.logindate.split(' ')[0] : '';
          const checkIn = p.intime ? p.intime.split(' ')[1]?.substring(0, 5) : '';
          const checkOut = p.outtime ? p.outtime.split(' ')[1]?.substring(0, 5) : '';

          const status = normalizeAttendanceStatus(p.status, checkIn, checkOut, date);

          return { date, status, checkIn, checkOut };
        });

      const managers = empDet?.s_mgrcd ? [{ id: empDet.s_mgrcd.toString(), name: empDet.mgrname }] : [];

      setDashboardData({
        attendance: { records },
        requests: requestsData?.requests || [],
        managers
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user, currentDate]);

  const [requestType, setRequestType] = useState<'Leave' | 'Misspunch'>('Leave');
  const [date, setDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [leaveType, setLeaveType] = useState<string>('PL');
  const [managerId, setManagerId] = useState<string>('');

  if (loading && !dashboardData) {
    return <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const { attendance: empAttendance, requests: empRequests = [], managers = [] } = dashboardData || {};
  const myAttendance = empAttendance?.records || [];

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  const monthStart = startOfMonth(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);
  const startDayOfWeek = getDay(monthStart);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyCells = Array.from({ length: startDayOfWeek });
  const today = startOfDay(new Date());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!managerId) {
      alert("Please select a manager to approve this request.");
      return;
    }

    if (requestType === 'Leave') {
      await applyRequest({
        userId: user.id,
        managerId,
        type: 'Leave',
        date,
        toDate,
        reason,
        leaveType
      });
      addNotification(`New Leave Request applied by ${user.name}`, managerId);
      addNotification(`New Leave Request applied by ${user.name}`); // for Admin
    } else {
      await applyRequest({
        userId: user.id,
        managerId,
        type: 'Misspunch',
        date,
        reason,
        inTime,
        outTime
      });
      addNotification(`New Misspunch Request applied by ${user.name}`, managerId);
      addNotification(`New Misspunch Request applied by ${user.name}`); // for Admin
    }

    // Reset
    setDate('');
    setToDate('');
    setReason('');
    setInTime('');
    setOutTime('');

    // Refresh data
    fetchDashboardData();
  };

  const currentMonthRecords = myAttendance.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  });

  const pastAndPresentRecords = currentMonthRecords
    .filter(r => {
      const d = new Date(r.date);
      return !isAfter(startOfDay(d), today);
    })
    .map(r => {
      const approvedMispunch = empRequests.find((req: any) => req.type === 'Misspunch' && req.date === r.date && req.status === 'Approved');
      const approvedLeave = empRequests.find((req: any) => req.type === 'Leave' && req.date === r.date && req.status === 'Approved');

      let finalStatus = r.status;
      if (approvedMispunch) finalStatus = 'P/MP';
      else if (approvedLeave) finalStatus = 'L';

      return { ...r, status: finalStatus };
    });

  const presentDays = pastAndPresentRecords.filter(r => r.status === 'P' || r.status === 'In' || r.status === 'PH' || r.status === 'P/MP').length;
  const weeklyOffs = pastAndPresentRecords.filter(r => r.status === 'WO').length;
  const halfDays = pastAndPresentRecords.filter(r => r.status === 'HD').length;
  const earlyOuts = pastAndPresentRecords.filter(r => r.status === 'EO').length;
  const absents = pastAndPresentRecords.filter(r => r.status === 'A').length;

  let totalHours = 0;
  let presentDaysCount = 0;
  pastAndPresentRecords.forEach(r => {
    if (r.status === 'P' || r.status === 'PH' || r.status === 'P/MP') {
      presentDaysCount++;
      if (r.checkIn && r.checkOut) {
        const { totalMins } = calculateTimeNum(r.checkIn, r.checkOut);
        totalHours += totalMins / 60;
      }
    }
  });
  const avgHrs = presentDaysCount > 0 ? (totalHours / presentDaysCount).toFixed(1) : '0';


  return (
    <div className="space-y-4 animate-fade-in-up h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors">Welcome, {user?.name}</h2>
        <p className="text-slate-500 dark:text-slate-400 transition-colors">Employee Code: {user?.code}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Avg Hrs', value: `${avgHrs}h`, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20' },
          { label: 'Present', value: presentDays, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20' },
          { label: 'Absent', value: absents, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20' },
          { label: 'Half Day', value: halfDays, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20' },
          { label: 'Week Off', value: weeklyOffs, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20' },
          { label: 'Early Out', value: earlyOuts, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' }
        ].map((stat, i) => (
          <div key={i} className={`p-4 rounded-xl border flex flex-col justify-center transition-colors ${stat.bg}`}>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{stat.label}</span>
            <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">

        {/* Left Column: Calendar/Attendance */}
        <div className="lg:col-span-2 xl:col-span-3 flex flex-col min-h-0 h-full">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300 h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#182333]/50 flex items-center justify-between transition-colors shrink-0">
              <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <button onClick={() => navigate('/employee/attendance')} title="Show Report" className="hover:opacity-80 transition-opacity flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                </button>
                My Attendance ({format(currentDate, 'MMMM yyyy')})
              </h3>
              <div className="flex gap-3 items-center">
                <div className="flex gap-1">
                  <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button
                    onClick={handleNextMonth}
                    disabled={isSameMonth(currentDate, new Date())}
                    className={`p-1.5 rounded transition-colors ${isSameMonth(currentDate, new Date()) ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400'}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-7 gap-2 shrink-0 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-[minmax(4rem,1fr)]">

                {/* Offset for first day of month */}
                {emptyCells.map((_, i) => <div key={`empty-${i}`} />)}

                {days.map(day => {
                  const dateStr = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), 'yyyy-MM-dd');
                  const currentIterDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

                  const isFuture = isAfter(currentIterDate, today);

                  let status = '-';
                  let isMispunch = false;
                  if (!isFuture) {
                    const record = myAttendance.find(r => r.date === dateStr);
                    status = record?.status || '-';

                    if (!record?.checkIn && !record?.checkOut) {
                      if (currentIterDate.getDay() === 0) {
                        status = 'WO';
                      } else {
                        status = 'A';
                      }
                    }

                    const approvedMispunch = empRequests.find((r: any) => r.type === 'Misspunch' && r.date === dateStr && r.status === 'Approved');
                    if (approvedMispunch) {
                      isMispunch = true;
                      status = 'P/MP';
                    }
                  }

                  let bgColor = 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400';
                  let customStyle: React.CSSProperties = {};
                  const activeColor = customColors[status] || DEFAULT_ATTENDANCE_COLORS[status];

                  if (activeColor) {
                    customStyle = { backgroundColor: activeColor, color: '#ffffff', border: `1px solid ${activeColor}` };
                    bgColor = 'font-bold shadow-sm';
                  } else if (!isFuture && status !== '-') {
                    if (status === 'P') bgColor = 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-bold border border-green-200 dark:border-green-500/20';
                    else if (status === 'A') bgColor = 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 font-bold border border-red-200 dark:border-red-500/20';
                    else if (status === 'WO') bgColor = 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600';
                    else if (status === 'L') bgColor = 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-500/20';
                    else if (status === 'HD') bgColor = 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/20';
                    else if (status === 'PH') bgColor = 'bg-emerald-600 dark:bg-emerald-700/60 text-white dark:text-emerald-100 font-bold border border-emerald-700 dark:border-emerald-600';
                    else if (status === 'H') bgColor = 'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-400 font-bold border border-fuchsia-200 dark:border-fuchsia-500/20';
                    else if (status === 'M' || status === 'P/MP') bgColor = 'bg-gradient-to-br from-green-200 to-red-200 dark:from-green-900/60 dark:to-red-900/60 text-slate-800 dark:text-slate-100 font-bold border border-slate-300 dark:border-slate-600';
                    else if (status === 'In') bgColor = 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-bold border border-cyan-200 dark:border-cyan-500/20';
                  }

                  const displayStatus = isFuture ? '' : status;
                  const tooltip = !isFuture && displayStatus !== '-' ? `${day} ${displayStatus}: ${ATTENDANCE_STATUS_MAP[displayStatus] || displayStatus}` : '';

                  return (
                    <div key={day} title={tooltip} style={customStyle} className={`relative group rounded-lg flex flex-col items-center justify-center p-1 transition-colors h-full ${bgColor}`}>
                      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-10 pointer-events-none">
                        {ATTENDANCE_STATUS_MAP[status] || status}
                      </div>
                      <span className="text-xs opacity-80 mb-1" style={activeColor ? { textShadow: '0 1px 2px rgba(0,0,0,0.3)' } : {}}>{day}</span>
                      <span className="text-sm" style={activeColor ? { textShadow: '0 1px 2px rgba(0,0,0,0.3)' } : {}}>{displayStatus}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Request Form */}
        <div className="lg:col-span-1 h-full">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300 h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#182333]/50 transition-colors shrink-0">
              <h3 className="font-semibold text-slate-800 dark:text-white">Apply for Request</h3>
            </div>
            <div className="p-6">

              <div className="flex bg-slate-100 dark:bg-[#0b1120] p-1 rounded-lg mb-6 transition-colors">
                <button
                  type="button"
                  onClick={() => setRequestType('Leave')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${requestType === 'Leave' ? 'bg-white dark:bg-[#1e293b] shadow dark:shadow-none text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                  Leave
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType('Misspunch')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${requestType === 'Misspunch' ? 'bg-white dark:bg-[#1e293b] shadow dark:shadow-none text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                  Misspunch
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {requestType === 'Leave' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">From Date</label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">To Date</label>
                      <input
                        type="date"
                        required
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        min={date}
                        className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Manager</label>
                  <select
                    required
                    value={managerId}
                    onChange={e => setManagerId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                  >
                    <option value="" disabled>Select a Manager...</option>
                    {managers.map((mgr: any) => (
                      <option key={mgr.id} value={mgr.id}>{mgr.name}</option>
                    ))}
                  </select>
                </div>

                {requestType === 'Leave' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Leave Type</label>
                    <select
                      value={leaveType}
                      onChange={e => setLeaveType(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                    >
                      <option value="PL">Privilege Leave (PL)</option>
                      <option value="SL">Sick Leave (SL)</option>
                      <option value="CL">Casual Leave (CL)</option>
                      <option value="CS">Compensatory Off (CS)</option>
                      <option value="Full">Full Day</option>
                      <option value="Half">Half Day</option>
                    </select>
                  </div>
                )}

                {requestType === 'Misspunch' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">In</label>
                      <input
                        type="time"
                        required
                        value={inTime}
                        onChange={e => setInTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Out</label>
                      <input
                        type="time"
                        required
                        value={outTime}
                        onChange={e => setOutTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                  <textarea
                    required
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    placeholder="Provide a reason..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" /> Submit Request
                </button>
              </form>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
