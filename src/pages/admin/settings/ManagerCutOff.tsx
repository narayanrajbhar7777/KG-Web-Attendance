import React, { useState, useEffect, useMemo } from 'react';
import { Search, Edit2, X, RefreshCw, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import Select, { components } from 'react-select';
import { toast } from 'react-hot-toast';
import { fetchDeptMgrCutoff, updateDeptMgrCutoff } from '../../../api';
import Loader from '../../../components/Loader';
import { useAuth } from '../../../context/AuthContext';

interface CutOffData {
  e_comp: string;
  brname: string;
  manager_code: string;
  mgrname: string;
  hod_code: string;
  hod_name: string;
  buffer_time: string;
  day_start_time: string;
  day_close_time: string;
}

const CustomOption = (props: any) => {
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-2">
        {props.isSelected ? (
          <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        ) : (
          <Square className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
        )}
        <span className="truncate">{props.label}</span>
      </div>
    </components.Option>
  );
};

const customSelectClassNames = {
  control: (state: any) =>
    `flex items-center justify-between px-2 h-[38px] w-full xl:w-[280px] bg-slate-50 dark:bg-[#0b1120] border rounded-lg text-sm transition-colors cursor-pointer shrink-0 ${state.isFocused
      ? 'border-blue-500 ring-1 ring-blue-500'
      : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-slate-500'
    }`,
  menu: () => 'absolute z-50 w-full mt-1 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden',
  menuList: () => 'max-h-[300px] overflow-y-auto custom-scrollbar',
  option: (state: any) => `px-3 py-2 text-sm cursor-pointer transition-colors truncate ${state.isSelected
    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium'
    : state.isFocused
      ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
      : 'text-slate-700 dark:text-slate-300'
    }`,
  singleValue: () => 'text-slate-700 dark:text-slate-300 font-medium truncate',
  input: () => 'text-slate-700 dark:text-slate-300',
  placeholder: () => 'text-slate-500 dark:text-slate-400 font-medium',
  clearIndicator: () => 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 flex items-center',
  dropdownIndicator: () => 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 flex items-center',
  valueContainer: () => 'flex items-center flex-1 gap-1 px-1 flex-nowrap overflow-hidden',
  indicatorsContainer: () => 'flex items-center shrink-0',
  indicatorSeparator: () => 'bg-slate-200 dark:bg-slate-700 mx-1 w-[1px] my-2',
  multiValue: () => 'bg-blue-100 dark:bg-blue-900/50 rounded flex items-center m-0.5 shrink-0',
  multiValueLabel: () => 'text-blue-800 dark:text-blue-300 text-xs font-medium px-1.5 py-0.5 truncate max-w-[80px]',
  multiValueRemove: () => 'text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-r px-1 transition-colors flex items-center'
};

const CustomValueContainer = ({ children, ...props }: any) => {
  const selectedCount = props.getValue().length;

  const otherChildren: any[] = [];

  React.Children.forEach(children, (child: any) => {
    if (child && child.props && child.props.data) {
      // Ignore pills
    } else {
      otherChildren.push(child);
    }
  });

  return (
    <components.ValueContainer {...props}>
      {selectedCount > 0 && (
        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 px-1 shrink-0 flex items-center">
          {selectedCount} selected
        </div>
      )}
      {otherChildren}
    </components.ValueContainer>
  );
};

const MultiSelectDropdown = ({ options, value, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectAll = () => onChange(options.map((o: any) => o.value));
  const handleClearAll = () => onChange([]);

  const MenuList = (props: any) => (
    <components.MenuList {...props}>
      <div className="flex justify-between items-center px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 sticky top-0 bg-white dark:bg-[#1e293b] z-10">
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectAll(); }}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
        >
          Select All
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleClearAll(); }}
          className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          Clear
        </button>
      </div>
      {props.children}
    </components.MenuList>
  );

  return (
    <div ref={wrapperRef} className="w-full xl:w-[280px]">
      <Select
        isMulti
        menuIsOpen={isOpen}
        onMenuOpen={() => setIsOpen(true)}
        onMenuClose={() => setIsOpen(false)}
        closeMenuOnSelect={false}
        closeMenuOnScroll={true}
        hideSelectedOptions={false}
        components={{ Option: CustomOption, ValueContainer: CustomValueContainer, MenuList }}
        options={options}
        value={value}
        onChange={(selected: any) => onChange(selected ? selected.map((s: any) => s.value) : [])}
        placeholder={placeholder}
        isClearable
        isSearchable
        unstyled
        classNames={customSelectClassNames}
      />
    </div>
  );
};

const ManagerCutOff: React.FC = () => {
  const [cutoffList, setCutoffList] = useState<CutOffData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterCompany, setFilterCompany] = useState<string[]>([]);
  const [filterBranch, setFilterBranch] = useState<string[]>([]);
  const [filterManager, setFilterManager] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  // Edit State
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CutOffData | null>(null);
  const [saving, setSaving] = useState(false);
  const [fetchingHod, setFetchingHod] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchDeptMgrCutoff();
      setCutoffList(data);
    } catch (err) {
      toast.error('Unable to fetch Cut Off Master data.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: CutOffData, idx: number) => {
    setEditingKey(`${currentPage}_${idx}`);
    setEditForm({ ...record });
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditForm(null);
  };

  const handleFetchHod = async (code: string) => {

    if (!code) return;
    try {
      setFetchingHod(true);

      const currentEmployee = user?.employee_list?.find(emp => emp.e_code === code);
      if (currentEmployee) {
        setEditForm(prev => prev ? ({ ...prev, hod_name: currentEmployee.e_name, mgrname: currentEmployee.e_name }) : prev);
        toast.success('HOD Name auto-fetched successfully');
      } else {
        toast.error('HOD not found with this code');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch HOD details');
    } finally {
      setFetchingHod(false);
    }
  };


  const handleSave = async () => {
    if (!editForm) return;
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(editForm.day_start_time)) {
      toast.error('Invalid Day Start Time format. Use HH:mm');
      return;
    }
    if (!timeRegex.test(editForm.day_close_time)) {
      toast.error('Invalid Day Close Time format. Use HH:mm');
      return;
    }

    if (editForm.day_close_time <= editForm.day_start_time) {
      toast.error('Day Close Time must be greater than Day Start Time.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        e_comp: editForm.e_comp,
        brname: editForm.brname,
        manager_code: editForm.manager_code,
        mgrname: editForm.mgrname,
        hod_code: editForm.hod_code,
        hod_name: editForm.hod_name,
        buffer_time: editForm.buffer_time,
        day_start_time: editForm.day_start_time,
        day_close_time: editForm.day_close_time
      };

      const response = await updateDeptMgrCutoff(payload);
      if (response && response.status === 'success') {
        toast.success('Department manager cutoff updated successfully');
        setEditingKey(null);
        setEditForm(null);
        await loadData();
      } else {
        toast.error('Unable to update department manager cutoff');
      }
    } catch (err) {
      toast.error('Unable to update department manager cutoff');
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchText('');
    setFilterCompany([]);
    setFilterBranch([]);
    setFilterManager([]);
    setCurrentPage(1);
  };

  const companies = useMemo(() => Array.from(new Set(cutoffList.map(c => c.e_comp).filter(Boolean))), [cutoffList]);
  const branches = useMemo(() => Array.from(new Set(cutoffList.map(c => c.brname).filter(Boolean))), [cutoffList]);
  const managers = useMemo(() => Array.from(new Set(cutoffList.map(c => c.mgrname).filter(Boolean))), [cutoffList]);

  const filteredData = useMemo(() => {
    return cutoffList.filter(item => {
      const matchSearch =
        item.e_comp?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.brname?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.mgrname?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.manager_code?.toLowerCase().includes(searchText.toLowerCase());

      const matchesCompany = filterCompany.length === 0 || filterCompany.includes(item.e_comp);
      const matchesBranch = filterBranch.length === 0 || filterBranch.includes(item.brname);
      const matchesManager = filterManager.length === 0 || filterManager.includes(item.mgrname);

      return matchSearch && matchesCompany && matchesBranch && matchesManager;
    });
  }, [cutoffList, searchText, filterCompany, filterBranch, filterManager]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterCompany, filterBranch, filterManager]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const renderPagination = () => {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="p-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md disabled:opacity-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md disabled:opacity-50 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader />
        <p className="mt-4 text-slate-500 font-medium">Loading Manager Cut Off...</p>
      </div>
    );
  }


  return (
    <div className="relative flex flex-col h-[calc(100vh-104px)] md:h-[calc(100vh-120px)] animate-fadeIn overflow-hidden">
      {/* Filters Area (Fixed) */}
      <div className="shrink-0 bg-white dark:bg-[#1e293b] p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 mb-4 flex flex-col xl:flex-row gap-3 items-center relative z-40">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white whitespace-nowrap hidden md:block">Manager Cut Off</h1>
        <div className="flex flex-wrap gap-4 items-center flex-1 justify-end">
          <MultiSelectDropdown
            options={companies.map(c => ({ value: c, label: c }))}
            value={filterCompany.map(c => ({ value: c, label: c }))}
            onChange={setFilterCompany}
            placeholder="All Companies"
          />
          <MultiSelectDropdown
            options={branches.map(b => ({ value: b, label: b }))}
            value={filterBranch.map(b => ({ value: b, label: b }))}
            onChange={setFilterBranch}
            placeholder="All Branches"
          />
          <MultiSelectDropdown
            options={managers.map(m => ({ value: m, label: m }))}
            value={filterManager.map(m => ({ value: m, label: m }))}
            onChange={setFilterManager}
            placeholder="All Managers"
          />
          <div className="relative w-full xl:w-[280px] shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company, branch, manager..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full h-[38px] pl-9 pr-4 bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-colors"
            />
          </div>
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4" />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table Container (Scrollable) */}
      <div className="flex-1 bg-white dark:bg-[#1e293b] rounded-t-2xl shadow-sm border-t border-l border-r border-slate-200 dark:border-slate-700/60 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-[#182333] shadow-sm">
              <tr>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 whitespace-nowrap bg-slate-50 dark:bg-[#182333]">Company</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 whitespace-nowrap bg-slate-50 dark:bg-[#182333]">Branch</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 whitespace-nowrap bg-slate-50 dark:bg-[#182333]">Manager Code</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 whitespace-nowrap bg-slate-50 dark:bg-[#182333]">Manager Name</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 whitespace-nowrap bg-slate-50 dark:bg-[#182333]">HOD Code</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 whitespace-nowrap bg-slate-50 dark:bg-[#182333]">HOD Name</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 whitespace-nowrap bg-slate-50 dark:bg-[#182333]">Buffer Time</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 text-center whitespace-nowrap bg-slate-50 dark:bg-[#182333]">Day Start</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 text-center whitespace-nowrap bg-slate-50 dark:bg-[#182333]">Day Close</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 text-center sticky right-0 z-30 bg-slate-50 dark:bg-[#182333] shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.4)]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => {
                  const rowKey = `${currentPage}_${idx}`;
                  const isEditing = editingKey === rowKey;

                  return (
                    <tr key={rowKey} className="hover:bg-slate-50/50 dark:hover:bg-[#2a374a]/30 transition-colors group">
                      <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.e_comp || '-'}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.brname || '-'}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.manager_code || '-'}
                      </td>
                      <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.mgrname || '-'}
                      </td>
                      {isEditing && editForm ? (
                        <>
                          <td className="px-3 py-1.5 text-xs whitespace-nowrap">
                            <input
                              type="text"
                              value={editForm.hod_code || ''}
                              onChange={(e) => setEditForm({ ...editForm, hod_code: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleFetchHod(e.currentTarget.value.trim());
                                }
                              }}
                              onBlur={(e) => handleFetchHod(e.target.value)}
                              className="w-full px-2 py-1 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none dark:text-white"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-xs whitespace-nowrap">
                            <div className="relative">
                              <input
                                type="text"
                                value={editForm.hod_name || ''}
                                onChange={(e) => setEditForm({ ...editForm, hod_name: e.target.value })}
                                disabled={fetchingHod}
                                className={`w-full px-2 py-1 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none dark:text-white ${fetchingHod ? 'opacity-70 pr-8' : ''}`}
                              />
                              {fetchingHod && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                </div>
                              )}
                              {fetchingHod && (
                                <div className="absolute bottom-[1px] left-[1px] right-[1px] h-[2px] bg-blue-100/50 dark:bg-blue-900/50 overflow-hidden rounded-b-sm pointer-events-none">
                                  <div className="h-full bg-blue-500 animate-pulse w-full"></div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-xs whitespace-nowrap">
                            <input
                              type="number"
                              value={editForm.buffer_time || ''}
                              onChange={(e) => setEditForm({ ...editForm, buffer_time: e.target.value })}
                              className="w-16 px-2 py-1 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none dark:text-white"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center whitespace-nowrap">
                            <input
                              type="time"
                              value={editForm.day_start_time}
                              onChange={(e) => setEditForm({ ...editForm, day_start_time: e.target.value })}
                              className="w-24 px-2 py-1 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center whitespace-nowrap">
                            <input
                              type="time"
                              value={editForm.day_close_time}
                              onChange={(e) => setEditForm({ ...editForm, day_close_time: e.target.value })}
                              className="w-24 px-2 py-1 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center sticky right-0 bg-white dark:bg-[#1e293b] shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.2)] transition-colors">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-6 h-6 rounded flex items-center justify-center text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                                title="Save"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="w-6 h-6 rounded flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {item.hod_code || '-'}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {item.hod_name || '-'}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {item.buffer_time || '-'}
                          </td>
                          <td className="px-3 py-1.5 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold font-mono">
                              {item.day_start_time || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold font-mono">
                              {item.day_close_time || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-center sticky right-0 bg-white dark:bg-[#1e293b] group-hover:bg-slate-50/50 dark:group-hover:bg-[#2a374a] shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.2)] transition-colors">
                            <button
                              onClick={() => handleEdit(item, idx)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                              title="Edit Cut Off Times"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="shrink-0 bg-white dark:bg-[#1e293b] border border-t-0 border-slate-200 dark:border-slate-700/60 rounded-b-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Showing <span className="font-medium text-slate-800 dark:text-white">{filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-medium text-slate-800 dark:text-white">{Math.min(currentPage * pageSize, filteredData.length)}</span> of <span className="font-medium text-slate-800 dark:text-white">{filteredData.length}</span> records
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-300 outline-none"
          >
            <option value={30}>30 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
        {totalPages > 1 && renderPagination()}
      </div>


    </div>
  );
};

export default ManagerCutOff;
