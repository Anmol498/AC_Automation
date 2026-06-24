import React, { useState, useEffect, useRef } from 'react';

interface SelectOption {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (val: any) => void;
  options: SelectOption[];
  isDark: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  isDark,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
  searchable = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Find current label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

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

  // Clear query on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (optionValue: any) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Selected Value Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full p-2.5 pr-10 border rounded-xl outline-none text-sm font-medium flex items-center justify-between text-left transition-all ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-100/50 text-slate-405 border-slate-200 dark:bg-zinc-900/50 dark:text-zinc-500 dark:border-zinc-800'
            : 'cursor-pointer'
        } ${
          !disabled && isDark 
            ? 'bg-[#18181b] border-zinc-800 text-white focus:ring-blue-500/20' 
            : !disabled
              ? 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/10 focus:border-blue-500'
              : ''
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200">
          <i className={`fa-solid fa-chevron-down text-[11px] transition-transform ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}></i>
        </span>
      </button>

      {/* Floating Options Dropdown */}
      {isOpen && (
        <div 
          className={`absolute z-[9999] mt-2 left-0 w-full max-h-[220px] overflow-y-auto rounded-2xl border shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 origin-top-left ${
            isDark 
              ? 'bg-[#1f2125] border-zinc-800 text-zinc-100 scrollbar-dark' 
              : 'bg-white border-slate-100 text-slate-800'
          }`}
        >
          {searchable && (
            <div className={`p-2 border-b sticky top-0 z-10 ${isDark ? 'bg-[#1f2125] border-zinc-800' : 'bg-white border-slate-100'}`}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className={`w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-lg outline-none border transition-all ${
                    isDark 
                      ? 'bg-[#18181b] border-zinc-850 text-white placeholder-zinc-500 focus:border-blue-500/50' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-blue-500'
                  }`}
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <i className={`fa-solid fa-magnifying-glass text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}></i>
                </div>
              </div>
            </div>
          )}
          <div className="py-1">
            {filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full px-4 py-2.5 text-sm text-left font-medium flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-blue-600/10 text-blue-500 font-bold'
                      : isDark
                        ? 'text-zinc-200 hover:bg-zinc-800'
                        : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <i className="fa-solid fa-check text-xs text-blue-500"></i>
                  )}
                </button>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className={`px-4 py-3 text-xs italic ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
