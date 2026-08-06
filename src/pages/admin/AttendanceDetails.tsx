import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import { format, getDaysInMonth, isAfter, startOfDay, startOfMonth } from 'date-fns';
import { Search, FileSpreadsheet, FileText, Loader2, ExternalLink, X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import toast from 'react-hot-toast';
import { transformAttendanceRowsForExport, exportAttendanceToExcel, exportAttendanceToCsv, exportAttendanceToPdf } from '../../utils/exportUtils';
import Loader from '../../components/Loader';
import { fetchEmployeePunchData, fetchWorkerCutoff, fetchManagerCutoff, fetchRequests } from '../../api';
import { AttendanceTable } from '../../components/AttendanceTable';
import { calculateTime, calculateTimeNum, formatDur, getFullStatus, getStatusColor, calculateAdvancedAttendance, generateShortName, getAttendanceFieldStyle, isRecordLate } from '../../utils/attendanceUtils';
import { ATTENDANCE_STATUS, DEFAULT_ATTENDANCE_COLORS } from '../../constants';

const AttendanceDetails: React.FC = () => {
  const { customColors, attendanceGlobalRules } = useAppData();
  const { user } = useAuth();

  const [detailsData, setDetailsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailsSearch, setDetailsSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [exportingFormat, setExportingFormat] = useState<null | 'excel' | 'csv' | 'pdf'>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<string>('All');

  const fetchDetailsData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const frDate = format(startOfMonth(currentDate), 'dd-MMM-yyyy');
      const toDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), getDaysInMonth(currentDate)), 'dd-MMM-yyyy');



      let allEmployees = employeesList;

      if (allEmployees.length === 0) {
        const empList = user.employee_list || [];

        allEmployees = empList.map((e: any) => ({
          id: e.e_code,
          name: e.e_name,
          code: e.e_code,
          designation: e.e_desg
        }));

        if (!allEmployees.some((e: any) => e.code === user.code)) {
          allEmployees.unshift({
            id: user.code,
            name: user.name,
            code: user.code,
            designation: user.designation
          });
        }
        setEmployeesList(allEmployees);
      }

      const punchRes = await fetchEmployeePunchData(user.id, frDate, toDate);
      const punchData = punchRes?.EMP_PUNCH_DATA || [];
      const cutoffRes = await fetchWorkerCutoff({
        e_comp: user.company || 'FP',
        brname: '',
        manager_code: user.code
      });

      let managerCutoffData: any = undefined;
      try {
        const mgrData = await fetchManagerCutoff({
          e_comp: user.company || 'FP',
          manager_code: user.code
        });
        if (mgrData && mgrData.length > 0) managerCutoffData = mgrData[0];
      } catch (e) { console.error("Failed to fetch manager cutoff", e); }

      let allRequests: any[] = [];
      try {
        allRequests = await fetchRequests(user?.code);
      } catch (e) {
        console.error("Failed to fetch requests", e);
      }

      const attendance = allEmployees.map((emp: any) => {
        const empCutoff = cutoffRes.find((c: any) => c.worker_code === emp.code);
        const empRequests = allRequests.filter(r => r.userId === emp.id);

        const empRecords = punchData
          .filter((p: any) => p.emp_id === emp.code || String(p.emp_id) === String(emp.code))
          .map((p: any) => {
            const date = p.logindate ? p.logindate.split(' ')[0] : '';
            const checkIn = p.intime ? p.intime.split(' ')[1]?.substring(0, 5) : '';
            const checkOut = p.outtime ? p.outtime.split(' ')[1]?.substring(0, 5) : '';
            const advanced = calculateAdvancedAttendance(p.status, checkIn, checkOut, date, empCutoff, attendanceGlobalRules, managerCutoffData, empRequests);
            let status = advanced.attendanceStatus;

            return {
              date,
              status,
              checkIn,
              checkOut,
              requiredWorkingHours: advanced.requiredWorkingHours,
              completedWorkingHours: advanced.completedWorkingHours,
              workingHoursStatus: advanced.workingHoursStatus
            };
          });

        return { userId: emp.id, records: empRecords };
      });

      setDetailsData({
        employees: allEmployees,
        attendance: attendance
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailsData();
  }, [user, currentDate, attendanceGlobalRules]);

  if (!detailsData) {
    return <div className="flex items-center justify-center min-h-[70vh]"><Loader /></div>;
  }

  const { employees, attendance } = detailsData;

  const filteredEmployees = employees.filter((u: any) =>
    u.name.toLowerCase().includes(detailsSearch.toLowerCase()) ||
    u.code.toLowerCase().includes(detailsSearch.toLowerCase())
  ).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);

  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const daysInMonth = getDaysInMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = startOfDay(new Date());

  const handleExport = async (formatType: 'excel' | 'csv' | 'pdf') => {
    if (filteredEmployees.length === 0) {
      toast.error('No attendance data available to export.');
      return;
    }

    setExportingFormat(formatType);
    try {
      const exportData = transformAttendanceRowsForExport(filteredEmployees, attendance, currentDate);

      if (formatType === 'excel') {
        await exportAttendanceToExcel(exportData, currentDate, customColors);
        toast.success('Excel file downloaded successfully.');
      } else if (formatType === 'csv') {
        exportAttendanceToCsv(exportData, currentDate);
        toast.success('CSV file downloaded successfully.');
      } else if (formatType === 'pdf') {
        await exportAttendanceToPdf(exportData, currentDate, customColors);
        toast.success('PDF file downloaded successfully.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Unable to export attendance data.');
    } finally {
      setExportingFormat(null);
    }
  };

  if (selectedEmployee) {
    let totalPresent = 0, totalAbsent = 0, totalWeekOff = 0, totalWorkingMins = 0, totalOtMins = 0, totalMissedPunch = 0, totalPresentOnHoliday = 0, totalLate = 0, totalLeave = 0;

    const empAttendance = attendance.find((a: any) => a.userId === selectedEmployee.id)?.records || [];
    const pastDays = days.filter(day => !isAfter(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), today));

    pastDays.forEach(day => {
      const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = format(dateObj, 'yyyy-MM-dd');
      const record = empAttendance.find((r: any) => r.date === dateStr);
      let status = record?.status || '-';

      if (['P', 'EO', 'HD', 'In'].includes(status)) totalPresent++;
      if (status === 'A') totalAbsent++;
      if (status === 'WO') totalWeekOff++;
      if (['M', 'P/MP'].includes(status)) totalMissedPunch++;
      if (status === 'PH') totalPresentOnHoliday++;
      if (['L', 'EL', 'HDL'].includes(status)) totalLeave++;
      if (isRecordLate(record?.checkIn)) totalLate++;
      const { totalMins, otMins } = calculateTimeNum(record?.checkIn, record?.checkOut);
      totalWorkingMins += totalMins;
      totalOtMins += otMins;
    });

    return (
      <div className="h-[calc(100vh-120px)] flex flex-col animate-fade-in-up relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-50 rounded-2xl">
            <Loader />
          </div>
        )}
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden">
          <div className="bg-white dark:bg-[#1e293b] p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 flex-shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                  {selectedEmployee.name} - {selectedEmployee.code}
                </h3>
                <div className="flex gap-4">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Working Hrs: {formatDur(totalWorkingMins)}</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Over Time: {formatDur(totalOtMins)}</span>
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
                  onClick={() => setSelectedEmployee(null)}
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
                Total Days: <span className="font-bold">{pastDays.length}</span>
              </button>
              <button
                onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.PRESENT ? 'All' : ATTENDANCE_STATUS.PRESENT)}
                className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
                style={getAttendanceFieldStyle(ATTENDANCE_STATUS.PRESENT, customColors, attendanceFilter === ATTENDANCE_STATUS.PRESENT)}
              >
                Present Day: <span className="font-bold">{totalPresent}</span>
              </button>
              <button
                onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.ABSENT ? 'All' : ATTENDANCE_STATUS.ABSENT)}
                className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
                style={getAttendanceFieldStyle(ATTENDANCE_STATUS.ABSENT, customColors, attendanceFilter === ATTENDANCE_STATUS.ABSENT)}
              >
                Absent Day: <span className="font-bold">{totalAbsent}</span>
              </button>
              <button
                onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.WEEK_OFF ? 'All' : ATTENDANCE_STATUS.WEEK_OFF)}
                className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
                style={getAttendanceFieldStyle(ATTENDANCE_STATUS.WEEK_OFF, customColors, attendanceFilter === ATTENDANCE_STATUS.WEEK_OFF)}
              >
                Week Off: <span className="font-bold">{totalWeekOff}</span>
              </button>
              <button
                onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.MISSPUNCH ? 'All' : ATTENDANCE_STATUS.MISSPUNCH)}
                className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
                style={getAttendanceFieldStyle(ATTENDANCE_STATUS.MISSPUNCH, customColors, attendanceFilter === ATTENDANCE_STATUS.MISSPUNCH)}
              >
                Missed Punch: <span className="font-bold">{totalMissedPunch}</span>
              </button>
              <button
                onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY ? 'All' : ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY)}
                className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
                style={getAttendanceFieldStyle(ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY, customColors, attendanceFilter === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY)}
              >
                POH: <span className="font-bold">{totalPresentOnHoliday}</span>
              </button>
              <button
                onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.LATE ? 'All' : ATTENDANCE_STATUS.LATE)}
                className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
                style={getAttendanceFieldStyle(ATTENDANCE_STATUS.LATE, customColors, attendanceFilter === ATTENDANCE_STATUS.LATE)}
              >
                Late: <span className="font-bold">{totalLate}</span>
              </button>
              <button
                onClick={() => setAttendanceFilter(prev => prev === ATTENDANCE_STATUS.LEAVE ? 'All' : ATTENDANCE_STATUS.LEAVE)}
                className="min-w-[150px] text-center px-3 py-1.5 rounded-lg border transition-colors cursor-pointer hover:opacity-80"
                style={getAttendanceFieldStyle(ATTENDANCE_STATUS.LEAVE, customColors, attendanceFilter === ATTENDANCE_STATUS.LEAVE)}
              >
                Leave: <span className="font-bold">{totalLeave}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden p-6 pt-0 flex flex-col">
            <div className="w-full flex-1 min-h-0 flex flex-col h-full mt-4">
              <AttendanceTable
                data={pastDays.map(day => {
                  const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dateStr = format(dateObj, 'yyyy-MM-dd');
                  const record = empAttendance.find((r: any) => r.date === dateStr);
                  let status = record?.status || '-';
                  return { day, dateObj, record, status };
                }).filter((item: any) => {
                  const status = item.status;
                  if (attendanceFilter === 'All') return true;
                  if (attendanceFilter === ATTENDANCE_STATUS.PRESENT) return [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.HALF_DAY, ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY, ATTENDANCE_STATUS.IN, ATTENDANCE_STATUS.PRESENT_MISSPUNCH].includes(status);
                  if (attendanceFilter === ATTENDANCE_STATUS.ABSENT) return status === ATTENDANCE_STATUS.ABSENT;
                  if (attendanceFilter === ATTENDANCE_STATUS.LEAVE) return [ATTENDANCE_STATUS.LEAVE, ATTENDANCE_STATUS.EARNED_LEAVE, ATTENDANCE_STATUS.HALF_DAY_EARNED_LEAVE].includes(status);
                  if (attendanceFilter === ATTENDANCE_STATUS.LATE) return isRecordLate(item.record?.checkIn);
                  if (attendanceFilter === ATTENDANCE_STATUS.MISSPUNCH) return status === ATTENDANCE_STATUS.MISSPUNCH;
                  if (attendanceFilter === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY) return status === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY;
                  if (attendanceFilter === ATTENDANCE_STATUS.WEEK_OFF) return status === ATTENDANCE_STATUS.WEEK_OFF;
                  if (attendanceFilter === ATTENDANCE_STATUS.PRESENT_MISSPUNCH) return status === ATTENDANCE_STATUS.PRESENT_MISSPUNCH;
                  if (attendanceFilter === ATTENDANCE_STATUS.HALF_DAY) return status === ATTENDANCE_STATUS.HALF_DAY;
                  return true;
                })}
                columns={[
                  { key: 'date', label: 'Date', render: (item) => <span className="font-medium text-slate-700 dark:text-slate-300 text-[13px]">{format(item.dateObj, 'dd MMM yyyy')}</span> },
                  { key: 'day', label: 'Day', render: (item) => <span className="text-slate-500 dark:text-slate-400 text-[13px]">{format(item.dateObj, 'EEE')}</span> },
                  { key: 'in', label: 'In', render: (item) => <span className="font-mono text-slate-600 dark:text-slate-300 text-[13px]">{item.record?.checkIn || '-'}</span> },
                  { key: 'out', label: 'Out', render: (item) => <span className="font-mono text-slate-600 dark:text-slate-300 text-[13px]">{item.record?.checkOut || '-'}</span> },
                  // { key: 'reqHours', label: 'Req. Hrs', render: (item) => <span className="font-medium text-slate-800 dark:text-slate-200 text-[13px]">{item.record?.requiredWorkingHours || '-'}</span> },
                  {
                    key: 'workingHr', label: 'Working Hr', render: (item) => {
                      return <span className="font-medium text-slate-800 dark:text-slate-200 text-[13px]">{item.record?.completedWorkingHours || '-'}</span>
                    }
                  },
                  // { key: 'workStatus', label: 'Work Status', render: (item) => <span className={`font-bold text-[13px] ${item.record?.workingHoursStatus === 'Completed' ? 'text-emerald-600 dark:text-emerald-400' : item.record?.workingHoursStatus === 'Incomplete' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>{item.record?.workingHoursStatus || '-'}</span> },
                  {
                    key: 'overtime', label: ' Over Time', render: (item) => {
                      const { overtime } = calculateTime(item.record?.checkIn, item.record?.checkOut);
                      return <span className="font-medium text-emerald-600 dark:text-emerald-400 text-[13px]">
                        {overtime !== '-' ? overtime.replace('h', 'h ').replace(ATTENDANCE_STATUS.MISSPUNCH, ATTENDANCE_STATUS.MISSPUNCH) : '-'}
                      </span>
                    }
                  },
                  {
                    key: 'status', label: 'Status', render: (item) => {
                      const customColor = customColors[item.status] || DEFAULT_ATTENDANCE_COLORS[item.status];
                      return <span
                        className="text-[13px] font-bold"
                        style={customColor ? { color: customColor } : {}}
                      >
                        {getFullStatus(item.status)}
                      </span>
                    }
                  }
                ]}
                pagination={false}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative">
      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center z-50 rounded-xl">
          <Loader />
        </div>
      )}
      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col h-[calc(100vh-112px)] overflow-hidden transition-colors duration-200">
        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0 transition-colors">
          <div className="relative z-50"> <h2 className="text-xl font-bold text-slate-800 dark:text-white hidden md:block">Tracker</h2></div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              <button
                onClick={() => handleExport('excel')}
                disabled={exportingFormat !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-500/10 dark:hover:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-800/50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export to Excel"
              >
                {exportingFormat === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                <span className="hidden sm:inline">{exportingFormat === 'excel' ? 'Exporting...' : 'Excel'}</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={exportingFormat !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export to CSV"
              >
                {exportingFormat === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span className="hidden sm:inline">{exportingFormat === 'csv' ? 'Exporting...' : 'CSV'}</span>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={exportingFormat !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export to PDF"
              >
                {exportingFormat === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span className="hidden sm:inline">{exportingFormat === 'pdf' ? 'Exporting...' : 'PDF'}</span>
              </button>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Employee..."
                value={detailsSearch}
                onChange={(e) => {
                  setDetailsSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all placeholder:text-slate-400"
              />
            </div>
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
        <div className="overflow-auto flex-1 w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-[#f9fbfc] dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-colors">
                <th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap sticky top-0 left-0 bg-[#f9fbfc] dark:bg-slate-900 z-30 shadow-[1px_1px_0_#e2e8f0] dark:shadow-[1px_1px_0_#334155]">Code</th>
                <th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap sticky top-0 left-[80px] bg-[#f9fbfc] dark:bg-slate-900 z-30 shadow-[1px_1px_0_#e2e8f0] dark:shadow-[1px_1px_0_#334155]">Name</th>
                {days.map(day => (
                  <th key={day} className="py-3 px-2 border-b border-slate-200 dark:border-slate-700 text-center min-w-[32px] sticky top-0 bg-[#f9fbfc] dark:bg-slate-900 z-20 shadow-[0_1px_0_#e2e8f0] dark:shadow-[0_1px_0_#334155]">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedEmployees.map((emp: any) => {
                const empAttendance = attendance.find((a: any) => a.userId === emp.id)?.records || [];

                return (
                  <tr key={emp.id} onDoubleClick={() => setSelectedEmployee(emp)} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors text-[11px] cursor-pointer">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800 shadow-[1px_0_0_#f1f5f9] dark:shadow-[1px_0_0_#334155] z-10">{emp.code}</td>
                    <td className="py-2 px-4 font-medium text-slate-500 dark:text-slate-400 sticky left-[80px] bg-white dark:bg-slate-800 shadow-[1px_0_0_#f1f5f9] dark:shadow-[1px_0_0_#334155] z-10">
                      <div className="flex items-center justify-between gap-2">
                        <span>{generateShortName(emp.name)}</span>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-400 hover:text-blue-500 transition-colors" title="View Details"><ExternalLink className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                    {days.map(day => {
                      const dateStr = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), 'yyyy-MM-dd');
                      const currentIterDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const isFuture = isAfter(currentIterDate, today);
                      let status = '-';
                      if (!isFuture) {
                        const record = empAttendance.find((r: any) => r.date === dateStr);
                        status = record?.status || '-';
                      }
                      const customColor = customColors[status] || DEFAULT_ATTENDANCE_COLORS[status];
                      return (
                        <td key={day} className={`py-3 px-1 text-center ${isFuture ? 'text-slate-300' : (customColor ? 'font-bold' : getStatusColor(status))}`} style={(!isFuture && customColor) ? { color: customColor } : {}}>{isFuture ? '' : status}</td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 bg-[#f9fbfc] dark:bg-slate-900/80 shrink-0 transition-colors">
          <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, employees.length)} of {employees.length} entries</span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="w-7 h-7 flex items-center justify-center border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &lt;
            </button>
            <span className="px-3 text-slate-600 dark:text-slate-300 font-bold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="w-7 h-7 flex items-center justify-center border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetails;
