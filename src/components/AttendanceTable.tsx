import React, { useState, useMemo } from 'react';
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  sortFn?: (a: T, b: T) => number;
}

interface AttendanceTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchable?: boolean;
  searchFn?: (item: T, query: string) => boolean;
  searchPlaceholder?: string;
  pagination?: boolean;
  itemsPerPage?: number;
  className?: string;
  customTopRight?: React.ReactNode;
  customTopLeft?: React.ReactNode;
  customBottomLeft?: React.ReactNode;
}

export function AttendanceTable<T>({
  data,
  columns,
  searchable = false,
  searchFn,
  searchPlaceholder = 'Search...',
  pagination = true,
  itemsPerPage = 10,
  className = '',
  customTopRight,
  customTopLeft,
  customBottomLeft
}: AttendanceTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    if (!searchable || !searchQuery || !searchFn) return data;
    return data.filter(item => searchFn(item, searchQuery));
  }, [data, searchable, searchQuery, searchFn]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const column = columns.find(c => c.key === sortKey);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      let result = 0;
      if (column.sortFn) {
        result = column.sortFn(a, b);
      } else {
        const aVal = (a as any)[sortKey];
        const bVal = (b as any)[sortKey];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          result = aVal.localeCompare(bVal);
        } else if (aVal < bVal) {
          result = -1;
        } else if (aVal > bVal) {
          result = 1;
        }
      }
      return sortOrder === 'asc' ? result : -result;
    });
  }, [filteredData, sortKey, sortOrder, columns]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const currentData = pagination
    ? sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : sortedData;

  const handleSort = (key: string) => {
    const column = columns.find(c => c.key === key);
    if (!column?.sortable) return;

    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (key: string) => {
    const column = columns.find(c => c.key === key);
    if (!column?.sortable) return null;

    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 ml-1 inline-block opacity-0 group-hover:opacity-40 transition-opacity" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 inline-block text-blue-500" />
      : <ArrowDown className="w-3 h-3 ml-1 inline-block text-blue-500" />;
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-[#0b1120] rounded-xl border border-slate-200 dark:border-slate-800/60 overflow-hidden shadow-sm ${className}`}>
      {(searchable || customTopRight || customTopLeft) && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-[#182333]/30 flex justify-between items-center gap-4 flex-wrap">
          <div className="flex-1 flex items-center">
            {customTopLeft}
          </div>
          <div className="flex items-center gap-4">
            {customTopRight}
            {searchable && (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-1.5 bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white transition-all placeholder:text-slate-400"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="bg-slate-50 dark:bg-[#1e293b] text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-700/60 transition-colors sticky top-0 z-10 shadow-sm">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`py-2.5 px-6 ${col.sortable ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-[#2a374a] transition-colors group' : ''}`}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center">
                    {col.label} {renderSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-slate-500 dark:text-slate-400">
                  No records found.
                </td>
              </tr>
            ) : (
              currentData.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-[#2a374a]/30 transition-colors group">
                  {columns.map(col => (
                    <td key={col.key} className="py-2.5 px-6">
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between bg-white dark:bg-[#1e293b]">
          <div className="flex items-center gap-4">
            {customBottomLeft}
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Showing <span className="font-bold text-slate-800 dark:text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{sortedData.length}</span> entries
            </p>
          </div>
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
  );
}
