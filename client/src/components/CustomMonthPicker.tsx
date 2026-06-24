import React, { useState, useEffect, useRef } from 'react';

interface CustomMonthPickerProps {
  value: string; // Expected in YYYY-MM format
  onChange: (val: string) => void;
  isDark: boolean;
  min?: string; // YYYY-MM format
  max?: string; // YYYY-MM format
  placeholder?: string;
  align?: 'left' | 'right';
}

const CustomMonthPicker: React.FC<CustomMonthPickerProps> = ({
  value,
  onChange,
  isDark,
  min = '',
  max = '',
  placeholder = 'Select month...',
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine current year and month for viewing
  const getInitialYear = () => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 2) {
        return parseInt(parts[0], 10);
      }
    }
    return new Date().getFullYear();
  };

  const [viewYear, setViewYear] = useState(getInitialYear);

  // Sync view year with selected value if value changes
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 2) {
        setViewYear(parseInt(parts[0], 10));
      }
    }
  }, [value]);

  // Click outside listener to close the popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevYear = () => {
    setViewYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setViewYear(prev => prev + 1);
  };

  const handleMonthSelect = (monthIdx: number) => {
    const mm = String(monthIdx + 1).padStart(2, '0');
    const formatted = `${viewYear}-${mm}`;
    
    // Check if within bounds before calling onChange
    if (isMonthDisabled(monthIdx)) return;

    onChange(formatted);
    setIsOpen(false);
  };

  const isMonthDisabled = (monthIdx: number) => {
    const mm = String(monthIdx + 1).padStart(2, '0');
    const currentMonthVal = `${viewYear}-${mm}`;

    if (min && currentMonthVal < min) return true;
    if (max && currentMonthVal > max) return true;

    return false;
  };

  const getDisplayValue = () => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length !== 2) return value;
    const yyyy = parts[0];
    const mm = parts[1];
    
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const monthIdx = parseInt(mm, 10) - 1;
    const monthStr = monthNames[monthIdx] || '';
    
    return `${monthStr} ${yyyy}`;
  };

  const monthsList = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          readOnly
          placeholder={placeholder}
          onClick={() => setIsOpen(!isOpen)}
          value={getDisplayValue()}
          className={`w-28 md:w-32 p-2 pr-8 border rounded-xl outline-none text-[10px] md:text-xs font-bold cursor-pointer transition-all ${
            isDark 
              ? 'bg-[#18181b] border-zinc-800 text-white focus:ring-blue-500/20 placeholder-zinc-500 hover:border-zinc-700' 
              : 'bg-white border-slate-200 text-slate-700 focus:ring-blue-500/10 focus:border-blue-500 placeholder-slate-400 hover:border-slate-350'
          }`}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <i className={`fa-regular fa-calendar text-[10px] md:text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}></i>
        </div>
      </div>

      {isOpen && (
        <div 
          className={`absolute z-[9999] mt-2 w-[240px] p-3 rounded-2xl border shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 ${
            align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          } ${
            isDark 
              ? 'bg-[#1f2125] border-zinc-800 text-zinc-100' 
              : 'bg-white border-slate-100 text-slate-800'
          }`}
        >
          {/* Header to Select Year */}
          <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-100 dark:border-zinc-800">
            <button 
              type="button" 
              onClick={handlePrevYear}
              className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              <i className="fa-solid fa-chevron-left text-[9px]"></i>
            </button>
            <span className="font-bold text-xs tracking-wider">
              {viewYear}
            </span>
            <button 
              type="button" 
              onClick={handleNextYear}
              className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              <i className="fa-solid fa-chevron-right text-[9px]"></i>
            </button>
          </div>

          {/* Months Grid */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {monthsList.map((monthName, idx) => {
              const isDisabled = isMonthDisabled(idx);
              
              const currentVal = `${viewYear}-${String(idx + 1).padStart(2, '0')}`;
              const isSelected = value === currentVal;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleMonthSelect(idx)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/20'
                      : isDisabled
                        ? isDark
                          ? 'text-zinc-700 cursor-not-allowed opacity-30'
                          : 'text-slate-300 cursor-not-allowed opacity-40'
                        : isDark
                          ? 'text-zinc-200 hover:bg-zinc-800'
                          : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {monthName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomMonthPicker;
