import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { Trash2, Edit2, X, Check, Search, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import type { AppRequest } from '../../types';
import { fetchEmployeeRequests, deleteRequestAPI, updateRequestAPI } from '../../api';
import { useAppData } from '../../context/AppContext';

const EmployeeRequests: React.FC = () => {
  const { user } = useAuth();
  const { masterConfig } = useAppData();

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
  const itemsPerPage = 10;

  // Filter and Sort Logic
  const processedRequests = React.useMemo(() => {
    let result = [...myRequests];

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => {
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

    return result;
  }, [myRequests, searchQuery, sortConfig]);

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

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      await deleteRequestAPI(id);
      fetchRequests();
    }
  };

  const startEdit = (req: AppRequest) => {
    setEditingId(req.id);
    setEditReason(req.reason);
  };

  const saveEdit = async (req: AppRequest) => {
    await updateRequestAPI(req.id, { 
      status: req.status,
      reason: editReason,
      date: req.date,
      toDate: req.toDate,
      type: req.type,
      leaveType: req.leaveType,
      inTime: req.inTime,
      outTime: req.outTime
    });
    setEditingId(null);
    fetchRequests();
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors">My Requests</h2>
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

      <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider transition-colors">
                <th className={`p-4 border-b border-slate-200 dark:border-slate-700/60 ${masterConfig?.myRequests?.columns?.date?.sortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a]' : ''}`} onClick={() => handleSort('date')}>
                  {masterConfig?.myRequests?.columns?.date?.label || 'Date'} <SortIcon columnKey="date" />
                </th>
                <th className={`p-4 border-b border-slate-200 dark:border-slate-700/60 ${masterConfig?.myRequests?.columns?.type?.sortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a]' : ''}`} onClick={() => handleSort('type')}>
                  {masterConfig?.myRequests?.columns?.type?.label || 'Type'} <SortIcon columnKey="type" />
                </th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">{masterConfig?.myRequests?.columns?.details?.label || 'Details'}</th>
                <th className={`p-4 border-b border-slate-200 dark:border-slate-700/60 ${masterConfig?.myRequests?.columns?.reason?.sortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a]' : ''}`} onClick={() => handleSort('reason')}>
                  {masterConfig?.myRequests?.columns?.reason?.label || 'Reason'} <SortIcon columnKey="reason" />
                </th>
                <th className={`p-4 border-b border-slate-200 dark:border-slate-700/60 ${masterConfig?.myRequests?.columns?.status?.sortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a]' : ''}`} onClick={() => handleSort('status')}>
                  {masterConfig?.myRequests?.columns?.status?.label || 'Status'} <SortIcon columnKey="status" />
                </th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700/60 text-center">{masterConfig?.myRequests?.columns?.actions?.label || 'Actions'}</th>
                <th className={`p-4 border-b border-slate-200 dark:border-slate-700/60 text-right ${masterConfig?.myRequests?.columns?.createdAt?.sortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a]' : ''}`} onClick={() => handleSort('createdAt')}>
                  {masterConfig?.myRequests?.columns?.requestDate?.label || 'Request Date'} <SortIcon columnKey="createdAt" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {myRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No requests found. You can apply from your dashboard.
                  </td>
                </tr>
              ) : (
                currentItems.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors">
                    <td className="p-4 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {format(new Date(req.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full border ${req.type === 'Leave'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20'
                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20'
                        }`}>
                        {req.type}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                      {req.type === 'Leave' ? (
                        <span>Type: {req.leaveType}</span>
                      ) : (
                        <span>Punch: {req.inTime} - {req.outTime}</span>
                      )}
                    </td>
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
                    <td className="p-4">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' :
                        req.status === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                        }`}>
                        {req.status}
                      </span>
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
                    <td className="p-4 text-right whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {req.createdAt ? format(new Date(req.createdAt), 'MMM dd, yyyy') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between bg-white dark:bg-[#1e293b]">
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

export default EmployeeRequests;
