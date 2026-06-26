import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AppContext';
import { api } from '../lib/api';
import { useRealtimeListener } from '../components/RealtimeProvider';
import Pagination from '../components/Pagination';
import { toast } from 'sonner';
import CustomDatePicker from '../components/CustomDatePicker';



interface DailyWorkLog {
    id: number;
    job_id: number;
    date: string;
    work_description: string;
    qty: string;
    technician: string;
    remarks: string;
    address: string;
}

export default function DailyWork() {
    const { token } = useAuth();
    const { isDark = false } = useOutletContext<{ isDark?: boolean }>() || {};
    const [logs, setLogs] = useState<DailyWorkLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;


    // Inline editing state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ date: '', work_description: '', qty: '', technician: '', remarks: '', address: '' });

    // New row form
    const [newRow, setNewRow] = useState<Partial<DailyWorkLog>>({ date: new Date().toISOString().split('T')[0], work_description: '', qty: '1', technician: '', remarks: '', address: '' });
    const [showNewRow, setShowNewRow] = useState(false);
    const [editRowId, setEditRowId] = useState<number | null>(null);
    const [editRowData, setEditRowData] = useState<Partial<DailyWorkLog>>({});

    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await api.get('/daily-work');
            setLogs(data);
        } catch (err) {
            console.error('Failed to fetch daily work logs', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    useRealtimeListener('work', fetchLogs);

    const handleAddRow = async () => {
        if (!newRow.date) {
            toast.error('Date is required');
            return;
        }
        try {
            await api.post('/daily-work', newRow);
            toast.success('Daily work entry added successfully!');
            setNewRow({ date: new Date().toISOString().split('T')[0], work_description: '', qty: '1', technician: '', remarks: '', address: '' });
            setShowNewRow(false);
            fetchLogs();
        } catch (err) {
            toast.error('Failed to add entry');
        }
    };

    const handleStartEdit = (log: DailyWorkLog) => {
        setEditingId(log.id);
        setEditForm({
            date: new Date(log.date).toISOString().split('T')[0],
            work_description: log.work_description || '',
            qty: log.qty || '',
            technician: log.technician || '',
            remarks: log.remarks || '',
            address: log.address || ''
        });
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        try {
            await api.put(`/daily-work/${editingId}`, editForm);
            toast.success('Daily work entry updated successfully!');
            setEditingId(null);
            fetchLogs();
        } catch (err) {
            toast.error('Failed to update entry');
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
    };

    const handleDelete = (id: number) => {
        toast.error("Delete daily work entry?", {
            description: "Are you sure you want to delete this entry? This action cannot be undone.",
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await api.delete(`/daily-work/${id}`);
                        toast.success("Entry deleted successfully!");
                        fetchLogs();
                    } catch (err) {
                        toast.error('Failed to delete entry');
                    }
                }
            }
        });
    };

    const filteredLogs = logs.filter(log =>
        (log.technician || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.work_description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.address || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


    const exportToCSV = () => {
        if (!filteredLogs.length) {
            toast.error('No data to export.');
            return;
        }

        const headers = ['Date', 'Work Description', 'Qty', 'Technician', 'Address', 'Remarks'];
        const rows = filteredLogs.map(log => [
            new Date(log.date).toLocaleDateString(),
            `"${(log.work_description || '').replace(/"/g, '""')}"`,
            `"${(log.qty || '0').replace(/"/g, '""')}"`,
            `"${(log.technician || '').replace(/"/g, '""')}"`,
            `"${(log.address || '').replace(/"/g, '""')}"`,
            `"${(log.remarks || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Daily_Work_Logs_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>Daily Work</h1>
                <p className={`${isDark ? 'text-zinc-400' : 'text-slate-500'} text-sm mt-1`}>Track daily work activities.</p>
            </div>

            {/* Excel-like Table */}
            <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-[#242427] border-zinc-800' : 'bg-white border-slate-200'}`}>
                {/* Toolbar */}
                <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 border-b gap-4 ${isDark ? 'bg-[#1e1e21] border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest min-w-max ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Work Log</h3>

                    <div className="flex flex-1 items-center justify-end gap-3 w-full sm:w-auto">
                        <div className="relative flex items-center">
                            {!isSearchExpanded && !searchTerm ? (
                                <button
                                    onClick={() => { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                                    className={`w-9 h-9 border rounded-lg flex items-center justify-center transition-all shadow-sm ${
                                        isDark 
                                            ? 'bg-[#242427] border-zinc-800 text-zinc-400 hover:text-blue-400 hover:border-zinc-700' 
                                            : 'bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300'
                                    }`}
                                    title="Search"
                                >
                                    <i className="fa-solid fa-magnifying-glass text-xs"></i>
                                </button>
                            ) : (
                                <div className="relative group animate-in fade-in slide-in-from-right-2 duration-200">
                                    <i className={`fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 transition-colors text-xs ${
                                        isDark ? 'text-zinc-505 text-zinc-400 group-focus-within:text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'
                                    }`}></i>
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="Search tech, work or address..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onBlur={() => { if (!searchTerm) setIsSearchExpanded(false); }}
                                        className={`w-full sm:w-56 pl-8 pr-8 py-2 border rounded-lg text-sm transition-all placeholder:text-slate-450 focus:outline-none focus:ring-2 ${
                                            isDark 
                                                ? 'bg-[#242427] border-zinc-800 text-white placeholder-zinc-500 focus:ring-blue-500/20 focus:border-zinc-700' 
                                                : 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:ring-blue-500/20 focus:border-blue-500'
                                        }`}
                                    />
                                    {searchTerm && (
                                        <button
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                        >
                                            <i className="fa-solid fa-xmark text-xs"></i>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={exportToCSV}
                                disabled={filteredLogs.length === 0}
                                className={`px-4 py-2 border font-bold text-xs rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 ${
                                    isDark 
                                        ? 'bg-[#242427] text-emerald-400 border-emerald-950/40 hover:bg-emerald-900/20' 
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                }`}
                            >
                                <i className="fa-solid fa-file-csv"></i> Export CSV
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowNewRow(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                            >
                                <i className="fa-solid fa-plus"></i> Add Entry
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className={`${isDark ? 'bg-[#1e1e21] text-zinc-400' : 'bg-slate-100 text-slate-500'} text-[10px] uppercase font-black tracking-wider`}>
                            <tr>
                                <th className={`p-3 pl-5 border-b border-r w-10 text-center ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>#</th>
                                <th className={`p-3 border-b border-r w-[120px] ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Date</th>
                                <th className={`p-3 border-b border-r min-w-[200px] ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Work Description</th>
                                <th className={`p-3 border-b border-r w-16 text-center ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Qty</th>
                                <th className={`p-3 border-b border-r w-[140px] ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Technician</th>
                                <th className={`p-3 border-b border-r min-w-[180px] ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Address</th>
                                <th className={`p-3 border-b border-r min-w-[180px] ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Remarks</th>
                                <th className={`p-3 border-b w-24 text-center ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-zinc-800 bg-[#242427]' : 'divide-slate-100 bg-white'}`}>
                            {/* New Row Input */}
                            {showNewRow && (
                                <tr className={`${isDark ? 'bg-blue-950/20' : 'bg-blue-50/50'} animate-in fade-in duration-200`}>
                                    <td className={`p-2 pl-5 border-r text-center font-bold text-xs ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-100 text-slate-400'}`}>
                                        <i className="fa-solid fa-asterisk text-blue-400"></i>
                                    </td>
                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                        <CustomDatePicker
                                            value={newRow.date || ''}
                                            onChange={val => setNewRow({ ...newRow, date: val })}
                                            isDark={isDark}
                                            placeholder="Select date..."
                                        />
                                    </td>
                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                        <input
                                            type="text"
                                            value={newRow.work_description}
                                            onChange={e => setNewRow({ ...newRow, work_description: e.target.value })}
                                            placeholder="Describe work done..."
                                            className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${
                                                isDark 
                                                    ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' 
                                                    : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'
                                            }`}
                                        />
                                    </td>
                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                        <input
                                            type="text"
                                            value={newRow.qty}
                                            onChange={e => setNewRow({ ...newRow, qty: e.target.value })}
                                            placeholder="0"
                                            className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium text-center focus:ring-2 outline-none ${
                                                isDark 
                                                    ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' 
                                                    : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'
                                            }`}
                                        />
                                    </td>
                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                        <input
                                            type="text"
                                            value={newRow.technician}
                                            onChange={e => setNewRow({ ...newRow, technician: e.target.value })}
                                            placeholder="Name..."
                                            className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${
                                                isDark 
                                                    ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' 
                                                    : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'
                                            }`}
                                        />
                                    </td>
                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                        <input
                                            type="text"
                                            value={newRow.address}
                                            onChange={e => setNewRow({ ...newRow, address: e.target.value })}
                                            placeholder="Address..."
                                            className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${
                                                isDark 
                                                    ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' 
                                                    : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'
                                            }`}
                                        />
                                    </td>
                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                        <input
                                            type="text"
                                            value={newRow.remarks}
                                            onChange={e => setNewRow({ ...newRow, remarks: e.target.value })}
                                            placeholder="Remarks..."
                                            className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${
                                                isDark 
                                                    ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' 
                                                    : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'
                                            }`}
                                        />
                                    </td>
                                    <td className="p-1.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={handleAddRow} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-green-950/30 text-green-450 hover:bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600 hover:bg-green-200'}`} title="Save">
                                                <i className="fa-solid fa-check text-xs"></i>
                                            </button>
                                            <button onClick={() => { setShowNewRow(false); setNewRow({ date: new Date().toISOString().split('T')[0], work_description: '', qty: '1', technician: '', remarks: '', address: '' }); }} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-red-950/30 text-red-455 hover:bg-red-900/40 text-red-400' : 'bg-red-100 text-red-500 hover:bg-red-200'}`} title="Cancel">
                                                <i className="fa-solid fa-xmark text-xs"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Loading */}
                            {isLoading && (
                                <tr><td colSpan={8} className={`p-8 text-center ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}><i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</td></tr>
                            )}

                            {/* Log Rows */}
                            {!isLoading && paginatedLogs.map((log, index) => (
                                <tr key={log.id} className={`group transition-colors ${editingId === log.id ? (isDark ? 'bg-amber-950/20' : 'bg-amber-50/50') : (isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50/50')}`}>
                                    <td className={`p-3 pl-5 border-r text-center font-bold text-xs ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-100 text-slate-400'}`}>{(currentPage - 1) * itemsPerPage + index + 1}</td>

                                    {editingId === log.id ? (
                                        <>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <CustomDatePicker
                                                    value={editForm.date}
                                                    onChange={val => setEditForm({ ...editForm, date: val })}
                                                    isDark={isDark}
                                                    placeholder="Select date..."
                                                />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="text" value={editForm.work_description} onChange={e => setEditForm({ ...editForm, work_description: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="text" value={editForm.qty} onChange={e => setEditForm({ ...editForm, qty: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium text-center focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="text" value={editForm.technician} onChange={e => setEditForm({ ...editForm, technician: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="text" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="text" value={editForm.remarks} onChange={e => setEditForm({ ...editForm, remarks: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                            </td>
                                            <td className="p-1.5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={handleSaveEdit} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-green-950/30 text-green-400 hover:bg-green-900/40' : 'bg-green-100 text-green-600 hover:bg-green-200'}`} title="Save">
                                                        <i className="fa-solid fa-check text-xs"></i>
                                                    </button>
                                                    <button onClick={handleCancelEdit} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`} title="Cancel">
                                                        <i className="fa-solid fa-xmark text-xs"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className={`p-3 border-r font-medium whitespace-nowrap ${isDark ? 'text-zinc-350 border-zinc-800' : 'text-slate-700 border-slate-100'}`}>{new Date(log.date).toLocaleDateString()}</td>
                                            <td className={`p-3 border-r whitespace-normal break-words ${isDark ? 'text-zinc-200 border-zinc-800' : 'text-slate-700 border-slate-100'}`}>{log.work_description || <span className={isDark ? 'text-zinc-600 italic' : 'text-slate-300 italic'}>—</span>}</td>
                                            <td className={`p-3 border-r text-center font-bold ${isDark ? 'text-white border-zinc-800' : 'text-slate-800 border-slate-100'}`}>{log.qty || '0'}</td>
                                            <td className={`p-3 border-r font-medium whitespace-nowrap ${isDark ? 'text-zinc-200 border-zinc-800' : 'text-slate-700 border-slate-100'}`}>{log.technician || <span className={isDark ? 'text-zinc-600 italic' : 'text-slate-300 italic'}>—</span>}</td>
                                            <td className={`p-3 border-r whitespace-normal break-words ${isDark ? 'text-zinc-200 border-zinc-800' : 'text-slate-700 border-slate-100'}`}>{log.address || <span className={isDark ? 'text-zinc-600 italic' : 'text-slate-300 italic'}>—</span>}</td>
                                            <td className={`p-3 border-r italic whitespace-normal break-words ${isDark ? 'text-zinc-400 border-zinc-800' : 'text-slate-600 border-slate-100'}`}>{log.remarks || <span className={isDark ? 'text-zinc-650 text-zinc-600' : 'text-slate-300'}>—</span>}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleStartEdit(log)} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-blue-950/40 hover:text-blue-450' : 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600'}`} title="Edit">
                                                        <i className="fa-solid fa-pen text-xs"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(log.id)} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-500 hover:bg-red-950/40 hover:text-red-400' : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500'}`} title="Delete">
                                                        <i className="fa-solid fa-trash-can text-xs"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}

                            {/* Empty State */}
                            {!isLoading && filteredLogs.length === 0 && !showNewRow && (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center">
                                        <div className="space-y-3">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                                                <i className={`fa-solid fa-search text-2xl ${isDark ? 'text-zinc-600' : 'text-slate-300'}`}></i>
                                            </div>
                                            <p className={`font-medium text-sm ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>No work logs found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination isDark={isDark}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}
