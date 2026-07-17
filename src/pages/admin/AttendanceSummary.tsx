import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import { Users, UserX, CalendarOff, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { addDays, format, subDays } from 'date-fns';
import { fetchEmployeePunchDataExternal, fetchEmployeeDetailsExternal } from '../../api';
import { AttendanceTable, type ColumnDef } from '../../components/AttendanceTable';
import { calculateTime, getFullStatus, getStatusColor, normalizeAttendanceStatus } from '../../utils/attendanceUtils';

const AttendanceSummary: React.FC = () => {
  const { customColors } = useAppData();
  const { user } = useAuth();

  const [summaryData, setSummaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  const fetchSummaryData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const todayStr = format(currentDate, 'dd-MMM-yyyy');
      const todayYMD = format(currentDate, 'yyyy-MM-dd');

      let allEmployees = employeesList;

      if (allEmployees.length === 0) {
        const empDetRes = await fetchEmployeeDetailsExternal(user.id);
        const empList = empDetRes?.EMP_DATA || [];
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

      const punchRes = await fetchEmployeePunchDataExternal(user.id, todayStr, todayStr);
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

  if (!summaryData) {
    return <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const { employees, attendance, date: todayStr } = summaryData;

  let present = 0;
  let absent = 0;
  let onLeave = 0;
  let late = 0;

  attendance.forEach((emp: any) => {
    const todayRecord = emp.records.find((r: any) => r.date === todayStr);
    if (todayRecord) {
      if (todayRecord.status === 'P' || todayRecord.status === 'HD' || todayRecord.status === 'PH' || todayRecord.status === 'In') present++;
      if (todayRecord.status === 'A') absent++;
      if (todayRecord.status === 'L' || todayRecord.status === 'EL' || todayRecord.status === 'HDEL') onLeave++;

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
            className={`text-[13px] ${getStatusColor(status)}`}
            title={item.record ? getFullStatus(item.record.status) : 'No Data'}
            style={item.record && customColors[item.record.status] ? { color: customColors[item.record.status] } : {}}
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
            data={todayRecords}
            columns={columns}
            searchable={true}
            searchPlaceholder="Search Employee..."
            customTopLeft={
              <div className="flex items-center gap-4">
                <h3 className="text-[17px] font-bold text-slate-800 dark:text-white">Employee Logins Details</h3>
                <div className="flex items-center gap-1 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-sm">
                  <button
                    onClick={() => setCurrentDate(prev => subDays(prev, 1))}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-600 dark:text-slate-400"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold px-2 text-slate-700 dark:text-slate-300">
                    {format(currentDate, 'dd MMM yyyy')}
                  </span>
                  <button
                    onClick={() => setCurrentDate(prev => addDays(prev, 1))}
                    disabled={format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
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
