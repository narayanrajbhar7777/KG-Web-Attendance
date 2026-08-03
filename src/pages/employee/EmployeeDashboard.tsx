import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import Loader from '../../components/Loader';
import { format, startOfMonth, getDay, getDaysInMonth, isAfter, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, ExternalLink, Send } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ATTENDANCE_BASE_MAP, ATTENDANCE_STATUS, ATTENDANCE_STATUS_MAP, DAYS } from '../../constants';
import { AttendanceTable, type ColumnDef } from '../../components/AttendanceTable';
import { fetchEmployeePunchData, fetchLeaveTypes } from '../../api';
import { normalizeAttendanceStatus, calculateTimeNum, getAttendanceFieldStyle, calculateTime, isRecordLate } from '../../utils/attendanceUtils';

const EmployeeDashboard: React.FC = () => {
  const { user, login } = useAuth();
  const { applyRequest, addNotification, customColors } = useAppData();
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [empDetState, setEmpDetState] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const [requestType, setRequestType] = useState<'Leave' | 'Missed Punch'>('Leave');
  const [date, setDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [inTime, setInTime] = useState('');
  const [outTime, setOutTime] = useState('');
  const [leaveType, setLeaveType] = useState<string>('');
  const [managerId, setManagerId] = useState<string>('');
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);

  useEffect(() => {
    const loadLeaveTypes = async () => {
      const types = await fetchLeaveTypes();
      setLeaveTypes(types);
      if (types.length > 0) {
        setLeaveType(types[0].code);
      }
    };
    loadLeaveTypes();
  }, []);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const frDate = format(startOfMonth(currentDate), 'dd-MMM-yyyy');
      const toDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), getDaysInMonth(currentDate)), 'dd-MMM-yyyy');

      let currentEmpDet = empDetState;
      if (!currentEmpDet) {
        currentEmpDet = user.employee_list;
        if (currentEmpDet) setEmpDetState(currentEmpDet);
      }



      const punchRes = await fetchEmployeePunchData(user.id, frDate, toDate);

      const empDet = currentEmpDet;
      const punchData = punchRes?.EMP_PUNCH_DATA || [];

      if (empDet && empDet.e_desg && user.designation !== empDet.e_desg) {
        login({ ...user, designation: user?.designation });
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

      const managers = user.manager_code ? [{ id: user.manager_code.toString(), name: user.manager_name }] : [];

      if (managers.length > 0) {
        setManagerId(prev => prev || managers[0].id);
      }

      setDashboardData({
        attendance: { records },
        requests: [],
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

  if (loading && !dashboardData) {
    return <div className="flex items-center justify-center min-h-[70vh]"><Loader /></div>;
  }

  const { attendance: empAttendance, requests: empRequests = [], managers = [] } = dashboardData || {};
  const myAttendance = empAttendance?.records || [];

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
      toast.error("Please select a manager to approve this request.");
      return;
    }

    try {
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
        addNotification(`New Missed Punch Request applied by ${user.name}`, managerId);
        addNotification(`New Missed Punch Request applied by ${user.name}`); // for Admin
      }

      toast.success(`${requestType} request submitted successfully!`);

      // Reset
      setDate('');
      setToDate('');
      setReason('');
      setInTime('');
      setOutTime('');

      // Refresh data
      fetchDashboardData();
    } catch (error) {
      toast.error("Failed to submit request. Please try again.");
      console.error(error);
    }
  };

  const currentMonthRecords = myAttendance.filter((r: any) => {
    const d = new Date(r.date);
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  });

  const pastAndPresentRecords = currentMonthRecords
    .filter((r: any) => {
      const d = new Date(r.date);
      return !isAfter(startOfDay(d), today);
    })
    .map((r: any) => {
      const approvedMispunch = empRequests.find((req: any) => req.type === ATTENDANCE_BASE_MAP.MISSPUNCH.label && req.date === r.date && req.status === 'Approved');
      const approvedLeave = empRequests.find((req: any) => req.type === 'Leave' && req.date === r.date && req.status === 'Approved');

      let finalStatus = r.status;
      if (approvedMispunch) finalStatus = 'P/MP';
      else if (approvedLeave) finalStatus = 'L';

      return { ...r, status: finalStatus };
    });

  const presentDays = pastAndPresentRecords.filter((r: any) => r.status === ATTENDANCE_STATUS.PRESENT || r.status === ATTENDANCE_STATUS.IN || r.status === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY || r.status === ATTENDANCE_STATUS.PRESENT_MISSPUNCH).length;
  const weeklyOffs = pastAndPresentRecords.filter((r: any) => r.status === ATTENDANCE_STATUS.WEEK_OFF).length;
  const halfDays = pastAndPresentRecords.filter((r: any) => r.status === ATTENDANCE_STATUS.HALF_DAY).length;
  const absents = pastAndPresentRecords.filter((r: any) => r.status === ATTENDANCE_STATUS.ABSENT).length;
  const misspunchCount = pastAndPresentRecords.filter((r: any) => r.status === ATTENDANCE_STATUS.MISSPUNCH || r.status === ATTENDANCE_STATUS.PRESENT_MISSPUNCH).length;

  let totalHours = 0;
  let presentDaysCount = 0;
  pastAndPresentRecords.forEach((r: any) => {
    if (r.status === ATTENDANCE_STATUS.PRESENT || r.status === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY || r.status === ATTENDANCE_STATUS.PRESENT_MISSPUNCH) {
      presentDaysCount++;
      if (r.checkIn && r.checkOut) {
        const { totalMins } = calculateTimeNum(r.checkIn, r.checkOut);
        totalHours += totalMins / 60;
      }
    }
  });
  const avgHrs = presentDaysCount > 0 ? (totalHours / presentDaysCount).toFixed(1) : '0';

  const listData = days.map(day => {
    const dateStr = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), 'yyyy-MM-dd');
    const currentIterDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const isFuture = isAfter(currentIterDate, today);

    let status = '-';
    let checkIn = '-';
    let checkOut = '-';
    if (!isFuture) {
      const record = myAttendance.find((r: any) => r.date === dateStr);
      status = record?.status || '-';
      checkIn = record?.checkIn || '-';
      checkOut = record?.checkOut || '-';

      if (!record?.checkIn && !record?.checkOut) {
        if (currentIterDate.getDay() === 0) {
          status = 'WO';
        } else {
          status = 'A';
        }
      }

      const approvedMispunch = empRequests.find((r: any) => r.type === ATTENDANCE_BASE_MAP.MISSPUNCH.label && r.date === dateStr && r.status === 'Approved');
      if (approvedMispunch) {
        status = 'P/MP';
      }
    }

    return {
      date: dateStr,
      day: format(currentIterDate, 'EEEE'),
      checkIn,
      checkOut,
      status: isFuture ? '-' : status
    };
  });

  const columns: ColumnDef<any>[] = [
    {
      key: 'date',
      label: 'DATE',
      render: (item) => {
        const badgeStyle = getAttendanceFieldStyle(item.status, customColors, false);
        return (
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
              {format(new Date(item.date), 'MMM dd, EEE')}
            </span>
            {item.status !== '-' && !['P', 'P/MP'].includes(item.status) && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap border"
                style={{
                  backgroundColor: badgeStyle.backgroundColor,
                  color: badgeStyle.color,
                  borderColor: badgeStyle.borderColor
                }}
              >
                {ATTENDANCE_STATUS_MAP[item.status] || item.status}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'visual',
      label: 'ATTENDANCE VISUAL',
      render: (item) => {
        const isPresent = ['P', 'P/MP', 'IN', 'HD'].includes(item.status);
        const { totalMins } = calculateTimeNum(item.checkIn, item.checkOut);

        let percentage = Math.min(100, Math.max(0, Math.round((totalMins / 540) * 100)));
        if (totalMins === 0 && isPresent) {
          percentage = item.status === 'HD' ? 50 : 100;
        }

        const isCheckedOut = item.checkOut !== '-';
        const statusStyle = getAttendanceFieldStyle(item.status, customColors, true);

        return (
          <div className="flex items-center gap-1 w-32">
            <div
              className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border"
              style={{ borderColor: item.status !== '-' ? statusStyle.backgroundColor : '#cbd5e1' }}
            >
              {percentage > 0 && (
                <div
                  className={`h-full ${item.status === 'HD' ? 'bg-blue-300' : 'bg-blue-400'}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              )}
              {isCheckedOut && percentage < 100 && percentage > 0 && (
                <div
                  className="h-full bg-red-400 dark:bg-red-500"
                  style={{ width: `${100 - percentage}%` }}
                ></div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'effective',
      label: 'EFFECTIVE HOURS',
      render: (item) => {
        const { total } = calculateTime(item.checkIn, item.checkOut);
        const hasTime = total !== '00:00' && item.checkIn !== '-';
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${hasTime ? 'bg-blue-400' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
            <span className="text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">{hasTime ? `${total} hrs` : '-'}</span>
          </div>
        );
      }
    },
    {
      key: 'gross',
      label: 'GROSS HOURS',
      render: (item) => {
        const { total } = calculateTime(item.checkIn, item.checkOut);
        const hasTime = total !== '00:00' && item.checkIn !== '-';
        return <span className="text-[13px] text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">{hasTime ? `${total} hrs` : '-'}</span>;
      }
    },
    {
      key: 'arrival',
      label: 'ARRIVAL',
      render: (item) => {
        const late = isRecordLate(item.checkIn);
        const arrivalText = item.checkIn === '-' ? '-' : (late ? 'Late' : 'On Time');
        return <span className={`text-[13px] font-medium whitespace-nowrap ${arrivalText === 'Late' ? 'text-amber-600 dark:text-amber-500' : 'text-slate-600 dark:text-slate-300'}`}>{arrivalText}</span>;
      }
    },
    {
      key: 'log',
      label: 'LOG',
      render: (item) => (
        <div className="flex items-center gap-3 text-[11.5px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap bg-slate-50 dark:bg-[#182333] px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1">
            <span className="text-green-500">↙</span>
            <span className="font-medium">{item.checkIn !== '-' ? item.checkIn : '--:--'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-rose-500">↗</span>
            <span className="font-medium">{item.checkOut !== '-' ? item.checkOut : '--:--'}</span>
          </div>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in-up h-full flex flex-col relative">
      {loading && dashboardData && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-50 rounded-2xl">
          <Loader />
        </div>
      )}
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
          { label: 'Misspunch', value: misspunchCount, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' }
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
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  My Attendance
                </h3>
                <div className="flex bg-slate-200 dark:bg-[#0b1120] rounded-lg p-1 border border-slate-300 dark:border-slate-700">
                  <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-white dark:bg-[#1e293b] shadow text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}> Cal</button>
                  <button onClick={() => setViewMode('list')} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-[#1e293b] shadow text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>List</button>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <button onClick={() => navigate('/employee/attendance')} title="Show Report" className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded transition-colors flex items-center justify-center">
                  <ExternalLink className="w-5 h-5" />
                </button>
                <div className="relative z-50">
                  <DatePicker
                    selected={currentDate}
                    onChange={(date: Date | null) => { if (date) setCurrentDate(date); }}
                    maxDate={new Date()}
                    dateFormat="MMMM yyyy"
                    showMonthYearPicker
                    className="px-3 h-[36px] bg-slate-100 hover:bg-slate-200 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] font-semibold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white dark:[color-scheme:dark] w-[150px] text-slate-700 cursor-pointer text-center transition-colors"
                  />
                </div>
              </div>
            </div>
            {viewMode === 'calendar' ? (
              <div className="p-4 sm:p-6 flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-7 gap-2 shrink-0 mb-2">
                  {Object.values(DAYS).map(d => (
                    <div key={d.name} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {d.label}
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
                    if (!isFuture) {
                      const record = myAttendance.find((r: any) => r.date === dateStr);
                      status = record?.status || '-';

                      if (!record?.checkIn && !record?.checkOut) {
                        if (currentIterDate.getDay() === 0) {
                          status = 'WO';
                        } else {
                          status = 'A';
                        }
                      }

                      const approvedMispunch = empRequests.find((r: any) => r.type === ATTENDANCE_BASE_MAP.MISSPUNCH.label && r.date === dateStr && r.status === 'Approved');
                      if (approvedMispunch) {
                        status = 'P/MP';
                      }
                    }

                    let bgColor = 'font-bold shadow-sm';
                    if (isFuture || status === '-') {
                      bgColor += ' bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60';
                    }

                    let customStyle: React.CSSProperties = isFuture || status === '-'
                      ? {}
                      : getAttendanceFieldStyle(status, customColors, true);

                    const displayStatus = isFuture ? '' : status;
                    const tooltip = !isFuture && displayStatus !== '-' ? `${day} ${displayStatus}: ${ATTENDANCE_STATUS_MAP[displayStatus] || displayStatus}` : '';

                    return (
                      <div key={day} title={tooltip} style={customStyle} className={`relative group rounded-lg flex flex-col items-center justify-center p-1 transition-colors h-full ${bgColor}`}>
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-10 pointer-events-none">
                          {ATTENDANCE_STATUS_MAP[status] || status}
                        </div>
                        <span className="text-xs opacity-80 mb-1">{day}</span>
                        <span className="text-sm">{displayStatus}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 bg-white dark:bg-[#1e293b] overflow-hidden flex flex-col">
                <AttendanceTable
                  className="border-0 shadow-none rounded-none flex-1 overflow-y-auto"
                  data={listData}
                  columns={columns}
                  searchable={false}
                />
              </div>
            )}
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
                  onClick={() => setRequestType(ATTENDANCE_BASE_MAP.MISSPUNCH.label)}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${requestType === ATTENDANCE_BASE_MAP.MISSPUNCH.label ? 'bg-white dark:bg-[#1e293b] shadow dark:shadow-none text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                  Missed Punch
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
                        className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors dark:[color-scheme:dark]"
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
                        className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors dark:[color-scheme:dark]"
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
                      className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors dark:[color-scheme:dark]"
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
                      {leaveTypes.map((type) => (
                        <option key={type.id || type.code} value={type.code}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {requestType === ATTENDANCE_BASE_MAP.MISSPUNCH.label && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">In</label>
                      <input
                        type="time"
                        required
                        value={inTime}
                        onChange={e => setInTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors dark:[color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Out</label>
                      <input
                        type="time"
                        required
                        value={outTime}
                        onChange={e => setOutTime(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors dark:[color-scheme:dark]"
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
