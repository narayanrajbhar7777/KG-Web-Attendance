import React, { useState } from 'react';
import { useAppData } from '../../context/AppContext';
import { Users, UserX, Clock, CalendarOff, Search } from 'lucide-react';
import { format } from 'date-fns';

const AttendanceSummary: React.FC = () => {
  const { users, attendance, customColors } = useAppData();
  const employees = users.filter(u => u.role === 'Employee');

  const todayStr = '2026-07-15'; // Mocked "today"

  let present = 0;
  let absent = 0;
  let onLeave = 0;
  let late = 0;

  attendance.forEach(emp => {
    const todayRecord = emp.records.find(r => r.date === todayStr);
    if (todayRecord) {
      if (todayRecord.status === 'P' || todayRecord.status === 'HD' || todayRecord.status === 'PH') present++;
      if (todayRecord.status === 'A') absent++;
      if (todayRecord.status === 'L' || todayRecord.status === 'EL' || todayRecord.status === 'HDEL') onLeave++;
      if (todayRecord.status === 'L' || todayRecord.status === 'EO') late++; // Treating L as late as well per user requirements
    }
  });

  const [detailsSearch, setDetailsSearch] = useState('');

  const todayRecords = employees.map(emp => {
    const empAtt = attendance.find(a => a.employeeId === emp.id);
    const record = empAtt?.records.find(r => r.date === todayStr);
    return { emp, record };
  }).filter(item => item.emp.name.toLowerCase().includes(detailsSearch.toLowerCase()) || item.emp.code.toLowerCase().includes(detailsSearch.toLowerCase()));

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = todayRecords.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(todayRecords.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors">Attendance Summary</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">{format(new Date(todayStr), 'EEEE, MMMM dd, yyyy')}</p>
      </div>

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

      {/* Quick summary of employees total vs tracked */}
      <div className="bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 p-4 rounded-lg text-sm flex items-center gap-2 transition-colors duration-200 border border-transparent dark:border-blue-500/20">
        <span className="font-bold">Note:</span> Showing data for {employees.length} total employees.
      </div>

      {/* Employee Details / Recent Logins Table */}
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-[#182333]/50">
          <h3 className="text-[17px] font-bold text-slate-800 dark:text-white">Recent Logins & Employee Details</h3>
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
              className="pl-9 pr-4 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 transition-colors">
              <tr>
                <th className="py-4 px-6">Employee</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Check In</th>
                <th className="py-4 px-6">Check Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {currentItems.map((item) => (
                <tr key={item.emp.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-[#1e293b]">
                        {item.emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.emp.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.emp.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {item.record && customColors[item.record.status] ? (
                      <span 
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: customColors[item.record.status], border: `1px solid ${customColors[item.record.status]}` }}
                      >
                        {item.record.status === 'P' || item.record.status === 'HD' || item.record.status === 'PH' ? 'Present' :
                          item.record.status === 'A' ? 'Absent' :
                            item.record.status === 'L' || item.record.status === 'EO' ? 'Late' : 'On Leave'}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${!item.record ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' :
                        item.record.status === 'P' || item.record.status === 'HD' || item.record.status === 'PH' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' :
                          item.record.status === 'A' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                            item.record.status === 'L' || item.record.status === 'EO' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                              'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
                        }`}>
                        {!item.record ? 'No Data' :
                          item.record.status === 'P' || item.record.status === 'HD' || item.record.status === 'PH' ? 'Present' :
                            item.record.status === 'A' ? 'Absent' :
                              item.record.status === 'L' || item.record.status === 'EO' ? 'Late' : 'On Leave'}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300 font-medium">
                    {item.record?.checkIn || <span className="text-slate-400 dark:text-slate-600">-</span>}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300 font-medium">
                    {item.record?.checkOut || <span className="text-slate-400 dark:text-slate-600">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between bg-white dark:bg-[#1e293b]">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Showing <span className="font-bold text-slate-800 dark:text-slate-200">{indexOfFirstItem + 1}</span> to <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(indexOfLastItem, todayRecords.length)}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{todayRecords.length}</span> entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceSummary;
