import React, { useState, useEffect } from 'react';
import { Save, Search } from 'lucide-react';
import Loader from '../../../components/Loader';
import { fetchUsers, fetchEmployeePolicies, createEmployeePolicy, updateEmployeePolicy } from '../../../api';
import { useAppData } from '../../../context/AppContext';
import type { User, AttendancePolicy } from '../../../types';
import { DAYS, DEFAULT_IN_TIME, DEFAULT_OUT_TIME } from '../../../constants';

const AttendancePolicyPage: React.FC = () => {
  const { addNotification } = useAppData();
  const [employees, setEmployees] = useState<User[]>([]);
  const [policies, setPolicies] = useState<Record<string, AttendancePolicy>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [allUsers, allPolicies] = await Promise.all([
          fetchUsers(),
          fetchEmployeePolicies()
        ]);

        // Ensure only Employees are shown, or all users if desired. Let's show all for flexibility.
        if (allUsers) {
          setEmployees(allUsers.filter((u: User) => u.role !== 'Admin')); // typically admins don't need policies
        }

        const policyMap: Record<string, AttendancePolicy> = {};
        allPolicies.forEach((p: AttendancePolicy) => {
          policyMap[p.employeeId] = p;
        });
        setPolicies(policyMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handlePolicyChange = (employeeId: string, field: string, value: any) => {
    setPolicies(prev => {
      const existing = prev[employeeId] || { id: '', employeeId, inTime: DEFAULT_IN_TIME, outTime: DEFAULT_OUT_TIME, weekOffs: [0] };
      return {
        ...prev,
        [employeeId]: {
          ...existing,
          [field]: value
        }
      };
    });
  };

  const handleToggleDay = (employeeId: string, dayValue: number) => {
    setPolicies(prev => {
      const existing = prev[employeeId] || { id: '', employeeId, inTime: DEFAULT_IN_TIME, outTime: DEFAULT_OUT_TIME, weekOffs: [0] };
      const currentWeekOffs = existing.weekOffs || [];
      const isChecked = currentWeekOffs.includes(dayValue);
      const newOffs = isChecked
        ? currentWeekOffs.filter(d => d !== dayValue)
        : [...currentWeekOffs, dayValue];

      return {
        ...prev,
        [employeeId]: {
          ...existing,
          weekOffs: newOffs
        }
      };
    });
  };

  const handleSaveRow = async (employeeId: string) => {
    setSavingRows(prev => ({ ...prev, [employeeId]: true }));
    try {
      const existingPolicy = policies[employeeId];

      if (existingPolicy && 'id' in existingPolicy && existingPolicy.id) {
        // Update existing
        await updateEmployeePolicy(existingPolicy.id, existingPolicy);
      } else {
        // Create new
        const policyToSave = existingPolicy || { employeeId, inTime: DEFAULT_IN_TIME, outTime: DEFAULT_OUT_TIME, weekOffs: [0] };
        await createEmployeePolicy({
          employeeId: policyToSave.employeeId,
          inTime: policyToSave.inTime,
          outTime: policyToSave.outTime,
          weekOffs: policyToSave.weekOffs
        });
        setPolicies(prev => ({ ...prev, [employeeId]: policyToSave as AttendancePolicy }));
      }

      addNotification(`Policy updated successfully`, 'admin1');
    } catch (err) {
      console.error(err);
      addNotification(`Failed to save policy`, 'admin1');
    } finally {
      setSavingRows(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 w-full animate-fadeIn flex flex-col h-[calc(100vh-80px)]">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Attendance Policy</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configure individual attendance rules per employee.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col flex-1 overflow-hidden">

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
          {loading ? (
            <div className="flex items-center justify-center min-h-[70vh]"><Loader /></div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#111827] shadow-sm">
                <tr className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700/60">Code</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700/60"> Name</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700/60 w-32">In</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700/60 w-32">Out</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700/60 text-center">Week Off</th>
                  <th className="p-4 border-b border-slate-200 dark:border-slate-700/60 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">No employees found.</td>
                  </tr>
                ) : filteredEmployees.map((emp) => {
                  const policy = policies[emp.id] || { id: '', employeeId: emp.id, inTime: DEFAULT_IN_TIME, outTime: DEFAULT_OUT_TIME, weekOffs: [0] };
                  const isSaving = savingRows[emp.id];

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="p-4">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
                          {emp.code}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800 dark:text-white text-sm">{emp.name}</div>
                        <div className="text-xs text-slate-500">{emp.role}</div>
                      </td>
                      <td className="p-4">
                        <input
                          type="time"
                          value={policy.inTime}
                          onChange={(e) => handlePolicyChange(emp.id, 'inTime', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all shadow-sm"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="time"
                          value={policy.outTime}
                          onChange={(e) => handlePolicyChange(emp.id, 'outTime', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all shadow-sm"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-1.5">
                          {Object.values(DAYS).map((day, idx) => {
                            const isSelected = (policy.weekOffs || []).includes(day.value);
                            return (
                              <button
                                key={idx}
                                onClick={() => handleToggleDay(emp.id, day.value)}
                                title={day.name}
                                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all ${isSelected
                                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-600 ring-offset-1 dark:ring-offset-[#1e293b]'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                  }`}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleSaveRow(emp.id)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          {isSaving ? <div className="w-3.5 h-3.5 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendancePolicyPage;
