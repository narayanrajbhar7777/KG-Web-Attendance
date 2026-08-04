import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format, startOfMonth, getDaysInMonth, isSameMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { fetchEmployeePunchData, fetchEmployeePolicies, fetchDeptMgrCutoff, fetchManagerCutoff, fetchWorkerCutoff } from '../../api';
import { ATTENDANCE_STATUS, ATTENDANCE_STATUS_MAP, DEFAULT_ATTENDANCE_COLORS, DEFAULT_IN_TIME, DEFAULT_OUT_TIME } from '../../constants';
import { useAppData } from '../../context/AppContext';
import { X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Loader from '../../components/Loader';
import { AttendanceTable } from '../../components/AttendanceTable';
import { calculateAdvancedAttendance } from '../../utils/attendanceUtils';

const MyAttendance: React.FC = () => {
  const { user } = useAuth();
  const { customColors, masterConfig, cutoffSettings, attendanceGlobalRules } = useAppData();
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

      const payload = { e_comp: user.code, manager_code: user.manager_code };

      try {
        if (cutoffSettings.cutoff_worker === 'Y') {
          const workerData = await fetchWorkerCutoff({ e_comp: user.code, worker_code: user.code });
          if (workerData && workerData.length > 0) workerCutoffData = workerData[0];
        }
        if (cutoffSettings.cutoff_manager === 'Y' || cutoffSettings.cutoff_worker === 'Y') {
          const mgrData = await fetchManagerCutoff(payload);
          if (mgrData && mgrData.length > 0) managerCutoffData = mgrData[0];
        }
        if (!workerCutoffData && !managerCutoffData && (cutoffSettings.cutoff_auto === 'Y')) {
          const autoData = await fetchDeptMgrCutoff(payload);
          // Auto cutoff can fallback as managerCutoffData if needed, 
          // but typically Auto goes to DeptMgr. We can map it as manager for now.
          if (autoData && autoData.length > 0) managerCutoffData = autoData[0];
        }
      } catch (err) {
        console.error("Error fetching dynamic cutoff", err);
      }



      const [pInH, pInM] = myPolicy.inTime.split(':').map(Number);
      const [pOutH, pOutM] = myPolicy.outTime.split(':').map(Number);
      let standardShiftMs = (pOutH * 60 + pOutM) * 60000 - (pInH * 60 + pInM) * 60000;
      if (standardShiftMs < 0) standardShiftMs += 24 * 60 * 60 * 1000;
      let totalWorkingDays = 0;
      let totalWorkingMs = 0;
      let totalOvertimeMs = 0;
      let totalAbsents = 0;
      let totalWeekOffs = 0;

      const parsedRecords = punchData
        .filter((p: any) => {
          const dateStr = p.logindate ? p.logindate.split(' ')[0] : '';
          const recordDate = new Date(dateStr);
          const isUserRecord = p.emp_id === user.code || String(p.emp_id) === String(user.code);
          return isUserRecord && recordDate <= new Date() && isSameMonth(recordDate, currentDate);
        })
        .map((p: any) => {
          const date = p.logindate ? p.logindate.split(' ')[0] : '';
          const checkIn = p.intime ? p.intime.split(' ')[1]?.substring(0, 5) : '';
          const checkOut = p.outtime ? p.outtime.split(' ')[1]?.substring(0, 5) : '';

          const advanced = calculateAdvancedAttendance(p.status, checkIn, checkOut, date, workerCutoffData, attendanceGlobalRules, managerCutoffData);
          const status = advanced.attendanceStatus;

          const totalHours = advanced.completedWorkingHours;
          const overTime = '-'; // OT logic might need to be adjusted or kept simple
          
          let diffMs = 0;
          if (advanced.workingMins) {
            diffMs = advanced.workingMins * 60 * 1000;
            // Overtime logic if working hours exceeded required
            // const reqMins = parseInt(advanced.requiredWorkingHours) * 60; 
          }

          const dateObj = new Date(date);
          const dayOfWeek = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });

          return { 
            date, 
            dayOfWeek, 
            status, 
            checkIn, 
            checkOut, 
            totalHours, 
            overTime, 
            diffMs,
            requiredWorkingHours: advanced.requiredWorkingHours,
            completedWorkingHours: advanced.completedWorkingHours,
            workingHoursStatus: advanced.workingHoursStatus
          };
        }).map((r: any) => {
          let finalStatus = r.status;

          if ([ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.PRESENT_MISSPUNCH, ATTENDANCE_STATUS.HALF_DAY, ATTENDANCE_STATUS.MISSPUNCH, ATTENDANCE_STATUS.IN].includes(finalStatus)) {
            totalWorkingDays += 1;
            totalWorkingMs += r.diffMs;
          } else if (finalStatus === ATTENDANCE_STATUS.ABSENT) {
            totalAbsents += 1;
          } else if (finalStatus === ATTENDANCE_STATUS.WEEK_OFF) {
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

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col relative">
      {loading && (
        <div className="absolute inset-0 z-50 bg-white/80 dark:bg-[#0b1120]/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
          <Loader />
        </div>
      )}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">

        {/* Fixed Header Section */}
        <div className="bg-white dark:bg-[#1e293b] p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">My Attendance Details</h3>
            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
              <div className="min-w-[150px] text-center bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Present Day: <span className="font-bold text-blue-600 dark:text-blue-400">{stats.workingDays}</span>
              </div>
              <div className="min-w-[150px] text-center bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Absent Day: <span className="font-bold text-rose-600 dark:text-rose-400">{stats.absents}</span>
              </div>
              <div className="min-w-[150px] text-center bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Working Hr: <span className="font-bold text-blue-600 dark:text-blue-400">{stats.workingHours}</span>
              </div>
              <div className="min-w-[150px] text-center bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Over Time: <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.overtimeHours}</span>
              </div>
              <div className="min-w-[150px] text-center bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                Week Off: <span className="font-bold text-amber-600 dark:text-amber-400">{stats.weekOffs}</span>
              </div>
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
                { key: 'reqHours', label: 'Req. Hrs', render: (record) => <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{record.requiredWorkingHours}</span> },
                { key: 'totalHours', label: masterConfig?.employeeAttendance?.columns?.totalHours?.label || 'Working Hrs', render: (record) => <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{record.totalHours}</span> },
                { key: 'workStatus', label: 'Work Status', render: (record) => <span className={`text-sm font-bold ${record.workingHoursStatus === 'Completed' ? 'text-emerald-600 dark:text-emerald-400' : record.workingHoursStatus === 'Incomplete' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>{record.workingHoursStatus}</span> },
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
