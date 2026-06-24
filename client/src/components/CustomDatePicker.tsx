import React, { useState, useEffect, useRef } from 'react';

interface CustomDatePickerProps {
  value: string; // Expected in YYYY-MM-DD format
  onChange: (val: string) => void;
  isDark: boolean;
  placeholder?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  isDark,
  placeholder = 'Select date...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM-DD to Date object or default to today
  const getParsedDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

  const selectedDate = value ? getParsedDate(value) : null;
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  // Keep view date in sync with selected date when value changes
  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (dayNum: number, currentMonth: boolean, offsetMonth: number = 0) => {
    const targetMonth = viewDate.getMonth() + offsetMonth;
    const date = new Date(viewDate.getFullYear(), targetMonth, dayNum);
    
    // Format to YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;
    
    onChange(formatted);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Generate calendar days
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const days: { day: number; currentMonth: boolean; offset: number }[] = [];

  // Previous month offset days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      day: prevMonthTotalDays - i,
      currentMonth: false,
      offset: -1
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    days.push({
      day: i,
      currentMonth: true,
      offset: 0
    });
  }

  // Next month offset days to pad grid to multiples of 7
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      day: i,
      currentMonth: false,
      offset: 1
    });
  }

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Format value for text input display: "MM/DD/YYYY"
  const getDisplayValue = () => {
    if (!selectedDate || !value) return '';
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const yyyy = selectedDate.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          readOnly
          placeholder={placeholder}
          onClick={() => setIsOpen(!isOpen)}
          value={getDisplayValue()}
          className={`w-full p-2.5 pr-10 border rounded-xl outline-none text-sm font-medium cursor-pointer transition-all ${
            isDark 
              ? 'bg-[#18181b] border-zinc-800 text-white focus:ring-blue-500/20 placeholder-zinc-500' 
              : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/10 focus:border-blue-500 placeholder-slate-400'
          }`}
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <i className={`fa-regular fa-calendar text-sm ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}></i>
        </div>
      </div>

      {isOpen && (
        <div 
          className={`absolute z-[9999] mt-2 left-0 w-[290px] p-4 rounded-2xl border shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 origin-top-left ${
            isDark 
              ? 'bg-[#1f2125] border-zinc-800 text-zinc-100' 
              : 'bg-white border-slate-100 text-slate-800'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button 
              type="button" 
              onClick={handlePrevMonth}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              <i className="fa-solid fa-chevron-left text-[11px]"></i>
            </button>
            <span className="font-bold text-xs tracking-wide">
              {monthsList[month]} {year}
            </span>
            <button 
              type="button" 
              onClick={handleNextMonth}
              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              <i className="fa-solid fa-chevron-right text-[11px]"></i>
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {weekdays.map((wd) => (
              <span key={wd} className={`text-[10px] font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                {wd}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map(({ day: dayNum, currentMonth, offset }, idx) => {
              const dateObj = new Date(year, month + offset, dayNum);
              const isSelected = selectedDate && 
                selectedDate.getDate() === dayNum && 
                selectedDate.getMonth() === (month + offset) && 
                selectedDate.getFullYear() === year;
              
              const isToday = new Date().getDate() === dayNum && 
                new Date().getMonth() === (month + offset) && 
                new Date().getFullYear() === year;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDateSelect(dayNum, currentMonth, offset)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all flex items-center justify-center relative ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                      : isToday
                        ? isDark 
                          ? 'border border-blue-500 text-blue-400' 
                          : 'border border-blue-600 text-blue-600'
                        : currentMonth
                          ? isDark
                            ? 'text-zinc-200 hover:bg-zinc-850'
                            : 'text-slate-700 hover:bg-slate-100'
                          : isDark
                            ? 'text-zinc-600 hover:bg-zinc-850/50'
                            : 'text-slate-350 hover:bg-slate-50'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className={`mt-4 pt-3 border-t flex items-center justify-between ${
            isDark ? 'border-zinc-800' : 'border-slate-100'
          }`}>
            <button
              type="button"
              onClick={handleClear}
              className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="text-[10px] font-bold uppercase tracking-wider text-blue-500 hover:text-blue-600 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
