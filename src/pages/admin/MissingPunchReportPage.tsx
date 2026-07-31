import { useState, useEffect } from 'react';
import { useAppData } from '../../context/AppContext';
import { format } from 'date-fns';
import { Filter, Calendar, Grid, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Loader from '../../components/Loader';
import { fetchEmployeeRequests } from '../../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ATTENDANCE_BASE_MAP, FETCH_API_INTERVAL, REQUEST_STATUS } from '../../constants';

export default function MissingPunchReportPage() {
  const { masterConfig: appMasterConfig } = useAppData();
  const masterConfig = appMasterConfig?.adminMasterConfig || appMasterConfig || {};
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [punchReportSearch, setPunchReportSearch] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [punchReportSort, setPunchReportSort] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      const managerId = user.code ? user.code.replace('FP', '') : user.id;
      // const todayStr = format(new Date(), 'dd-MMM-yyyy');
      try {
        const reqData = await fetchEmployeeRequests(managerId);
        const empList = user.employee_list || [];
        let usersData = empList.map((e: any) => ({
          id: e.e_code,
          name: e.e_name,
          code: e.e_code,
          designation: e.e_desg
        }));

        if (user && !usersData.some((e: any) => e.code === user.code)) {
          usersData.unshift({
            id: user.code,
            name: user.name,
            code: user.code,
            designation: user.designation
          });
        }

        setDashboardData({
          processedRequestsList: reqData.requests,
          users: usersData
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    const intervalId = setInterval(() => {
      if (user) {
        const managerId = user.code ? user.code.replace('FP', '') : user.id;
        fetchEmployeeRequests(managerId, true).then((reqData) => {
          const empList = user.employee_list || [];
          let usersData = empList.map((e: any) => ({
            id: e.e_code,
            name: e.e_name,
            code: e.e_code,
            designation: e.e_desg
          }));

          if (user && !usersData.some((e: any) => e.code === user.code)) {
            usersData.unshift({
              id: user.code,
              name: user.name,
              code: user.code,
              designation: user.designation
            });
          }

          setDashboardData({
            processedRequestsList: reqData.requests,
            users: usersData
          });
        }).catch(console.error);
      }
    }, FETCH_API_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  if (loading && !dashboardData) {
    return <div className="flex items-center justify-center min-h-[70vh]"><Loader /></div>;
  }

  const processedRequestsList = dashboardData?.processedRequestsList || [];
  const users = dashboardData?.users || [];

  let processedMissedPunchRequests = processedRequestsList.filter((r: any) => {
    if (r.type !== ATTENDANCE_BASE_MAP.MISSPUNCH.label && r.type !== ATTENDANCE_BASE_MAP.MISSPUNCH.value) return false;
    const emp = users.find((u: any) => u.id === r.userId || u.code === r.userId);
    let matchSearch = false;
    if (masterConfig?.missingPunchReport?.columns?.employeeName?.searchable !== false) {
      matchSearch = matchSearch || !!emp?.name.toLowerCase().includes(punchReportSearch.toLowerCase()) || !!emp?.code.toLowerCase().includes(punchReportSearch.toLowerCase());
    }
    if (!punchReportSearch) matchSearch = true;

    let matchDate = true;
    if (startDate) {
      matchDate = matchDate && new Date(r.date) >= startDate;
    }
    if (endDate) {
      matchDate = matchDate && new Date(r.date) <= endDate;
    }

    let matchStatus = true;
    if (filterStatus !== 'All') {
      matchStatus = r.status === filterStatus;
    }

    return matchSearch && matchDate && matchStatus;
  });

  if (punchReportSort && masterConfig?.punchReport?.columns?.[punchReportSort.key]?.sortable !== false) {
    processedMissedPunchRequests.sort((a: any, b: any) => {
      const empA = users.find((u: any) => u.id === a.userId || u.code === a.userId);
      const empB = users.find((u: any) => u.id === b.userId || u.code === b.userId);

      let valA, valB;
      if (punchReportSort.key === 'employeeName') {
        valA = empA?.name.toLowerCase() || '';
        valB = empB?.name.toLowerCase() || '';
      } else if (punchReportSort.key === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      } else if (punchReportSort.key === 'status') {
        valA = a.status.toLowerCase();
        valB = b.status.toLowerCase();
      }

      if (valA < valB) return punchReportSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return punchReportSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handlePunchReportSort = (key: string) => {
    if (masterConfig?.missingPunchReport?.columns?.[key]?.sortable === false) return;
    setPunchReportSort(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const SortIconPunchReport = ({ columnKey }: { columnKey: string }) => {
    if (masterConfig?.missingPunchReport?.columns?.[columnKey]?.sortable === false) return null;
    if (punchReportSort?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 inline-block ml-1 opacity-40" />;
    return punchReportSort.direction === 'asc'
      ? <ChevronUp className="w-3 h-3 inline-block ml-1" />
      : <ChevronDown className="w-3 h-3 inline-block ml-1" />;
  };

  const itemsPerPage = 15;
  const indexOfLastItem = (currentPage + 1) * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedMissedPunchRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(processedMissedPunchRequests.length / itemsPerPage);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
        <div className="p-5 shrink-0 border-b border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-[#182333]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Grid className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Missed Punch Report</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden md:flex bg-slate-100/50 dark:bg-[#0b1120] p-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60 mr-2">
              {(['All', REQUEST_STATUS.PENDING.code, 'Approved', 'Rejected'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setFilterStatus(f); setCurrentPage(0); }}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${filterStatus === f ? 'bg-white dark:bg-[#1e293b] text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            {(!masterConfig?.missingPunchReport?.columns || Object.values(masterConfig.missingPunchReport.columns).some((c: any) => c.searchable !== false)) && (
              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Name or Code..."
                  value={punchReportSearch}
                  onChange={(e) => { setPunchReportSearch(e.target.value); setCurrentPage(0); }}
                  className="pl-9 pr-4 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all placeholder:text-slate-400"
                />
              </div>
            )}

            {(!masterConfig?.missingPunchReport?.columns || Object.values(masterConfig.missingPunchReport.columns).some((c: any) => c.filterable !== false)) && (
              <div className="flex items-center gap-2">
                <div className="relative z-50">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <DatePicker
                    selectsRange={true}
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(update) => {
                      setDateRange(update);
                      setCurrentPage(0);
                    }}
                    isClearable={true}
                    placeholderText="Select Date Range"
                    className="pl-9 pr-8 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white dark:[color-scheme:dark] w-[240px]"
                  />
                </div>
              </div>
            )}

            <button onClick={() => navigate('/admin')} className="ml-2 p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors" title="Close Report">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white dark:bg-[#1e293b] z-10">
              <tr className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 transition-colors">
                <th className="py-4 px-4">Code</th>
                <th className={`py-4 px-4 ${masterConfig?.missingPunchReport?.columns?.employeeName?.sortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a]' : ''}`} onClick={() => handlePunchReportSort('employeeName')}>
                  Name <SortIconPunchReport columnKey="employeeName" />
                </th>
                <th className={`py-4 px-4 ${masterConfig?.missingPunchReport?.columns?.date?.sortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a]' : ''}`} onClick={() => handlePunchReportSort('date')}>
                  Date <SortIconPunchReport columnKey="date" />
                </th>
                <th className="py-4 px-4">In</th>
                <th className="py-4 px-4">Out</th>
                <th className="py-4 px-4">Reason</th>
                <th className="py-4 px-4">Requested Date</th>
                <th className="py-4 px-4">Actioned Date</th>
                <th className="py-4 px-4">Note</th>
                <th className={`py-4 px-4 ${masterConfig?.missingPunchReport?.columns?.status?.sortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a]' : ''}`} onClick={() => handlePunchReportSort('status')}>
                  Status <SortIconPunchReport columnKey="status" />
                </th>

              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {processedMissedPunchRequests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No Missed Punch reports found.
                  </td>
                </tr>
              ) : (
                currentItems.map((req: any) => {
                  const emp = users.find((u: any) => u.id === req.userId);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors group">
                      <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        {emp?.code}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <p className="font-medium text-slate-500 dark:text-slate-400 text-[11px] uppercase whitespace-nowrap">{emp?.name}</p>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        {format(new Date(req.date), 'dd-MM-yyyy')}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        {req.inTime || '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                        {req.outTime || '-'}
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{req.reason}</p>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {req.createdAt ? format(new Date(req.createdAt), 'dd-MMM-yyyy HH:mm') : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {req.updatedAt ? format(new Date(req.updatedAt), 'dd-MMM-yyyy HH:mm') : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-500 dark:text-slate-400">
                        {req.approver_notes || '-'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${req.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                          : req.status === REQUEST_STATUS.PENDING.code ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20'
                            : 'bg-red-100 text-red-500 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20'
                          }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-[#182333]/50 transition-colors">
          <span>Showing {processedMissedPunchRequests.length === 0 ? 0 : indexOfFirstItem + 1} to {Math.min(indexOfLastItem, processedMissedPunchRequests.length)} of {processedMissedPunchRequests.length} entries</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-sm px-2">{currentPage + 1} / {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
