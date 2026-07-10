import React, { useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { format, getDaysInMonth, addMonths, subMonths, isAfter, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

const AttendanceDetails: React.FC = () => {
  const { users, attendance, customColors, requests } = useAppData();
  const [detailsSearch, setDetailsSearch] = useState('');
  
  const employees = users.filter(u => 
    u.role === 'Employee' && 
    (u.name.toLowerCase().includes(detailsSearch.toLowerCase()) || 
     u.code.toLowerCase().includes(detailsSearch.toLowerCase()))
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(employees.length / itemsPerPage);

  const paginatedEmployees = employees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  const daysInMonth = getDaysInMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = startOfDay(new Date());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'P': return 'text-green-600 font-bold';
      case 'A': return 'text-red-600 font-bold';
      case 'WO': return 'text-blue-500 font-medium';
      case 'H': return 'text-purple-600 font-bold';
      case 'HD': return 'text-slate-400 font-bold';
      case 'PH': return 'text-emerald-500 font-bold';
      case 'EL': return 'text-teal-600 font-bold';
      case 'HDEL': return 'text-teal-400 font-bold';
      case 'L': return 'text-amber-500 font-bold';
      case 'EO': return 'text-orange-500 font-bold';
      case 'NJ': return 'text-slate-300 font-bold';
      case 'LWP': return 'text-pink-600 font-bold';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-white dark:bg-slate-800 shadow-sm rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col h-[calc(100vh-112px)] overflow-hidden transition-colors duration-200">
        {/* Month Navigation & Legend */}
        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shrink-0 transition-colors">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <div className="flex gap-0 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="relative ml-4">
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

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span><strong className="text-slate-800 dark:text-slate-200">P</strong> - Present</span>
            <span><strong className="text-slate-800 dark:text-slate-200">A</strong> - Absent</span>
            <span><strong className="text-slate-800 dark:text-slate-200">WO</strong> - Weekly Off</span>
            <span><strong className="text-slate-800 dark:text-slate-200">H</strong> - Holiday</span>
            <span><strong className="text-slate-800 dark:text-slate-200">HD</strong> - Half Day</span>
            <span><strong className="text-slate-800 dark:text-slate-200">PH</strong> - Present on Holiday</span>
            <span><strong className="text-slate-800 dark:text-slate-200">EL</strong> - Earned Leave</span>
            <span><strong className="text-slate-800 dark:text-slate-200">HDEL</strong> - Half Day Earned Leave</span>
            <span><strong className="text-slate-800 dark:text-slate-200">L</strong> - Late</span>
            <span><strong className="text-slate-800 dark:text-slate-200">EO</strong> - Early Out</span>
            <span><strong className="text-slate-800 dark:text-slate-200">NJ</strong> - Not Joined</span>
            <span><strong className="text-slate-800 dark:text-slate-200">LWP</strong> - Leave without Pay</span>
          </div>
        </div>

        {/* Scrollable Table Area */}
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
              {paginatedEmployees.map(emp => {
                const empAttendance = attendance.find(a => a.userId === emp.id)?.records || [];
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors text-[11px]">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800 shadow-[1px_0_0_#f1f5f9] dark:shadow-[1px_0_0_#334155] group-hover:bg-slate-50/50 dark:group-hover:bg-slate-700/50 z-10 transition-colors">{emp.code}</td>
                    <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400 sticky left-[80px] bg-white dark:bg-slate-800 shadow-[1px_0_0_#f1f5f9] dark:shadow-[1px_0_0_#334155] whitespace-nowrap group-hover:bg-slate-50/50 dark:group-hover:bg-slate-700/50 z-10 transition-colors">{emp.name}</td>
                    {days.map(day => {
                      const dateStr = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), 'yyyy-MM-dd');
                      const currentIterDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                      const isFuture = isAfter(currentIterDate, today);

                      let status = '-';
                      if (!isFuture) {
                        const record = empAttendance.find(r => r.date === dateStr);
                        status = record?.status || '-';

                        const approvedMispunch = requests.find(r => r.userId === emp.id && r.type === 'Misspunch' && r.date === dateStr && r.status === 'Approved');
                        if (approvedMispunch) {
                          status = 'P/MP';
                        }
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
