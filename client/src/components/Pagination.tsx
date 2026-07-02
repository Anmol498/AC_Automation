import React, { useState } from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    isDark?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, isDark = false }) => {
    const [jumpValue, setJumpValue] = useState('');

    if (totalPages <= 1) return null;

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    const handleJumpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pageNum = parseInt(jumpValue, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            onPageChange(pageNum);
            setJumpValue('');
        }
    };

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t gap-4 transition-colors ${
            isDark 
                ? 'bg-[var(--color-card-dark)] border-[var(--color-border-dark)]' 
                : 'bg-slate-50 border-slate-100'
        }`}>
            <p className={`text-xs font-bold uppercase tracking-widest leading-none ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                Page <span className={isDark ? 'text-zinc-200' : 'text-slate-800'}>{currentPage}</span> of <span className={isDark ? 'text-zinc-200' : 'text-slate-800'}>{totalPages}</span>
            </p>
            <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-end">
                <div className="flex gap-2">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                            isDark 
                                ? 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-blue-400' 
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600'
                        }`}
                        title="Previous Page"
                    >
                        <i className="fa-solid fa-chevron-left text-xs"></i>
                    </button>
                    <div className="flex gap-1.5 mx-1">
                        {pages.map(page => (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-black transition-all shadow-sm ${
                                    currentPage === page
                                        ? 'bg-blue-600 text-white shadow-blue-500/20'
                                        : isDark
                                            ? 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-blue-400'
                                            : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                            isDark 
                                ? 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-blue-400' 
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600'
                        }`}
                        title="Next Page"
                    >
                        <i className="fa-solid fa-chevron-right text-xs"></i>
                    </button>
                </div>
                
                {/* Jump to Page Form */}
                <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 border-l pl-3 border-slate-200 dark:border-zinc-800">
                    <span className={`text-[10px] uppercase font-bold tracking-widest leading-none ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Jump to</span>
                    <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={jumpValue}
                        onChange={(e) => setJumpValue(e.target.value)}
                        placeholder="..."
                        className={`w-11 h-9 text-center border rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/25 ${
                            isDark 
                                ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-600' 
                                : 'bg-white border-slate-200 text-slate-700 placeholder-slate-300 focus:border-blue-500'
                        }`}
                    />
                    <button
                        type="submit"
                        disabled={!jumpValue || parseInt(jumpValue, 10) < 1 || parseInt(jumpValue, 10) > totalPages}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                            isDark 
                                ? 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-blue-500 hover:text-blue-400' 
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600'
                        }`}
                        title="Go to Page"
                    >
                        <i className="fa-solid fa-arrow-right text-xs"></i>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Pagination;
