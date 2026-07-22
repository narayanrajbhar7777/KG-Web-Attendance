import React, { useState, useEffect } from 'react';
import { useAppData } from '../../../context/AppContext';
import { Save, Search as SearchIcon, ChevronDown } from 'lucide-react';

const AdminMaster: React.FC = () => {
  const { masterConfig, setMasterConfig, addNotification } = useAppData();
  const [localConfig, setLocalConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('leaveRequests');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (masterConfig) {
      setLocalConfig(JSON.parse(JSON.stringify(masterConfig)));
      if (!masterConfig[selectedTable]) {
        const firstKey = Object.keys(masterConfig)[0];
        if (firstKey) setSelectedTable(firstKey);
      }
    }
  }, [masterConfig]);

  if (!localConfig) {
    return <div className="p-8 text-center text-slate-500">Loading master configuration...</div>;
  }

  const handleSave = async () => {
    setSaving(true);
    await setMasterConfig(localConfig);
    addNotification('Master configuration updated successfully', 'admin1');
    setSaving(false);
  };


  const handleColumnChange = (tableName: string, colKey: string, field: 'label' | 'searchable' | 'sortable', value: string | boolean) => {
    setLocalConfig((prev: any) => ({
      ...prev,
      [tableName]: {
        ...prev[tableName],
        columns: {
          ...prev[tableName].columns,
          [colKey]: {
            ...prev[tableName].columns[colKey],
            [field]: value
          }
        }
      }
    }));
  };

  const tableLabels: Record<string, string> = {
    leaveRequests: 'Leave Requests (Admin Dashboard)',
    missingPunch: 'Missed Punch (Admin Dashboard)',
    recentPunching: 'Recent Punching (Admin Dashboard)',
    leaveReport: 'Leave Report (Admin Dashboard)',
    missingPunchReport: 'Missed Punch Report (Admin Dashboard)',
    myRequests: 'My Requests (Employee Dashboard)',
    employeeAttendance: 'Employee Attendance (Employee Dashboard)'
  };

  const filteredTables = localConfig ? Object.keys(localConfig).filter(tableName => {
    if (!localConfig[tableName] || !localConfig[tableName].columns) return false;
    const label = tableLabels[tableName] || tableName;
    return label.toLowerCase().includes(searchQuery.toLowerCase());
  }) : [];

  return (
    <div className="p-6 md:p-8 w-full animate-fadeIn">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Master Configuration</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage global page access, search, sort, and column names.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="mb-8">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Select Page to Configure</label>
        <div className="relative max-w-md">
          <div
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full px-4 py-3 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/60 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all shadow-sm cursor-pointer flex justify-between items-center"
          >
            <span>{tableLabels[selectedTable] || selectedTable}</span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {isDropdownOpen && (
            <div className="absolute z-50 top-full mt-2 w-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700/60 rounded-xl shadow-xl overflow-hidden">
              <div className="p-3 border-b border-slate-100 dark:border-slate-700/50">
                <div className="relative">
                  <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search pages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {filteredTables.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">No pages found</div>
                ) : (
                  filteredTables.map(tableName => (
                    <div
                      key={tableName}
                      onClick={() => {
                        setSelectedTable(tableName);
                        setIsDropdownOpen(false);
                        setSearchQuery('');
                      }}
                      className={`px-4 py-3 cursor-pointer text-sm transition-colors ${selectedTable === tableName ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2a374a]/30'}`}
                    >
                      {tableLabels[tableName] || tableName}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8 animate-fadeIn">
        {Object.entries(localConfig)
          .filter(([tableName]) => tableName === selectedTable)
          .map(([tableName, tableConfig]: [string, any]) => {
            if (!tableConfig || !tableConfig.columns) return null;
            return (
              <div key={tableName} className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/20">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">{tableLabels[tableName] || tableName}</h2>
                </div>

                <div className="p-6">
                  <div className="mt-6">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Column Configuration</p>
                    <div className="overflow-x-auto bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700/50">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/80 dark:bg-[#182333]/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60">
                          <tr>
                            <th className="py-4 px-6 w-1/4">Field Name</th>
                            <th className="py-4 px-6 w-1/3">Custom Label</th>
                            <th className="py-4 px-6 w-1/5 text-center">Searchable</th>
                            <th className="py-4 px-6 w-1/5 text-center">Sortable</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                          {Object.entries(tableConfig.columns).map(([colKey, colConfig]: [string, any]) => (
                            <tr key={colKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="py-4 px-6 text-sm font-bold text-slate-700 dark:text-slate-300 capitalize">
                                {colKey.replace(/([A-Z])/g, ' $1').trim()}
                              </td>
                              <td className="py-4 px-6">
                                <input
                                  type="text"
                                  value={colConfig.label || ''}
                                  onChange={(e) => handleColumnChange(tableName, colKey, 'label', e.target.value)}
                                  className="w-full max-w-xs px-3 py-2 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all shadow-sm"
                                />
                              </td>
                              <td className="py-4 px-6 text-center">
                                <label className="inline-flex items-center cursor-pointer">
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      className="sr-only"
                                      checked={colConfig.searchable !== false}
                                      onChange={(e) => handleColumnChange(tableName, colKey, 'searchable', e.target.checked)}
                                    />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${colConfig.searchable !== false ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${colConfig.searchable !== false ? 'transform translate-x-4' : ''}`}></div>
                                  </div>
                                </label>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <label className="inline-flex items-center cursor-pointer">
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      className="sr-only"
                                      checked={colConfig.sortable !== false}
                                      onChange={(e) => handleColumnChange(tableName, colKey, 'sortable', e.target.checked)}
                                    />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${colConfig.sortable !== false ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${colConfig.sortable !== false ? 'transform translate-x-4' : ''}`}></div>
                                  </div>
                                </label>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default AdminMaster;
