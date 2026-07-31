import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import { Users, UserX, CalendarOff, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { addDays, format, subDays } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Loader from '../../components/Loader';
import { fetchEmployeePunchData } from '../../api';
import { AttendanceTable, type ColumnDef } from '../../components/AttendanceTable';
import { calculateTime, getFullStatus, normalizeAttendanceStatus, getAttendanceFieldStyle } from '../../utils/attendanceUtils';
import { ATTENDANCE_STATUS, ATTENDANCE_STATUS_MAP, ATTENDANCE_SUMMARY_FILTERS, DEFAULT_ATTENDANCE_COLORS } from '../../constants';

const AttendanceSummary: React.FC = () => {
  const { customColors } = useAppData();
  const { user } = useAuth();

  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [attendanceFilter, setAttendanceFilter] = useState<string>('All');

  const fetchSummaryData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const todayStr = format(currentDate, 'dd-MMM-yyyy');
      const todayYMD = format(currentDate, 'yyyy-MM-dd');

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

      const punchRes = await fetchEmployeePunchData(user.id, todayStr, todayStr);
      const punchData = punchRes?.EMP_PUNCH_DATA || [];

      const attendance = allEmployees.map((emp: any) => {
        const empRecords = punchData
          .filter((p: any) => p.emp_id === emp.code || String(p.emp_id) === String(emp.code))
          .map((p: any) => {
            const date = p.logindate ? p.logindate.split(' ')[0] : '';
            const checkIn = p.intime ? p.intime.split(' ')[1]?.substring(0, 5) : '';
            const checkOut = p.outtime ? p.outtime.split(' ')[1]?.substring(0, 5) : '';
            const status = normalizeAttendanceStatus(p.status, checkIn, checkOut, date);
            return { date, status, checkIn, checkOut };
          });

        return { employeeId: emp.id, records: empRecords };
      });

      setSummaryData({
        employees: allEmployees,
        attendance: attendance,
        date: todayYMD
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, [user, currentDate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[70vh]"><Loader /></div>;
  }

  const { employees, attendance, date: todayStr } = summaryData;

  let present = 0;
  let absent = 0;
  let onLeave = 0;
  let late = 0;

  attendance.forEach((emp: any) => {
    const todayRecord = emp.records.find((r: any) => r.date === todayStr);
    if (todayRecord) {
      if (todayRecord.status === ATTENDANCE_STATUS.PRESENT || todayRecord.status === ATTENDANCE_STATUS.HALF_DAY || todayRecord.status === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY || todayRecord.status === ATTENDANCE_STATUS.IN) present++;
      if (todayRecord.status === ATTENDANCE_STATUS.ABSENT) absent++;
      if (todayRecord.status === ATTENDANCE_STATUS.LEAVE || todayRecord.status === ATTENDANCE_STATUS.EARNED_LEAVE || todayRecord.status === ATTENDANCE_STATUS.HALF_DAY_EARNED_LEAVE) onLeave++;

      if (todayRecord.checkIn) {
        const match = todayRecord.checkIn.match(/(\d+):(\d+)/);
        if (match) {
          let h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          if (todayRecord.checkIn.toLowerCase().includes('pm') && h < 12) h += 12;
          if (todayRecord.checkIn.toLowerCase().includes('am') && h === 12) h = 0;

          if (h > 9 || (h === 9 && m > 0)) {
            late++;
          }
        }
      }
    }
  });

  const todayRecords = employees.map((emp: any) => {
    const empAtt = attendance.find((a: any) => a.employeeId === emp.id);
    const record = empAtt?.records.find((r: any) => r.date === todayStr);
    return { emp, record };
  });

  todayRecords.sort((a: any, b: any) => (a.emp.name || '').localeCompare(b.emp.name || ''));

  const columns: ColumnDef<any>[] = [
    { key: 'code', label: 'Code', render: (item) => <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{item.emp.code}</span> },
    { key: 'name', label: 'Name', render: (item) => <span className="font-medium text-slate-500 dark:text-slate-400 text-[11px] uppercase whitespace-nowrap">{item.emp.name}</span> },
    { key: 'date', label: 'Date', render: () => <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{format(new Date(todayStr), 'dd MMM yyyy')}</span> },
    { key: 'day', label: 'Day', render: () => <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{format(new Date(todayStr), 'EEEE')}</span> },
    { key: 'checkIn', label: 'In', render: (item) => <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">{item.record?.checkIn || <span className="text-slate-400 dark:text-slate-600">-</span>}</span> },
    { key: 'checkOut', label: 'Out', render: (item) => <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">{item.record?.checkOut || <span className="text-slate-400 dark:text-slate-600">-</span>}</span> },
    {
      key: 'duration', label: 'Working Hr', render: (item) => {
        const { total } = calculateTime(item.record?.checkIn, item.record?.checkOut);
        return <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{total}</span>
      }
    },
    {
      key: 'status', label: 'Status', render: (item) => {
        const status = item.record?.status || '-';
        return (
          <span
            className="text-[13px] font-bold"
            title={item.record ? getFullStatus(item.record.status) : 'No Data'}
            style={{ color: item.record ? customColors[item.record.status] || DEFAULT_ATTENDANCE_COLORS[item.record.status] : undefined }}
          >
            {status}
          </span>
        );
      }
    },
  ];

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 flex items-center gap-4 transition-colors duration-200">
          <div className="bg-green-100 dark:bg-green-500/20 p-4 rounded-full text-green-600 dark:text-green-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today's Check In</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{present}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 flex items-center gap-4 transition-colors duration-200">
          <div className="bg-red-100 dark:bg-red-500/20 p-4 rounded-full text-red-600 dark:text-red-400">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today's Absent</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{absent}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 flex items-center gap-4 transition-colors duration-200">
          <div className="bg-purple-100 dark:bg-purple-500/20 p-4 rounded-full text-purple-600 dark:text-purple-400">
            <CalendarOff className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today's On Leave</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{onLeave}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 flex items-center gap-4 transition-colors duration-200">
          <div className="bg-amber-100 dark:bg-amber-500/20 p-4 rounded-full text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today's Late</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{late}</p>
          </div>
        </div>
      </div>

      {/* Employee Details / Recent Logins Table */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
        <div className="flex-1 min-h-0 flex flex-col">
          <AttendanceTable
            className="border-0 shadow-none rounded-none"
            data={todayRecords.filter((item: any) => {
              const status = item.record?.status || '-';
              if (attendanceFilter === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.ALL])) return true;
              if (attendanceFilter === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.PRESENT])) return [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.HALF_DAY, ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY, ATTENDANCE_STATUS.IN, ATTENDANCE_STATUS.PRESENT_MISSPUNCH].includes(status);
              if (attendanceFilter === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.ABSENT])) return status === ATTENDANCE_STATUS.ABSENT;
              if (attendanceFilter === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.LEAVE])) return [ATTENDANCE_STATUS.LEAVE, ATTENDANCE_STATUS.EARNED_LEAVE, ATTENDANCE_STATUS.HALF_DAY_EARNED_LEAVE].includes(status);
              if (attendanceFilter === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.IN])) return status === ATTENDANCE_STATUS.IN;
              if (attendanceFilter === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.OUT])) return item.record?.checkOut && item.record?.checkOut !== '-';
              if (attendanceFilter === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.LATE])) return status === ATTENDANCE_STATUS.LATE;
              if (attendanceFilter === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.MISSPUNCH])) return status === ATTENDANCE_STATUS.MISSPUNCH;
              if (attendanceFilter === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY])) return status === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY;
              if (attendanceFilter === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.WEEK_OFF])) return status === ATTENDANCE_STATUS.WEEK_OFF;
              if (attendanceFilter === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.PRESENT_MISSPUNCH])) return status === ATTENDANCE_STATUS.PRESENT_MISSPUNCH;
              if (attendanceFilter === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.HALF_DAY])) return status === ATTENDANCE_STATUS.HALF_DAY;
              return true;
            })}
            columns={columns}
            searchable={true}
            searchPlaceholder="Search Employee..."
            customTopLeft={
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[17px] font-bold text-slate-800 dark:text-white">Employee Logins Details</h3>
                  <div className="relative z-50">
                    <DatePicker
                      selected={currentDate}
                      onChange={(date) => { if (date) setCurrentDate(date); }}
                      maxDate={new Date()}
                      dateFormat="dd MMM yyyy"
                      className="px-3 h-[36px] bg-slate-100 hover:bg-slate-200 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] font-semibold focus:ring-2 focus:ring-blue-500 outline-none dark:text-white dark:[color-scheme:dark] w-[130px] text-slate-700 cursor-pointer text-center transition-colors"
                    />
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold overflow-x-auto custom-scrollbar pb-1 max-w-[800px]">
                  {ATTENDANCE_SUMMARY_FILTERS.map(tab => {
                    const isActive = attendanceFilter === tab.id;
                    const fieldStyle = getAttendanceFieldStyle(tab.code, customColors, isActive);
                    const count = todayRecords.filter((item: any) => {
                      const status = item.record?.status || '-';
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.ALL])) return true;
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.PRESENT])) return [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.HALF_DAY, ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY, ATTENDANCE_STATUS.IN, ATTENDANCE_STATUS.PRESENT_MISSPUNCH].includes(status);
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.PRESENT])) return [ATTENDANCE_STATUS.PRESENT, ATTENDANCE_STATUS.HALF_DAY, ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY, ATTENDANCE_STATUS.IN, ATTENDANCE_STATUS.PRESENT_MISSPUNCH].includes(status);
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.ABSENT])) return status === ATTENDANCE_STATUS.ABSENT;
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.LEAVE])) return [ATTENDANCE_STATUS.LEAVE, ATTENDANCE_STATUS.EARNED_LEAVE, ATTENDANCE_STATUS.HALF_DAY_EARNED_LEAVE].includes(status);
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.IN])) return status === ATTENDANCE_STATUS.IN;
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.OUT])) return item.record?.checkOut && item.record?.checkOut !== '-';
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.LATE])) return status === ATTENDANCE_STATUS.LATE;
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.MISSPUNCH])) return status === ATTENDANCE_STATUS.MISSPUNCH;
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY])) return status === ATTENDANCE_STATUS.PRESENT_ON_HOLIDAY;
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.WEEK_OFF])) return status === ATTENDANCE_STATUS.WEEK_OFF;
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.PRESENT_MISSPUNCH])) return status === ATTENDANCE_STATUS.PRESENT_MISSPUNCH;
                      if (tab.id === (ATTENDANCE_STATUS_MAP[ATTENDANCE_STATUS.HALF_DAY])) return status === ATTENDANCE_STATUS.HALF_DAY;
                      return false;
                    }).length;

                    return (
                      <button
                        key={tab.id}
                        title={tab.id}
                        onClick={() => setAttendanceFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap hover:opacity-80 min-w-[62px] flex items-center justify-center`}
                        style={fieldStyle}
                      >
                        {tab.label}: {count}
                      </button>
                    )
                  })}
                </div>
              </div>
            }
            searchFn={(item, query) =>
              (item.emp.name || '').toLowerCase().includes(query.toLowerCase()) ||
              (item.emp.code || '').toLowerCase().includes(query.toLowerCase())
            }
            itemsPerPage={30}
          />
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummary;