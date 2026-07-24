import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format, differenceInDays } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Trash2, Edit2, X, Check, Search, ArrowUpDown, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import Loader from '../../components/Loader';
import type { AppRequest } from '../../types';
import { fetchEmployeeRequests, deleteRequestAPI, updateRequestAPI } from '../../api';
import { useAppData } from '../../context/AppContext';
import { toast } from 'react-hot-toast';

const EmployeeRequests: React.FC = () => {
  const { user } = useAuth();
  const { masterConfig, addNotification } = useAppData();

  const [myRequests, setMyRequests] = useState<AppRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const data = await fetchEmployeeRequests(user.id);
      setMyRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Leave' | 'Missed Punch'>('Leave');

  // Filter and Sort Logic
  const processedRequests = React.useMemo(() => {
    let result = myRequests.filter(req => activeTab === 'Leave' ? req.type === 'Leave' : (req.type === 'Missed Punch' || req.type === 'Misspunch'));

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => {
        // console.log(`R: ${r.actionedDate}`);
        let match = false;
        if (masterConfig?.myRequests?.columns?.type?.searchable !== false) {
          match = match || r.type.toLowerCase().includes(q) || Boolean(r.leaveType && r.leaveType.toLowerCase().includes(q));
        }
        if (masterConfig?.myRequests?.columns?.reason?.searchable !== false) {
          match = match || r.reason.toLowerCase().includes(q);
        }
        if (masterConfig?.myRequests?.columns?.status?.searchable !== false) {
          match = match || r.status.toLowerCase().includes(q);
        }
        return match;
      });
    }

    if (statusFilter) {
      result = result.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase());
    }

    if (startDate && endDate) {
      result = result.filter(r => {
        if (!r.date) return false;
        const rDate = new Date(r.date);
        rDate.setHours(0, 0, 0, 0);
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        return rDate >= sDate && rDate <= eDate;
      });
    }

    if (sortConfig !== null) {
      result.sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof AppRequest];
        let valB: any = b[sortConfig.key as keyof AppRequest];

        if (sortConfig.key === 'date' || sortConfig.key === 'createdAt') {
          valA = valA ? new Date(valA).getTime() : 0;
          valB = valB ? new Date(valB).getTime() : 0;
        } else {
          valA = valA ? String(valA).toLowerCase() : '';
          valB = valB ? String(valB).toLowerCase() : '';
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    // console.log(`myRequests ${JSON.stringify(myRequests)}`);
    return result;
  }, [myRequests, searchQuery, sortConfig, statusFilter, startDate, endDate, activeTab]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(processedRequests.length / itemsPerPage);

  const handleSort = (key: string) => {
    if (masterConfig?.myRequests?.columns?.[key]?.sortable === false) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (masterConfig?.myRequests?.columns?.[columnKey]?.sortable === false) return null;
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 inline-block ml-1" /> : <ChevronDown className="w-4 h-4 inline-block ml-1" />;
    }
    return <ArrowUpDown className="w-4 h-4 inline-block ml-1 text-slate-300 dark:text-slate-600" />;
  };

  const confirmDelete = async (id: string) => {
    try {
      const req = myRequests.find(r => r.id === id);
      await deleteRequestAPI(id);
      toast.success('Request deleted successfully!');
      if (req && user) {
        if (req.managerId) {
          addNotification(`A ${req.type} request was deleted by ${user.name}`, req.managerId);
        }
        addNotification(`A ${req.type} request was deleted by ${user.name}`); // for Admin
      }
      fetchRequests();
    } catch (error) {
      toast.error('Failed to delete request. Please try again.');
      console.error('Error deleting request:', error);
    }
  };

  const handleDelete = (id: string) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Are you sure you want to delete this request?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                confirmDelete(id);
              }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: 'top-right' }
    );
  };

  const startEdit = (req: AppRequest) => {
    setEditingId(req.id);
    setEditReason(req.reason);
  };

  const saveEdit = async (req: AppRequest) => {
    const currentRequestData = myRequests.find((item) => item.id === req.id);
    if (!currentRequestData) return;
    console.log(`${req.id} | MYREQUEST: ===============>${JSON.stringify(currentRequestData)}`)
    const payload = {
      status: currentRequestData.status,
      reason: editReason,
      date: currentRequestData.date,
      toDate: currentRequestData.toDate,
      type: currentRequestData.type,
      leaveType: currentRequestData.leaveType,
      inTime: currentRequestData?.inTime,
      outTime: currentRequestData?.outTime
    }
    console.log(`payload: ${JSON.stringify(payload)}`)
    await updateRequestAPI(req.id, payload);

    if (user) {
      if (currentRequestData.managerId) {
        addNotification(`A ${currentRequestData.type} request was updated by ${user.name}`, currentRequestData.managerId);
      }
      addNotification(`A ${currentRequestData.type} request was updated by ${user.name}`); // for Admin
    }

    setEditingId(null);
    fetchRequests();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[70vh]"><Loader /></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0 relative z-20">
        <div className="flex bg-slate-100 dark:bg-[#1e293b] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('Leave')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'Leave' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            Leave
          </button>
          <button
            onClick={() => setActiveTab('Missed Punch')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'Missed Punch' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            Missed Punch
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Pending', 'Approved', 'Rejected'].map(status => {
            let activeColor = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700/80 dark:text-slate-200 dark:border-slate-600';
            if (status === 'Approved') activeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
            else if (status === 'Rejected') activeColor = 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
            else if (status === 'Pending') activeColor = 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';

            const isActive = status === 'All' ? statusFilter === null : statusFilter === status;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status === 'All' ? null : status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${isActive
                  ? activeColor
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-[#1e293b] dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
              >
                {status}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex items-center bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              placeholderText="Select Date Range"
              className="bg-transparent text-sm text-slate-800 dark:text-white outline-none w-48 placeholder:text-slate-400"
              dateFormat="dd MMM yyyy"
              isClearable
            />
          </div>
          {Object.values(masterConfig?.myRequests?.columns || {}).some((c: any) => c.searchable !== false) && (
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all w-full sm:w-64 shadow-sm placeholder:text-slate-400"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#182333]/95 backdrop-blur-sm text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider transition-colors shadow-sm">
              <tr>
                {activeTab === 'Leave' ? (
                  <>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">From</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">To</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">Count</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">Type</th>
                  </>
                ) : (
                  <>
                    <th className={`p-4 border-b border-slate-200 dark:border-slate-700/60 ${masterConfig?.myRequests?.columns?.date?.sortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a]' : ''}`} onClick={() => handleSort('date')}>
                      {masterConfig?.myRequests?.columns?.date?.label || 'Date'} <SortIcon columnKey="date" />
                    </th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">In</th>
                    <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">Out</th>
                  </>
                )}
                <th className={`p-4 border-b border-slate-200 dark:border-slate-700/60 ${masterConfig?.myRequests?.columns?.reason?.sortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a]' : ''}`} onClick={() => handleSort('reason')}>
                  {masterConfig?.myRequests?.columns?.reason?.label || 'Reason'} <SortIcon columnKey="reason" />
                </th>
                <th className={`p-4 border-b border-slate-200 dark:border-slate-700/60 ${masterConfig?.myRequests?.columns?.createdAt?.sortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a]' : ''}`} onClick={() => handleSort('createdAt')}>
                  {masterConfig?.myRequests?.columns?.requestDate?.label || 'Requested Date'} <SortIcon columnKey="createdAt" />
                </th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">Actioned Date</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">Note</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700/60 text-center">{masterConfig?.myRequests?.columns?.actions?.label || 'Action'}</th>
                <th className={`p-4 border-b border-slate-200 dark:border-slate-700/60 ${masterConfig?.myRequests?.columns?.status?.sortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a]' : ''}`} onClick={() => handleSort('status')}>
                  {masterConfig?.myRequests?.columns?.status?.label || 'Status'} <SortIcon columnKey="status" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {myRequests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No requests found. You can apply from your dashboard.
                  </td>
                </tr>
              ) : (
                currentItems.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors">
                    {activeTab === 'Leave' ? (
                      <>
                        <td className="p-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{req.date ? format(new Date(req.date), 'MMM dd, yyyy') : '-'}</td>
                        <td className="p-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{req.toDate ? format(new Date(req.toDate), 'MMM dd, yyyy') : '-'}</td>
                        <td className="p-4 whitespace-nowrap text-sm font-semibold text-slate-600 dark:text-slate-300">{req.toDate ? differenceInDays(new Date(req.toDate), new Date(req.date)) + 1 : 1}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{req.leaveType}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{req.date ? format(new Date(req.date), 'MMM dd, yyyy') : '-'}</td>
                        <td className="p-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{req.inTime || '-'}</td>
                        <td className="p-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{req.outTime || '-'}</td>
                      </>
                    )}
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {editingId === req.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            className="w-full px-2 py-1 text-sm bg-white dark:bg-[#0b1120] border border-blue-500 rounded outline-none text-slate-800 dark:text-white"
                            autoFocus
                          />
                        </div>
                      ) : (
                        req.reason
                      )}
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {req.createdAt ? format(new Date(req.createdAt), 'MMM dd, yyyy') : '-'}
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {req.updatedAt ? format(new Date(req.updatedAt), 'MMM dd, yyyy') : '-'}
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                      {req.approver_notes || '-'}
                    </td>
                    <td className="p-4 text-center">
                      {req.status === 'Pending' ? (
                        <div className="flex items-center justify-center gap-2">
                          {editingId === req.id ? (
                            <>
                              <button onClick={() => saveEdit(req)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded transition-colors" title="Save">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" title="Cancel">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(req)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors" title="Edit Reason">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(req.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors" title="Delete Request">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No actions</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' :
                        req.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                        }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between bg-white dark:bg-[#1e293b] shrink-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Showing <span className="font-bold text-slate-800 dark:text-slate-200">{processedRequests.length === 0 ? 0 : indexOfFirstItem + 1}</span> to <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(indexOfLastItem, processedRequests.length)}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{processedRequests.length}</span> entries
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
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-50 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeRequests;
