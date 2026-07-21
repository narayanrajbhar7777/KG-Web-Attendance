import React, { useState, useEffect, useMemo } from 'react';
import { Search, Save, Check } from 'lucide-react';
import { fetchUsers, fetchLeaveTypes, fetchEmployeeLeaves, addEmployeeLeave, updateEmployeeLeave, deleteEmployeeLeave } from '../../../api';
import type { User, LeaveType, EmployeeLeave } from '../../../types';

const LeaveMaster: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employeeLeaves, setEmployeeLeaves] = useState<EmployeeLeave[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Map of leaveTypeId -> { enabled, days }
  const [allocationForm, setAllocationForm] = useState<Record<string, { enabled: boolean; days: number }>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, typesData, leavesData] = await Promise.all([
        fetchUsers(),
        fetchLeaveTypes(),
        fetchEmployeeLeaves()
      ]);
      setUsers((usersData || []).filter((u: User) => u.role === 'Employee'));
      // setLeaveTypes((typesData || []).filter((lt: LeaveType) => lt.isActive));
      // setEmployeeLeaves(leavesData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // When a user is selected, populate the form
  useEffect(() => {
    if (selectedUserId) {
      const userLeaves = employeeLeaves.filter(el => el.employeeId === selectedUserId);
      const formState: Record<string, { enabled: boolean; days: number }> = {};

      leaveTypes.forEach(lt => {
        const existing = userLeaves.find(el => el.leaveTypeId === lt.id);
        formState[lt.id] = {
          enabled: !!existing,
          days: existing ? existing.allocatedDays : 0
        };
      });

      setAllocationForm(formState);
    }
  }, [selectedUserId, employeeLeaves, leaveTypes]);

  const handleSave = async () => {
    if (!selectedUserId) return;

    try {
      const userLeaves = employeeLeaves.filter(el => el.employeeId === selectedUserId);

      const promises = leaveTypes.map(async (lt) => {
        const existing = userLeaves.find(el => el.leaveTypeId === lt.id);
        const alloc = allocationForm[lt.id] || { enabled: false, days: 0 };

        if (alloc.enabled) {
          if (existing) {
            if (existing.allocatedDays !== alloc.days) {
              return updateEmployeeLeave(existing.id, { allocatedDays: alloc.days });
            }
          } else {
            return addEmployeeLeave({
              id: Math.random().toString(36).substr(2, 9),
              employeeId: selectedUserId,
              leaveTypeId: lt.id,
              allocatedDays: alloc.days
            });
          }
        } else {
          if (existing) {
            return deleteEmployeeLeave(existing.id);
          }
        }
      });

      await Promise.all(promises);

      alert('Leave allocation saved successfully!');
      loadData(); // refresh data
    } catch (error) {
      console.error(error);
      alert('Failed to save leave allocation.');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors">Leave Master</h2>
        <p className="text-slate-500 dark:text-slate-400 transition-colors">Assign leave limits to individual employees.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User List */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#182333]/50">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${selectedUserId === user.id
                    ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                  }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white text-sm">{user.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{user.code}</div>
                </div>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center p-4 text-slate-500 text-sm">No employees found.</div>
            )}
          </div>
        </div>

        {/* Right Column: Allocation Form */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden h-[calc(100vh-12rem)] flex flex-col">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between bg-slate-50 dark:bg-[#182333]/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center font-bold text-xl text-blue-600 dark:text-blue-400">
                    {selectedUser.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{selectedUser.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Employee Code: {selectedUser.code}</p>
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm"
                >
                  <Save className="w-4 h-4" /> Save Allocation
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-6 flex items-center gap-2">
                  Leave Allocation for {new Date().getFullYear()}
                </h4>

                {leaveTypes.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    No active leave types found. Please add them in the Leave Policy section.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {leaveTypes.map(lt => {
                      const alloc = allocationForm[lt.id] || { enabled: false, days: 0 };
                      return (
                        <div key={lt.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-[#182333]/30">
                          <div className="flex items-center gap-3 mb-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={alloc.enabled}
                                onChange={e => setAllocationForm({ ...allocationForm, [lt.id]: { ...alloc, enabled: e.target.checked } })}
                              />
                              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                              <span className="ml-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{lt.name} ({lt.code})</span>
                            </label>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Total days allocated per year</p>
                          <input
                            type="number"
                            min="0"
                            disabled={!alloc.enabled}
                            value={alloc.days}
                            onChange={e => setAllocationForm({ ...allocationForm, [lt.id]: { ...alloc, days: parseInt(e.target.value) || 0 } })}
                            className={`w-full px-4 py-2 bg-white dark:bg-[#0b1120] border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors ${!alloc.enabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[calc(100vh-12rem)] bg-white dark:bg-[#1e293b] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
              <Check className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Select an Employee</h3>
              <p>Choose an employee from the list on the left to manage their leave allocations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaveMaster;
