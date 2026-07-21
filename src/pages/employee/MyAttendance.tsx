import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, getDaysInMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { fetchEmployeePunchDataExternal, fetchEmployeeRequests, fetchEmployeePolicies } from '../../api';
import { ATTENDANCE_STATUS_MAP, DEFAULT_ATTENDANCE_COLORS } from '../../constants';
import { useAppData } from '../../context/AppContext';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AttendanceTable } from '../../components/AttendanceTable';
import { calculateTime, calculateTimeNum, normalizeAttendanceStatus } from '../../utils/attendanceUtils';

const MyAttendance: React.FC = () => {
  const { user } = useAuth();
  const { customColors, masterConfig } = useAppData();
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState({
    workingDays: 0,
    workingHours: '0h 0m',
    overtimeHours: '0h 0m',
    absents: 0,
    weekOffs: 0
  });

  const [cachedRequests, setCachedRequests] = useState<any[] | null>(null);
  const [cachedPolicy, setCachedPolicy] = useState<any>(null);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      let empRequests = cachedRequests;
      if (!empRequests) {
        const requestsData = await fetchEmployeeRequests(user.id);
        empRequests = requestsData?.requests || [];
        setCachedRequests(empRequests);
      }

      const frDate = format(startOfMonth(currentDate), 'dd-MMM-yyyy');
      const toDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), getDaysInMonth(currentDate)), 'dd-MMM-yyyy');

      const extData = await fetchEmployeePunchDataExternal(user.id, frDate, toDate);
      const punchData = extData?.EMP_PUNCH_DATA || [];

      let myPolicy = cachedPolicy;
      if (!myPolicy) {
        const policies = await fetchEmployeePolicies();
        myPolicy = policies.find((p: any) => p.employeeId === user.id) || { inTime: '09:00', outTime: '18:00', weekOffs: [0] };
        setCachedPolicy(myPolicy);
      }

      const [pInH, pInM] = myPolicy.inTime.split(':').map(Number);
      const [pOutH, pOutM] = myPolicy.outTime.split(':').map(Number);
      let standardShiftMs = (pOutH * 60 + pOutM) * 60000 - (pInH * 60 + pInM) * 60000;
      if (standardShiftMs < 0) standardShiftMs += 24 * 60 * 60 * 1000; // handle overnight shifts

      let totalWorkingDays = 0;
      let totalWorkingMs = 0;
      let totalOvertimeMs = 0;
      let totalAbsents = 0;
      let totalWeekOffs = 0;

      const parsedRecords = punchData
        .filter((p: any) => {
          const dateStr = p.logindate ? p.logindate.split(' ')[0] : '';
          const isUserRecord = p.emp_id === user.code || String(p.emp_id) === String(user.code);
          return isUserRecord && new Date(dateStr) <= new Date();
        })
        .map((p: any) => {
          const date = p.logindate ? p.logindate.split(' ')[0] : '';
          const checkIn = p.intime ? p.intime.split(' ')[1]?.substring(0, 5) : '';
          const checkOut = p.outtime ? p.outtime.split(' ')[1]?.substring(0, 5) : '';

          const status = normalizeAttendanceStatus(p.status, checkIn, checkOut, date);

          const { total, overtime } = calculateTime(checkIn, checkOut);

          let diffMs = 0;
          if (checkIn && checkOut && checkIn !== '-' && checkOut !== '-') {
            const { totalMins } = calculateTimeNum(checkIn, checkOut);
            diffMs = totalMins * 60 * 1000;
            totalOvertimeMs += Math.max(0, diffMs - standardShiftMs);
          }

          const totalHours = total;
          const overTime = overtime === '-' ? '0h 0m' : overtime;

          const dateObj = new Date(date);
          const dayOfWeek = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });

          return { date, dayOfWeek, status, checkIn, checkOut, totalHours, overTime, diffMs };
        }).map((r: any) => {
          const approvedMispunch = (empRequests || []).find((req: any) => req.type === 'Misspunch' && req.date === r.date && req.status === 'Approved');
          const approvedLeave = (empRequests || []).find((req: any) => req.type === 'Leave' && req.date === r.date && req.status === 'Approved');

          let finalStatus = r.status;
          if (approvedMispunch) finalStatus = 'P/MP';
          else if (approvedLeave) finalStatus = 'L';

          if (['P', 'P/MP', 'HD', 'M', 'In'].includes(finalStatus)) {
            totalWorkingDays += 1;
            totalWorkingMs += r.diffMs;
          } else if (finalStatus === 'A') {
            totalAbsents += 1;
          } else if (finalStatus === 'WO') {
            totalWeekOffs += 1;
          }

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
        weekOffs: totalWeekOffs
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

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col relative">
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-50 rounded-2xl">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">

        {/* Fixed Header Section */}
        <div className="bg-white dark:bg-[#1e293b] p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">My Attendance Details</h3>
            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
              <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Present Day: <span className="font-bold text-blue-600 dark:text-blue-400">{stats.workingDays}</span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Absent Day: <span className="font-bold text-rose-600 dark:text-rose-400">{stats.absents}</span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Working Hr: <span className="font-bold text-blue-600 dark:text-blue-400">{stats.workingHours}</span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Over Time: <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.overtimeHours}</span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Week Off: <span className="font-bold text-amber-600 dark:text-amber-400">{stats.weekOffs}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-[#f8fafb] dark:bg-[#111827] rounded-xl p-1 shadow-inner">
              <button onClick={handlePrevMonth} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-[#1e293b] rounded-lg transition-all"><ChevronLeft className="w-5 h-5" /></button>
              <span className="font-bold text-slate-700 dark:text-slate-200 min-w-[120px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
              <button
                onClick={handleNextMonth}
                disabled={isSameMonth(currentDate, new Date())}
                className={`p-2 rounded-lg transition-all ${isSameMonth(currentDate, new Date()) ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-[#1e293b]'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => navigate('/employee')}
              className="ml-2 p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors" title="Close Report"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Section with Internal Scrollbar */}
        <div className="flex-1 min-h-0 overflow-hidden p-6 pt-0 flex flex-col">
          <div className="w-full flex-1 min-h-0 flex flex-col h-full mt-4">
            <AttendanceTable
              data={records}
              columns={[
                { key: 'date', label: masterConfig?.employeeAttendance?.columns?.date?.label || 'Date', render: (record) => <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{record.date ? format(new Date(record.date), 'dd MMM yyyy') : '-'}</span> },
                { key: 'day', label: masterConfig?.employeeAttendance?.columns?.dayOfWeek?.label || 'Day', render: (record) => <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{record.dayOfWeek || '-'}</span> },
                { key: 'checkIn', label: masterConfig?.employeeAttendance?.columns?.checkIn?.label || 'In', render: (record) => <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{record.checkIn || '-'}</span> },
                { key: 'checkOut', label: masterConfig?.employeeAttendance?.columns?.checkOut?.label || 'Out', render: (record) => <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{record.checkOut || '-'}</span> },
                { key: 'totalHours', label: masterConfig?.employeeAttendance?.columns?.totalHours?.label || 'Working Hrs', render: (record) => <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{record.totalHours}</span> },
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
