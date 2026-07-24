import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import { format, getDaysInMonth, addMonths, subMonths, isAfter, startOfDay, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Search, X, ExternalLink } from 'lucide-react';
import Loader from '../../components/Loader';
import { fetchEmployeePunchDataExternal, fetchEmployeeDetailsExternal } from '../../api';
import { AttendanceTable } from '../../components/AttendanceTable';
import { calculateTime, calculateTimeNum, formatDur, getFullStatus, getStatusColor, normalizeAttendanceStatus } from '../../utils/attendanceUtils';

const AttendanceDetails: React.FC = () => {
  const { customColors } = useAppData();
  const { user } = useAuth();

  const [detailsData, setDetailsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailsSearch, setDetailsSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  const fetchDetailsData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const frDate = format(startOfMonth(currentDate), 'dd-MMM-yyyy');
      const toDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), getDaysInMonth(currentDate)), 'dd-MMM-yyyy');



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

      const punchRes = await fetchEmployeePunchDataExternal(user.id, frDate, toDate);
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
  }, [user, currentDate]);

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

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  const daysInMonth = getDaysInMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = startOfDay(new Date());
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

  if (selectedEmployee) {
    let totalWorkingDays = 0;
    let totalPresent = 0;
    let totalWorkingMins = 0;
    let totalOtMins = 0;
    let totalAbsent = 0;
    let totalWeekOff = 0;

    const empAttendance = attendance.find((a: any) => a.userId === selectedEmployee.id)?.records || [];
    const pastDays = days.filter(day => !isAfter(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), today));

    pastDays.forEach(day => {
      const dateStr = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), 'yyyy-MM-dd');
      const record = empAttendance.find((r: any) => r.date === dateStr);
      let status = record?.status || '-';

      // console.log(`Date: ${dateStr} | Status: ${status}`);

      if (status !== 'WO' && status !== '-') totalWorkingDays++;
      if (['P', 'L', 'EO', 'HD', 'P/MP', 'PH', 'In'].includes(status)) totalPresent++;
      if (status === 'A') totalAbsent++;
      if (status === 'WO') totalWeekOff++;
      // console.log(`Date: ${dateStr} | Status: ${status}`);
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

          {/* Fixed Header Section */}
          <div className="bg-white dark:bg-[#1e293b] p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                  {selectedEmployee.name} - {selectedEmployee.code}
                </h3>
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  Present Day: <span className="font-bold text-blue-600 dark:text-blue-400">{totalPresent}</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  Absent Day: <span className="font-bold text-rose-600 dark:text-rose-400">{totalAbsent}</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  Working Hr: <span className="font-bold text-blue-600 dark:text-blue-400">{formatDur(totalWorkingMins)}</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  Over Time: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatDur(totalOtMins)}</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  Week Off: <span className="font-bold text-amber-600 dark:text-amber-400">{totalWeekOff}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 bg-[#f8fafb] dark:bg-[#111827] rounded-xl p-1 shadow-inner">
                <button onClick={handlePrevMonth} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-[#1e293b] rounded-lg transition-all"><ChevronLeft className="w-5 h-5" /></button>
                <span className="font-bold text-slate-700 dark:text-slate-200 min-w-[120px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
                <button
                  onClick={handleNextMonth}
                  disabled={isCurrentMonth}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-[#1e293b] rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
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
                data={pastDays.map(day => {
                  const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dateStr = format(dateObj, 'yyyy-MM-dd');
                  const record = empAttendance.find((r: any) => r.date === dateStr);
                  let status = record?.status || '-';
                  return { day, dateObj, record, status };
                })}
                columns={[
                  { key: 'date', label: 'Date', render: (item) => <span className="font-medium text-slate-700 dark:text-slate-300 text-[13px]">{format(item.dateObj, 'dd MMM yyyy')}</span> },
                  { key: 'day', label: 'Day', render: (item) => <span className="text-slate-500 dark:text-slate-400 text-[13px]">{format(item.dateObj, 'EEE')}</span> },
                  { key: 'in', label: 'In', render: (item) => <span className="font-mono text-slate-600 dark:text-slate-300 text-[13px]">{item.record?.checkIn || '-'}</span> },
                  { key: 'out', label: 'Out', render: (item) => <span className="font-mono text-slate-600 dark:text-slate-300 text-[13px]">{item.record?.checkOut || '-'}</span> },
                  {
                    key: 'workingHr', label: 'Working Hr', render: (item) => {
                      const { total } = calculateTime(item.record?.checkIn, item.record?.checkOut);
                      return <span className="font-medium text-slate-800 dark:text-slate-200 text-[13px]">{total}</span>
                    }
                  },
                  {
                    key: 'overtime', label: 'Over Time', render: (item) => {
                      const { overtime } = calculateTime(item.record?.checkIn, item.record?.checkOut);
                      return <span className="font-medium text-emerald-600 dark:text-emerald-400 text-[13px]">
                        {overtime !== '-' ? overtime.replace('h', 'h ').replace('m', 'm') : '-'}
                      </span>
                    }
                  },
                  {
                    key: 'status', label: 'Status', render: (item) => {
                      const customColor = customColors[item.status];
                      return <span
                        className={`text-[13px] ${customColor ? 'font-bold' : getStatusColor(item.status)}`}
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
        {/* Month Navigation & Legend */}
        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0 transition-colors">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <div className="flex gap-0 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={isCurrentMonth} onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
            </div>
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
        </div>

        {/* Scrollable Table Area */}
        <div className="overflow-auto flex-1 w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-[#f9fbfc] dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-colors">
                <th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap sticky top-0 left-0 bg-[#f9fbfc] dark:bg-slate-900 z-30 shadow-[1px_1px_0_#e2e8f0] dark:shadow-[1px_1px_0_#334155]">Code</th>
                <th className="py-3 px-4 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap sticky top-0 left-[80px] bg-[#f9fbfc] dark:bg-slate-900 z-30 shadow-[1px_1px_0_#e2e8f0] dark:shadow-[1px_1px_0_#334155]">
                  <div className="flex items-center justify-between gap-2">
                    <span>Name</span>
                    <span>Report</span>
                  </div>
                </th>
                {days.map(day => (
                  <th key={day} className="py-3 px-2 border-b border-slate-200 dark:border-slate-700 text-center min-w-[32px] sticky top-0 bg-[#f9fbfc] dark:bg-slate-900 z-20 shadow-[0_1px_0_#e2e8f0] dark:shadow-[0_1px_0_#334155]">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedEmployees.map((emp: any) => {
                const empAttendance = attendance.find((a: any) => a.userId === emp.id)?.records || [];
                return (
                  <tr
                    key={emp.id}
                    onDoubleClick={() => setSelectedEmployee(emp)}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors text-[11px] cursor-pointer"
                  >
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800 shadow-[1px_0_0_#f1f5f9] dark:shadow-[1px_0_0_#334155] group-hover:bg-slate-50/50 dark:group-hover:bg-slate-700/50 z-10 transition-colors">{emp.code}</td>
                    <td className="py-2 px-4 font-medium text-slate-500 dark:text-slate-400 sticky left-[80px] bg-white dark:bg-slate-800 shadow-[1px_0_0_#f1f5f9] dark:shadow-[1px_0_0_#334155] whitespace-nowrap group-hover:bg-slate-50/50 dark:group-hover:bg-slate-700/50 z-10 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span>{emp.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); }}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-400 hover:text-blue-500 transition-colors"
                          title="View Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
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

                      const customColor = customColors[status];

                      return (
                        <td
                          key={day}
                          className={`py-3 px-1 text-center ${isFuture ? 'text-slate-300' : (customColor ? 'font-bold' : getStatusColor(status))}`}
                          style={(!isFuture && customColor) ? { color: customColor } : {}}
                        >
                          {isFuture ? '' : status}
                        </td>
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
