import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
                Page <span className="text-slate-800">{currentPage}</span> of <span className="text-slate-800">{totalPages}</span>
            </p>
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                </button>
            </div>
        </div>
    );
};

export default Pagination;
