import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import { Users, UserX, CalendarOff, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { addDays, format, subDays } from 'date-fns';
import Loader from '../../components/Loader';
import { fetchEmployeeDataExternal } from '../../api';
import { AttendanceTable, type ColumnDef } from '../../components/AttendanceTable';
import { calculateTime, getFullStatus, getStatusColor, normalizeAttendanceStatus } from '../../utils/attendanceUtils';

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

      const punchRes = await fetchEmployeeDataExternal(user.id, todayStr, todayStr);
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
            data={todayRecords.filter((item: any) => {
              const status = item.record?.status || '-';
              if (attendanceFilter === 'All') return true;
              if (attendanceFilter === 'Present') return ['P', 'HD', 'PH', 'In', 'P/MP'].includes(status);
              if (attendanceFilter === 'Absent') return status === 'A';
              if (attendanceFilter === 'Leave') return ['L', 'EL', 'HDEL'].includes(status);
              if (attendanceFilter === 'In') return status === 'In';
              if (attendanceFilter === 'Out') return item.record?.checkOut && item.record?.checkOut !== '-';
              if (attendanceFilter === 'Late') return status === 'Late' || status === 'LATE';
              if (attendanceFilter === 'Misspunch') return status === 'MP';
              if (attendanceFilter === 'Present On Holiday') return status === 'PH';
              if (attendanceFilter === 'Week Off') return status === 'WO';
              if (attendanceFilter === 'Present/ Misspunch') return status === 'P/MP';
              if (attendanceFilter === 'Half Day') return status === 'HD';
              return true;
            })}
            columns={columns}
            searchable={true}
            searchPlaceholder="Search Employee..."
            customTopLeft={
              <div className="flex items-center gap-6">
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
                <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold overflow-x-auto custom-scrollbar pb-1 max-w-[800px]">
                  {[
                    { id: 'All', label: 'All', activeColor: 'bg-slate-200 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white', defaultColor: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50' },
                    { id: 'Present', label: 'P', activeColor: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300', defaultColor: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' },
                    { id: 'Absent', label: 'A', activeColor: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300', defaultColor: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' },
                    { id: 'In', label: 'I', activeColor: 'bg-green-100 dark:bg-green-500/40 border-green-100 dark:border-green-700 text-green-700 dark:text-green-300', defaultColor: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20' },
                    { id: 'Out', label: 'O', activeColor: 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white', defaultColor: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50' },
                    { id: 'Misspunch', label: 'MP', activeColor: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300', defaultColor: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' },
                    { id: 'Late', label: 'La', activeColor: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300', defaultColor: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20' },
                    { id: 'Leave', label: 'Le', activeColor: 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300', defaultColor: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20' },
                    { id: 'Present On Holiday', label: 'POH', activeColor: 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300', defaultColor: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20' },
                    { id: 'Week Off', label: 'WO', activeColor: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300', defaultColor: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20' },
                    { id: 'Present/ Misspunch', label: 'P/MP', activeColor: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300', defaultColor: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20' },
                    { id: 'Half Day', label: 'HD', activeColor: 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-white', defaultColor: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50' },
                  ].map(tab => {
                    const isActive = attendanceFilter === tab.id;
                    const count = todayRecords.filter((item: any) => {
                      const status = item.record?.status || '-';
                      if (tab.id === 'All') return true;
                      if (tab.id === 'Present') return ['P', 'HD', 'PH', 'In', 'P/MP'].includes(status);
                      if (tab.id === 'Absent') return status === 'A';
                      if (tab.id === 'Leave') return ['L', 'EL', 'HDEL'].includes(status);
                      if (tab.id === 'In') return status === 'In';
                      if (tab.id === 'Out') return item.record?.checkOut && item.record?.checkOut !== '-';
                      if (tab.id === 'Late') return status === 'Late' || status === 'LATE';
                      if (tab.id === 'Misspunch') return status === 'MP';
                      if (tab.id === 'Present On Holiday') return status === 'PH';
                      if (tab.id === 'Week Off') return status === 'WO';
                      if (tab.id === 'Present/ Misspunch') return status === 'P/MP';
                      if (tab.id === 'Half Day') return status === 'HD';
                      return false;
                    }).length;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setAttendanceFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${isActive ? tab.activeColor : tab.defaultColor}`}
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
