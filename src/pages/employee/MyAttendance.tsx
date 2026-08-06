import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, getDaysInMonth, isSameMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { fetchEmployeePunchData, fetchEmployeePolicies, fetchRequests } from '../../api';
import { ATTENDANCE_STATUS, ATTENDANCE_STATUS_MAP, DEFAULT_ATTENDANCE_COLORS, DEFAULT_IN_TIME, DEFAULT_OUT_TIME } from '../../constants';
import { useAppData } from '../../context/AppContext';
import { X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Loader from '../../components/Loader';
import { AttendanceTable } from '../../components/AttendanceTable';
import { processAttendanceRecord, getAttendanceFieldStyle, isRecordLate } from '../../utils/attendanceUtils';

const MyAttendance: React.FC = () => {
  const { user } = useAuth();
  const { customColors, masterConfig, attendanceGlobalRules } = useAppData();
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceFilter, setAttendanceFilter] = useState<string>('All');
  const [stats, setStats] = useState({
    workingDays: 0,
    workingHours: '0h 0m',
    overtimeHours: '0h 0m',
    absents: 0,
    weekOffs: 0,
    missedPunch: 0,
    presentOnHoliday: 0,
    late: 0,
    leave: 0
  });

  const [cachedPolicy, setCachedPolicy] = useState<any>(null);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);

      const frDate = format(startOfMonth(currentDate), 'dd-MMM-yyyy');
      const toDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), getDaysInMonth(currentDate)), 'dd-MMM-yyyy');

      const extData = await fetchEmployeePunchData(user.id, frDate, toDate);
      const punchData = extData?.EMP_PUNCH_DATA || [];

      let myPolicy = cachedPolicy;
      if (!myPolicy) {
        const policies = await fetchEmployeePolicies();
        myPolicy = policies.find((p: any) => p.employeeId === user.id) || { inTime: DEFAULT_IN_TIME, outTime: DEFAULT_OUT_TIME, weekOffs: [0] };
        setCachedPolicy(myPolicy);
      }

      let workerCutoffData = undefined;
      let managerCutoffData = undefined;



      const [pInH, pInM] = myPolicy.inTime.split(':').map(Number);
      const [pOutH, pOutM] = myPolicy.outTime.split(':').map(Number);
      let standardShiftMs = (pOutH * 60 + pOutM) * 60000 - (pInH * 60 + pInM) * 60000;
      if (standardShiftMs < 0) standardShiftMs += 24 * 60 * 60 * 1000;
      let totalWorkingDays = 0;
      let totalWorkingMs = 0;
      let totalOvertimeMs = 0;
      let totalAbsents = 0;
      let totalWeekOffs = 0;
      let totalMissedPunch = 0;
      let totalLate = 0;
      let totalLeave = 0;
      let totalPresentOnHoliday = 0;

      let empRequests: any[] = [];
      try {
        empRequests = await fetchRequests(user.code);
      } catch (err) {
        console.error("Error fetching emp requests", err);
      }

      const parsedRecords = punchData
        .filter((p: any) => {
          const dateStr = p.logindate ? p.logindate.split(' ')[0] : '';
          const recordDate = new Date(dateStr);
          const isUserRecord = p.emp_id === user.code || String(p.emp_id) === String(user.code);
          return isUserRecord && recordDate <= new Date() && isSameMonth(recordDate, currentDate);
        })
        .map((p: any) => {
          return processAttendanceRecord(p, workerCutoffData, attendanceGlobalRules, managerCutoffData, empRequests);
        }).map((r: any) => {
          let finalStatus = r.status;

          if ([ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.PRESENT_MISSPUNCH, ATTENDANCE_STATUS.HALF_DAY, ATTENDANCE_STATUS.MISSPUNCH, ATTENDANCE_STATUS.IN].includes(finalStatus)) {
            totalWorkingDays += 1;
            totalWorkingMs += r.diffMs;
            totalOvertimeMs += (r.otMs || 0);
          } else if (finalStatus === ATTENDANCE_STATUS.ABSENT) {
            totalAbsents += 1;
          } else if (finalStatus === ATTENDANCE_STATUS.WEEK_OFF) {
            totalWeekOffs += 1;
          }

          if ([ATTENDANCE_STATUS.MISSPUNCH, ATTENDANCE_STATUS.PRESENT_MISSPUNCH].includes(finalStatus)) totalMissedPunch++;
          if ([ATTENDANCE_STATUS.LEAVE, ATTENDANCE_STATUS.EARNED_LEAVE, ATTENDANCE_STATUS.HALF_DAY_EARNED_LEAVE].includes(finalStatus)) totalLeave++;
          if (finalStatus === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY) totalPresentOnHoliday++;
          if (isRecordLate(r.checkIn)) totalLate++;

          return { ...r, status: finalStatus };
        }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setRecords(parsedRecords);
      const workH = Math.floor(totalWorkingMs / (1000 * 60 * 60));
      const workM = Math.floor((totalWorkingMs % (1000 * 60 * 60)) / (1000 * 60));

      const otH = Math.floor(totalOvertimeMs / (1000 * 60 * 60));
      const otM = Math.floor((totalOvertimeMs % (1000 * 60 * 60)) / (1000 * 60));

      setStats({
        workingDays: totalWorkingDays,
        workingHours: `${workH}h ${workM}m`,
        overtimeHours: `${otH}h ${otM}m`,
        absents: totalAbsents,
        weekOffs: totalWeekOffs,
        missedPunch: totalMissedPunch,
        presentOnHoliday: totalPresentOnHoliday,
        late: totalLate,
        leave: totalLeave
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, currentDate]);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col relative">
      {loading && (
        <div className="absolute inset-0 z-50 bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
          <Loader />
        </div>
      )}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">

        {/* Fixed Header Section */}
        <div className="bg-white dark:bg-[#1e293b] p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">My Attendance Details</h3>
              <div className="flex gap-4">
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Working Hrs: {stats.workingHours}</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Over Time: {stats.overtimeHours}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
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
              <button
                onClick={() => navigate('/employee')}
                className="ml-2 p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors" title="Close Report"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
            {/* <button
              onClick={() => setAttendanceFilter('All')}
              className="min-w-[100px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
              style={getAttendanceFieldStyle('ALL', { ALL: '#6366f1' }, attendanceFilter === 'All')}
            >
              <span className="font-bold">All</span>
            </button> */}
            <button
              onClick={() => setAttendanceFilter('All')}
              className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
              style={getAttendanceFieldStyle('TOTAL', { TOTAL: '#8b5cf6' }, attendanceFilter === 'All')}
            >
              Total Days: <span className="font-bold">{records.length}</span>
            </button>
            <button
              onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.PRESENT ? 'All' : ATTENDANCE_STATUS.PRESENT)}
              className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
              style={getAttendanceFieldStyle(ATTENDANCE_STATUS.PRESENT, customColors, attendanceFilter === ATTENDANCE_STATUS.PRESENT)}
            >
              Present Day: <span className="font-bold">{stats.workingDays}</span>
            </button>
            <button
              onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.ABSENT ? 'All' : ATTENDANCE_STATUS.ABSENT)}
              className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
              style={getAttendanceFieldStyle(ATTENDANCE_STATUS.ABSENT, customColors, attendanceFilter === ATTENDANCE_STATUS.ABSENT)}
            >
              Absent Day: <span className="font-bold">{stats.absents}</span>
            </button>
            <button
              onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.WEEK_OFF ? 'All' : ATTENDANCE_STATUS.WEEK_OFF)}
              className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
              style={getAttendanceFieldStyle(ATTENDANCE_STATUS.WEEK_OFF, customColors, attendanceFilter === ATTENDANCE_STATUS.WEEK_OFF)}
            >
              Week Off: <span className="font-bold">{stats.weekOffs}</span>
            </button>
            <button
              onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.MISSPUNCH ? 'All' : ATTENDANCE_STATUS.MISSPUNCH)}
              className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
              style={getAttendanceFieldStyle(ATTENDANCE_STATUS.MISSPUNCH, customColors, attendanceFilter === ATTENDANCE_STATUS.MISSPUNCH)}
            >
              Missed Punch: <span className="font-bold">{stats.missedPunch}</span>
            </button>
            <button
              onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY ? 'All' : ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY)}
              className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
              style={getAttendanceFieldStyle(ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY, customColors, attendanceFilter === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY)}
            >
              POH: <span className="font-bold">{stats.presentOnHoliday}</span>
            </button>
            <button
              onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.LATE ? 'All' : ATTENDANCE_STATUS.LATE)}
              className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
              style={getAttendanceFieldStyle(ATTENDANCE_STATUS.LATE, customColors, attendanceFilter === ATTENDANCE_STATUS.LATE)}
            >
              Late: <span className="font-bold">{stats.late}</span>
            </button>
            <button
              onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.LEAVE ? 'All' : ATTENDANCE_STATUS.LEAVE)}
              className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
              style={getAttendanceFieldStyle(ATTENDANCE_STATUS.LEAVE, customColors, attendanceFilter === ATTENDANCE_STATUS.LEAVE)}
            >
              Leave: <span className="font-bold">{stats.leave}</span>
            </button>
          </div>
        </div>

        {/* Content Section with Internal Scrollbar */}
        <div className="flex-1 min-h-0 overflow-hidden p-6 pt-0 flex flex-col">
          <div className="w-full flex-1 min-h-0 flex flex-col h-full mt-4">
            <AttendanceTable
              data={records.filter((item: any) => {
                const status = item.status || '-';
                if (attendanceFilter === 'All') return true;
                if (attendanceFilter === ATTENDANCE_STATUS.PRESENT) return [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.HALF_DAY, ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY, ATTENDANCE_STATUS.IN, ATTENDANCE_STATUS.PRESENT_MISSPUNCH].includes(status);
                if (attendanceFilter === ATTENDANCE_STATUS.ABSENT) return status === ATTENDANCE_STATUS.ABSENT;
                if (attendanceFilter === ATTENDANCE_STATUS.LEAVE) return [ATTENDANCE_STATUS.LEAVE, ATTENDANCE_STATUS.EARNED_LEAVE, ATTENDANCE_STATUS.HALF_DAY_EARNED_LEAVE].includes(status);
                if (attendanceFilter === ATTENDANCE_STATUS.LATE) return isRecordLate(item.checkIn);
                if (attendanceFilter === ATTENDANCE_STATUS.MISSPUNCH) return status === ATTENDANCE_STATUS.MISSPUNCH;
                if (attendanceFilter === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY) return status === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY;
                if (attendanceFilter === ATTENDANCE_STATUS.WEEK_OFF) return status === ATTENDANCE_STATUS.WEEK_OFF;
                if (attendanceFilter === ATTENDANCE_STATUS.PRESENT_MISSPUNCH) return status === ATTENDANCE_STATUS.PRESENT_MISSPUNCH;
                if (attendanceFilter === ATTENDANCE_STATUS.HALF_DAY) return status === ATTENDANCE_STATUS.HALF_DAY;
                return true;
              })}
              columns={[
                { key: 'date', label: masterConfig?.employeeAttendance?.columns?.date?.label || 'Date', render: (record) => <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{record.date ? format(new Date(record.date), 'dd MMM yyyy') : '-'}</span> },
                { key: 'day', label: masterConfig?.employeeAttendance?.columns?.dayOfWeek?.label || 'Day', render: (record) => <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{record.dayOfWeek || '-'}</span> },
                { key: 'checkIn', label: masterConfig?.employeeAttendance?.columns?.checkIn?.label || 'In', render: (record) => <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{record.checkIn || '-'}</span> },
                { key: 'checkOut', label: masterConfig?.employeeAttendance?.columns?.checkOut?.label || 'Out', render: (record) => <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{record.checkOut || '-'}</span> },
                // { key: 'reqHours', label: 'Req. Hrs', render: (record) => <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{record.requiredWorkingHours}</span> },
                { key: 'totalHours', label: masterConfig?.employeeAttendance?.columns?.totalHours?.label || 'Working Hrs', render: (record) => <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{record.totalHours}</span> },
                // { key: 'workStatus', label: 'Work Status', render: (record) => <span className={`text-sm font-bold ${record.workingHoursStatus === 'Completed' ? 'text-emerald-600 dark:text-emerald-400' : record.workingHoursStatus === 'Incomplete' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>{record.workingHoursStatus}</span> },
                { key: 'overTime', label: 'Over Time', render: (record) => <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{record.overTime}</span> },
                {
                  key: 'status', label: masterConfig?.employeeAttendance?.columns?.status?.label || 'Status', render: (record) => {
                    const activeColor = customColors[record.status] || DEFAULT_ATTENDANCE_COLORS[record.status] || '#cbd5e1';
                    return <span style={{ color: activeColor }} className="text-sm font-bold">{ATTENDANCE_STATUS_MAP[record.status] || record.status}</span>;
                  }
                },
              ]}
              pagination={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAttendance;
