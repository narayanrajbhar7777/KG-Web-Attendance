import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import { format, startOfMonth, getDay, getDaysInMonth, addMonths, subMonths, isAfter, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Send, ChevronLeft, ChevronRight } from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
  const statusMap: Record<string, string> = {
    'P': 'Present',
    'A': 'Absent',
    'WO': 'Weekly Off',
    'H': 'Holiday',
    'HD': 'Half Day',
    'PH': 'Present on Holiday',
    'EL': 'Earned Leave',
    'HDEL': 'Half Day Earned Leave',
    'L': 'Late',
    'EO': 'Early Out',
    'NJ': 'Not Joined',
    'LWP': 'Leave without Pay',
    'P/MP': 'Present/Misspunch'
  };

  const { user } = useAuth();
  const { attendance, requests, applyRequest, addNotification, customColors } = useAppData();

  const [requestType, setRequestType] = useState<'Leave' | 'Misspunch'>('Leave');
  const [date, setDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [leaveType, setLeaveType] = useState<string>('PL');
  const [currentDate, setCurrentDate] = useState(new Date());

  const myAttendance = attendance.find(a => a.userId === user?.id)?.records || [];

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  const monthStart = startOfMonth(currentDate);
  const daysInMonth = getDaysInMonth(currentDate);
  const startDayOfWeek = getDay(monthStart);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyCells = Array.from({ length: startDayOfWeek });
  const today = startOfDay(new Date());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    applyRequest({
      userId: user.id,
      type: requestType,
      date,
      toDate: requestType === 'Leave' && toDate ? toDate : undefined,
      reason,
      inTime: requestType === 'Misspunch' ? inTime : undefined,
      outTime: requestType === 'Misspunch' ? outTime : undefined,
      leaveType: requestType === 'Leave' ? leaveType : undefined,
    });

    addNotification(`New ${requestType} request submitted by ${user.name}`);

    // Reset
    setDate('');
    setToDate('');
    setReason('');
    setInTime('');
    setOutTime('');
    alert('Request submitted successfully!');
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
      const approvedMispunch = requests.find(req => req.userId === user?.id && req.type === 'Misspunch' && req.date === r.date && req.status === 'Approved');
      return approvedMispunch ? { ...r, status: 'P/MP' } : r;
    });

  const presentDays = pastAndPresentRecords.filter(r => r.status === 'P' || r.status === 'PH' || r.status === 'P/MP').length;
  const weeklyOffs = pastAndPresentRecords.filter(r => r.status === 'WO').length;
  const halfDays = pastAndPresentRecords.filter(r => r.status === 'HD').length;
  const earlyOuts = pastAndPresentRecords.filter(r => r.status === 'EO').length;
  const earnedLeaves = pastAndPresentRecords.filter(r => r.status === 'EL' || r.status === 'HDEL').length;

  let totalHours = 0;
  let presentDaysCount = 0;
  pastAndPresentRecords.forEach(r => {
    if (r.status === 'P' || r.status === 'PH' || r.status === 'P/MP') {
      presentDaysCount++;
      if (r.checkIn && r.checkOut) {
        const inParts = r.checkIn.split(':').map(Number);
        const outParts = r.checkOut.split(':').map(Number);
        if (inParts.length === 2 && outParts.length === 2) {
          const inMins = inParts[0] * 60 + inParts[1];
          const outMins = outParts[0] * 60 + outParts[1];
          if (outMins > inMins) {
            totalHours += (outMins - inMins) / 60;
          }
        }
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
          { label: 'Present Day', value: presentDays, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20' },
          { label: 'Half Day', value: halfDays, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20' },
          { label: 'Weekly Off', value: weeklyOffs, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20' },
          { label: 'Earned Leave', value: earnedLeaves, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20' },
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
                <CalendarIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" /> My Attendance ({format(currentDate, 'MMMM yyyy')})
              </h3>
              <div className="flex gap-2">
                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
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
                    
                    const approvedMispunch = requests.find(r => r.userId === user?.id && r.type === 'Misspunch' && r.date === dateStr && r.status === 'Approved');
                    if (approvedMispunch) {
                      isMispunch = true;
                      status = 'P/MP';
                    }
                  }

                  let bgColor = 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400';
                  let customStyle: React.CSSProperties = {};
                  const activeColor = customColors[status];
                  
                  if (activeColor) {
                    customStyle = { backgroundColor: activeColor, color: '#ffffff', border: `1px solid ${activeColor}` };
                    bgColor = 'font-bold shadow-sm';
                  } else if (isMispunch) {
                    bgColor = 'bg-gradient-to-br from-green-200 to-red-200 dark:from-green-900/60 dark:to-red-900/60 text-slate-800 dark:text-slate-100 font-bold border border-slate-300 dark:border-slate-600';
                  } else if (!isFuture && status !== '-') {
                    if (status === 'P') bgColor = 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-bold border border-green-200 dark:border-green-500/20';
                    else if (status === 'A') bgColor = 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 font-bold border border-red-200 dark:border-red-500/20';
                    else if (status === 'WO') bgColor = 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600';
                    else if (status === 'L') bgColor = 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-500/20';
                    else if (status === 'HD') bgColor = 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/20';
                    else if (status === 'PH') bgColor = 'bg-emerald-600 dark:bg-emerald-700/60 text-white dark:text-emerald-100 font-bold border border-emerald-700 dark:border-emerald-600';
                  }

                  const displayStatus = isFuture ? '' : status;
                  const tooltip = !isFuture && displayStatus !== '-' ? `${day} ${displayStatus}: ${statusMap[displayStatus] || displayStatus}` : '';

                  return (
                    <div key={day} title={tooltip} style={customStyle} className={`rounded-lg flex flex-col items-center justify-center p-1 transition-colors h-full ${bgColor}`}>
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
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">In Time</label>
                      <input
                        type="time"
                        required
                        value={inTime}
                        onChange={e => setInTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Out Time</label>
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
