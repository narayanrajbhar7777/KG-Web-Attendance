import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppContext';
import { format } from 'date-fns';
import { Trash2, Edit2, X, Check } from 'lucide-react';
import type { AppRequest } from '../../types';

const EmployeeRequests: React.FC = () => {
  const { user } = useAuth();
  const { requests, deleteRequest, updateRequest } = useAppData();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');

  const myRequests = requests.filter(r => r.userId === user?.id);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = myRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(myRequests.length / itemsPerPage);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this request?')) {
      deleteRequest(id);
    }
  };

  const startEdit = (req: AppRequest) => {
    setEditingId(req.id);
    setEditReason(req.reason);
  };

  const saveEdit = (id: string) => {
    updateRequest(id, { reason: editReason });
    setEditingId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors">My Requests</h2>

      <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider transition-colors">
                <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">Date</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">Type</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">Details</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">Reason</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">Status</th>
                <th className="p-4 border-b border-slate-200 dark:border-slate-700/60 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {myRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
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
                    <td className="p-4 text-right">
                      {req.status === 'Pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          {editingId === req.id ? (
                            <>
                              <button onClick={() => saveEdit(req.id)} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded transition-colors" title="Save">
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
              Showing <span className="font-bold text-slate-800 dark:text-slate-200">{indexOfFirstItem + 1}</span> to <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(indexOfLastItem, myRequests.length)}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{myRequests.length}</span> entries
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
