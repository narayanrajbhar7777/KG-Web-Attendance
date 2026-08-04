import React, { useState, useEffect, useMemo } from 'react';
import { Search, Edit2, Trash2, X, Save, RefreshCw, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import Select, { components } from 'react-select';
import { toast } from 'react-hot-toast';
import { fetchWorkerCutoff, insertWorkerCutoff, updateWorkerCutoff, deleteWorkerCutoff } from '../../../api';
import Loader from '../../../components/Loader';
import { useAuth } from '../../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import type { WorkerCutOffData } from '../../../types';

const CustomOption = (props: any) => {
  return (
    <components.Option {...props}>
      <div className="flex items-center gap-2">
        {props.isSelected ? (<CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />) : (<Square className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />)}
        <span className="truncate">{props.label}</span>
      </div>
    </components.Option>
  );
};

const customSelectClassNames = {
  control: (state: any) => `flex items-center justify-between px-2 h-[38px] w-full xl:w-[280px] bg-slate-50 dark:bg-[#0b1120] border rounded-lg text-sm transition-colors cursor-pointer shrink-0 ${state.isFocused ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-slate-500'}`,
  menu: () => 'absolute z-50 w-full mt-1 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden',
  menuList: () => 'max-h-[300px] overflow-y-auto custom-scrollbar',
  option: (state: any) => `px-3 py-2 text-sm cursor-pointer transition-colors truncate ${state.isSelected ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium' : state.isFocused ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' : 'text-slate-700 dark:text-slate-300'}`,
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
  React.Children.forEach(children, (child: any) => { if (child && child.props && child.props.data) { } else { otherChildren.push(child); } });
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
    const handleClickOutside = (event: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) { setIsOpen(false); } };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  const handleSelectAll = () => onChange(options.map((o: any) => o.value));
  const handleClearAll = () => onChange([]);

  const MenuList = (props: any) => (
    <components.MenuList {...props}>
      <div className="flex justify-between items-center px-3 py-2 border-b border-slate-100 dark:border-slate-700/50 sticky top-0 bg-white dark:bg-[#1e293b] z-10">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectAll(); }}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
        >
          Select All
        </button>
        <button
          type="button"
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

const WorkerCutOff: React.FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  const [cutoffList, setCutoffList] = useState<WorkerCutOffData[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [filterCompany, setFilterCompany] = useState<string[]>([]);
  const [filterBranch, setFilterBranch] = useState<string[]>([]);
  const [filterManager, setFilterManager] = useState<string[]>([]);
  const [filterWorker, setFilterWorker] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCutoff, setSelectedCutoff] = useState<WorkerCutOffData | null>(null);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<WorkerCutOffData | null>(null);
  const [saving, setSaving] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchWorkerCutoff({ manager_code: user?.code || '' });
      const empList = user?.employee_list || [];
      const enrichedList = empList.map((emp: any) => {
        const cutoff = data.find((d: WorkerCutOffData) => d.worker_code === emp.e_code);
        return {
          e_comp: emp.e_comp || user?.code || '',
          brname: emp.s_mgrcomp || '',
          manager_code: emp.manager_code || emp.s_mgrcd || user?.code || '',
          mgrname: emp.mgrname || user?.name || '',
          worker_code: emp.e_code,
          worker_name: emp.e_name,
          designation: emp.e_desg || '',
          extend_for: cutoff ? cutoff.extend_for : '',
          day_start_time: cutoff ? cutoff.day_start_time : '',
          day_close_time: cutoff ? cutoff.day_close_time : '',
          _isNew: !cutoff
        };
      });

      setCutoffList(enrichedList);
    } catch (err) {
      toast.error('Unable to fetch worker cutoff data.');
    } finally {
      setLoading(false);
    }
  };

  const [fetchingWorker, setFetchingWorker] = useState(false);
  const handleFetchWorker = async (code: string) => {
    if (!code) return;
    try {
      setFetchingWorker(true);
      const currentEmployee = user?.employee_list?.find(emp => emp.e_code === code);
      if (currentEmployee) {
        setEditForm(prev => prev ? { ...prev, worker_name: currentEmployee.e_name, mgrname: currentEmployee.mgrname || user?.name || '' } : null);
        setSelectedCutoff(prev => prev ? { ...prev, worker_name: currentEmployee.e_name, mgrname: currentEmployee.mgrname || user?.name || '' } : null);
        toast.success('Worker Name auto-fetched successfully');
      } else {
        toast.error('Failed to fetch Worker details');
      }
    } catch (error) {
      toast.error('Failed to fetch Worker details');
    } finally {
      setFetchingWorker(false);
    }
  };

  const handleEdit = (record: WorkerCutOffData, idx: number) => {
    setEditingKey(`${currentPage}_${idx}`);
    setEditForm({ ...record });
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditForm(null);
  };

  const handleDeleteClick = (record: WorkerCutOffData) => {
    setSelectedCutoff(record);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCutoff) return;
    try {
      setDeleting(true);
      const payload = {
        e_comp: selectedCutoff.e_comp,
        brname: selectedCutoff.brname,
        manager_code: selectedCutoff.manager_code,
        worker_code: selectedCutoff.worker_code
      };
      const response = await deleteWorkerCutoff(payload);
      if (response && response.status === 'success') {
        toast.success('Worker cutoff deleted successfully');
        setIsDeleteModalOpen(false);
        await loadData();
      } else {
        toast.error('Unable to delete worker cutoff');
      }
    } catch (err) {
      toast.error('Unable to delete worker cutoff');
    } finally {
      setDeleting(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedWorkers.length === 0) return;
    try {
      setDeleting(true);
      const payloads = selectedWorkers.map(code => {
        const emp = filteredData.find(d => d.worker_code === code);
        return {
          e_comp: emp?.e_comp || user?.code || '',
          brname: emp?.brname || '',
          manager_code: emp?.manager_code || user?.code || '',
          worker_code: code
        };
      });
      const response = await deleteWorkerCutoff(payloads);
      if (response && (response.status === 'success' || response.MgrWkrExtendList)) {
        toast.success('Worker cutoffs deleted successfully');
        setIsBulkDeleteModalOpen(false);
        setIsModalOpen(false);
        setSelectedWorkers([]);
        await loadData();
      } else {
        toast.error('Unable to delete worker cutoffs');
      }
    } catch (err) {
      toast.error('Unable to delete worker cutoffs');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedWorkers(filteredData.map(d => d.worker_code));
    } else {
      setSelectedWorkers([]);
    }
  };

  const handleSelectWorker = (code: string) => {
    setSelectedWorkers(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleOpenBulkAdd = () => {
    if (selectedWorkers.length === 0) return;

    // If only one is selected, try to pre-fill
    if (selectedWorkers.length === 1) {
      const code = selectedWorkers[0];
      const record = filteredData.find(d => d.worker_code === code);
      if (record) {
        setSelectedCutoff({ ...record });
        setIsModalOpen(true);
        return;
      }
    }

    // Multiple selected or single not found
    setSelectedCutoff({
      e_comp: user?.code || '',
      brname: '',
      manager_code: user?.code || '',
      mgrname: '',
      worker_code: 'MULTIPLE',
      worker_name: 'Multiple Employees Selected',
      designation: '',
      day_start_time: '',
      day_close_time: '',
      extend_for: '',
      apply_worker_rule: true,
      apply_cut_off_time: true,
      _isNew: true
    });
    setIsModalOpen(true);
  };

  const handleAddSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCutoff) return;

    if ((!selectedCutoff.e_comp || !selectedCutoff.brname || !selectedCutoff.manager_code || !selectedCutoff.worker_code || !selectedCutoff.day_start_time || !selectedCutoff.day_close_time || !selectedCutoff.extend_for) && selectedCutoff.worker_code !== 'MULTIPLE') {
      toast.error('All fields are required.');
      return;
    }

    if (selectedCutoff.worker_code === 'MULTIPLE' && (!selectedCutoff.day_start_time || !selectedCutoff.day_close_time || !selectedCutoff.extend_for)) {
      toast.error('All time fields are required.');
      return;
    }

    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(selectedCutoff.day_start_time)) {
      toast.error('Invalid Day Start Time format. Use HH:mm');
      return;
    }
    if (!timeRegex.test(selectedCutoff.day_close_time)) {
      toast.error('Invalid Day Close Time format. Use HH:mm');
      return;
    }
    if (selectedCutoff.day_close_time <= selectedCutoff.day_start_time) {
      toast.error('Day Close Time must be greater than Day Start Time.');
      return;
    }



    try {
      setSaving(true);
      let payloads: any[] = [];

      if (selectedWorkers.length > 1 && selectedCutoff.worker_code === 'MULTIPLE') {
        payloads = selectedWorkers.map(code => {
          const emp = filteredData.find(d => d.worker_code === code);
          return {
            e_comp: emp?.e_comp || user?.code || '',
            brname: emp?.brname || '',
            manager_code: emp?.manager_code || user?.code || '',
            worker_code: code,
            day_start_time: selectedCutoff.day_start_time,
            day_close_time: selectedCutoff.day_close_time,
            extend_for: selectedCutoff.extend_for || '-',
            apply_worker_rule: !!selectedCutoff.apply_worker_rule,
            apply_cut_off_time: !!selectedCutoff.apply_cut_off_time
          };
        });
      } else {
        payloads = [{
          e_comp: selectedCutoff.e_comp,
          brname: selectedCutoff.brname,
          manager_code: selectedCutoff.manager_code,
          worker_code: selectedCutoff.worker_code,
          day_start_time: selectedCutoff.day_start_time,
          day_close_time: selectedCutoff.day_close_time,
          extend_for: selectedCutoff.extend_for || '-',
          apply_worker_rule: !!selectedCutoff.apply_worker_rule,
          apply_cut_off_time: !!selectedCutoff.apply_cut_off_time
        }];
      }

      const response = await insertWorkerCutoff(payloads);
      if (response && (response.status === 'success' || response.MgrWkrExtendList)) {
        toast.success('Worker cutoff saved successfully');
        setIsModalOpen(false);
        setSelectedWorkers([]);
        await loadData();
      } else {
        toast.error('Unable to save worker cutoff');
      }
    } catch (err) {
      toast.error('Unable to save worker cutoff');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
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
        worker_code: editForm.worker_code,
        day_start_time: editForm.day_start_time,
        day_close_time: editForm.day_close_time,
        extend_for: editForm.extend_for || '-',
        apply_worker_rule: !!editForm.apply_worker_rule,
        apply_cut_off_time: !!editForm.apply_cut_off_time
      };

      const response = editForm._isNew ? await insertWorkerCutoff(payload) : await updateWorkerCutoff(payload);

      if (response && (response.status === 'success' || response.MgrWkrExtendList)) {
        toast.success('Worker cutoff updated successfully');
        setEditingKey(null);
        setEditForm(null);
        await loadData();
      } else {
        toast.error('Unable to update worker cutoff');
      }
    } catch (err) {
      toast.error('Unable to update worker cutoff');
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchText('');
    setFilterCompany([]);
    setFilterBranch([]);
    setFilterManager([]);
    setFilterWorker([]);
    setCurrentPage(1);
    setSelectedWorkers([]);
  };

  const companies = useMemo(() => Array.from(new Set(cutoffList.map(c => c.e_comp).filter(Boolean))), [cutoffList]);
  const branches = useMemo(() => Array.from(new Set(cutoffList.map(c => c.brname).filter(Boolean))), [cutoffList]);
  const managers = useMemo(() => Array.from(new Set(cutoffList.map(c => c.mgrname).filter(Boolean))), [cutoffList]);

  const filteredData = useMemo(() => {
    return cutoffList.filter(item => {
      const matchSearch =
        item.worker_code?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.worker_name?.toLowerCase().includes(searchText.toLowerCase());

      const matchesCompany = filterCompany.length === 0 || filterCompany.includes(item.e_comp);
      const matchesBranch = filterBranch.length === 0 || filterBranch.includes(item.brname);
      const matchesManager = filterManager.length === 0 || filterManager.includes(item.mgrname);
      const matchesWorker = filterWorker.length === 0 || filterWorker.includes(item.worker_code);

      return matchSearch && matchesCompany && matchesBranch && matchesManager && matchesWorker;
    });
  }, [cutoffList, searchText, filterCompany, filterBranch, filterManager, filterWorker]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedWorkers([]);
  }, [searchText, filterCompany, filterBranch, filterManager, filterWorker]);

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
        <p className="mt-4 text-slate-500 font-medium">Loading Worker Cut Off...</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-104px)] md:h-[calc(100vh-120px)] animate-fadeIn overflow-hidden">
      {/* Filters Area (Fixed) */}
      <div className="shrink-0 bg-white dark:bg-[#1e293b] p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/60 mb-4 flex flex-col xl:flex-row gap-3 items-center relative z-40">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white whitespace-nowrap hidden md:block">Worker Cut Off</h1>
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
              placeholder="Search by employee code or name..."
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
            Clear
          </button>
          <button
            onClick={handleOpenBulkAdd}
            disabled={selectedWorkers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            Add Cut Off
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 bg-white dark:bg-[#1e293b] rounded-t-2xl shadow-sm border-t border-l border-r border-slate-200 dark:border-slate-700/60 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-[#182333] shadow-sm">
              <tr>
                <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#182333] w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredData.length > 0 && selectedWorkers.length === filteredData.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 whitespace-nowrap bg-slate-50 dark:bg-[#182333]">Emp Code</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 whitespace-nowrap bg-slate-50 dark:bg-[#182333]">Emp Name</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 text-center whitespace-nowrap bg-slate-50 dark:bg-[#182333]">Day Start</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 text-center whitespace-nowrap bg-slate-50 dark:bg-[#182333]">Day Close</th>
                <th className="px-3 py-2 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 whitespace-nowrap bg-slate-50 dark:bg-[#182333]">Extend For</th>
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
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedWorkers.includes(item.worker_code)}
                          onChange={() => handleSelectWorker(item.worker_code)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                        />
                      </td>
                      {isEditing && editForm ? (
                        <>
                          <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                            {item.worker_code || '-'}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                            {item.worker_name || '-'}
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
                          <td className="px-3 py-1.5 text-xs whitespace-nowrap">
                            <input
                              type="text"
                              value={editForm.extend_for}
                              onChange={(e) => setEditForm({ ...editForm, extend_for: e.target.value })}
                              className="w-full min-w-[150px] px-2 py-1 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none dark:text-white"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center sticky right-0 bg-white dark:bg-[#1e293b] shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.2)] transition-colors">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={handleEditSave}
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
                          <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">{item.worker_code || '-'}</td>
                          <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">{item.worker_name || '-'}</td>
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
                          <td className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{item.extend_for || '-'}</td>
                          <td className="px-3 py-1.5 text-center sticky right-0 bg-white dark:bg-[#1e293b] group-hover:bg-slate-50/50 dark:group-hover:bg-[#2a374a] shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] dark:shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.2)] transition-colors flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEdit(item, idx)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add Modal */}
      {isModalOpen && selectedCutoff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slideUp">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700/60">
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">Add Worker Cut Off</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Code (Worker)</label>
                  <input
                    type="text"
                    required
                    value={selectedCutoff.worker_code}
                    onChange={(e) => setSelectedCutoff({ ...selectedCutoff, worker_code: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFetchWorker(e.currentTarget.value.trim());
                      }
                    }}
                    onBlur={(e) => handleFetchWorker(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Name (Worker)</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={selectedCutoff.worker_code === 'MULTIPLE' ? `${selectedWorkers.length} Employees Selected` : selectedCutoff.worker_name || ''}
                      onChange={(e) => setSelectedCutoff({ ...selectedCutoff, worker_name: e.target.value })}
                      disabled={fetchingWorker || selectedCutoff.worker_code === 'MULTIPLE'}
                      className={`w-full px-3 py-2 bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all ${fetchingWorker || selectedCutoff.worker_code === 'MULTIPLE' ? 'opacity-70 pr-8' : ''}`}
                    />
                    {fetchingWorker && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Extend For</label>
                  <input
                    type="text"
                    required
                    value={selectedCutoff.extend_for}
                    onChange={(e) => setSelectedCutoff({ ...selectedCutoff, extend_for: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="applyWorkerRule"
                    checked={!!selectedCutoff.apply_worker_rule}
                    onChange={(e) => setSelectedCutoff({ ...selectedCutoff, apply_worker_rule: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                  />
                  <label htmlFor="applyWorkerRule" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Apply Worker Rule</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="applyCutOffTime"
                    checked={!!selectedCutoff.apply_cut_off_time}
                    onChange={(e) => setSelectedCutoff({ ...selectedCutoff, apply_cut_off_time: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                  />
                  <label htmlFor="applyCutOffTime" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Apply Cut Off Time</label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Day Start (HH:mm)</label>
                  <input
                    type="time"
                    required
                    value={selectedCutoff.day_start_time}
                    onChange={(e) => setSelectedCutoff({ ...selectedCutoff, day_start_time: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all shadow-sm [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Day Close (HH:mm)</label>
                  <input
                    type="time"
                    required
                    value={selectedCutoff.day_close_time}
                    onChange={(e) => setSelectedCutoff({ ...selectedCutoff, day_close_time: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all shadow-sm [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                {selectedCutoff.worker_code === 'MULTIPLE' && (
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    disabled={saving || deleting}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slideUp">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Delete Multiple Cut Offs</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Are you sure you want to delete the worker cutoff extension for <b>{selectedWorkers.length}</b> selected workers?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmBulkDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedCutoff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slideUp">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">Delete Worker Cut Off</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Are you sure you want to delete this worker cutoff extension for worker <b>{selectedCutoff.worker_code}</b>?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-medium transition-all"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerCutOff;
