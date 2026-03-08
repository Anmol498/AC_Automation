import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { useAuth } from '../App';

interface DailyWorkLog {
    id: number;
    job_id: number;
    date: string;
    work_description: string;
    qty: string;
    technician: string;
    remarks: string;
}

export default function DailyWork() {
    const { token } = useAuth();
    const [logs, setLogs] = useState<DailyWorkLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Inline editing state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ date: '', work_description: '', qty: '', technician: '', remarks: '' });

    // New row form
    const [newRow, setNewRow] = useState<Partial<DailyWorkLog>>({ date: new Date().toISOString().split('T')[0], work_description: '', qty: '1', technician: '', remarks: '' });
    const [showNewRow, setShowNewRow] = useState(false);
    const [editRowId, setEditRowId] = useState<number | null>(null);
    const [editRowData, setEditRowData] = useState<Partial<DailyWorkLog>>({});

    // Search state
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/daily-work`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setLogs(res.data);
        } catch (err) {
            console.error('Failed to fetch daily work logs', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddRow = async () => {
        if (!newRow.date) return alert('Date is required');
        try {
            await axios.post(`${API_BASE_URL}/daily-work`, {
                ...newRow
            }, { headers: { 'Authorization': `Bearer ${token}` } });
            setNewRow({ date: new Date().toISOString().split('T')[0], work_description: '', qty: '1', technician: '', remarks: '' });
            setShowNewRow(false);
            fetchLogs();
        } catch (err) {
            alert('Failed to add entry');
        }
    };

    const handleStartEdit = (log: DailyWorkLog) => {
        setEditingId(log.id);
        setEditForm({
            date: new Date(log.date).toISOString().split('T')[0],
            work_description: log.work_description || '',
            qty: log.qty || '',
            technician: log.technician || '',
            remarks: log.remarks || ''
        });
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        try {
            await axios.put(`${API_BASE_URL}/daily-work/${editingId}`, editForm, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setEditingId(null);
            fetchLogs();
        } catch (err) {
            alert('Failed to update');
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this entry?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/daily-work/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchLogs();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    const filteredLogs = logs.filter(log =>
        (log.technician || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportToCSV = () => {
        if (!filteredLogs.length) return alert('No data to export.');

        const headers = ['Date', 'Work Description', 'Qty', 'Technician', 'Remarks'];
        const rows = filteredLogs.map(log => [
            new Date(log.date).toLocaleDateString(),
            `"${(log.work_description || '').replace(/"/g, '""')}"`,
            `"${(log.qty || '0').replace(/"/g, '""')}"`,
            `"${(log.technician || '').replace(/"/g, '""')}"`,
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
                <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Daily Work</h1>
                <p className="text-slate-500 text-sm mt-1">Track daily work activities.</p>
            </div>

            {/* Excel-like Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200 gap-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest min-w-max">Work Log</h3>

                    <div className="flex flex-1 items-center justify-end gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:max-w-xs">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder="Search technicians..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                            />
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={exportToCSV}
                                disabled={filteredLogs.length === 0}
                                className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
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
                        <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-black tracking-wider">
                            <tr>
                                <th className="p-3 pl-5 border-b border-r border-slate-200 w-10 text-center">#</th>
                                <th className="p-3 border-b border-r border-slate-200 min-w-[130px]">Date</th>
                                <th className="p-3 border-b border-r border-slate-200 min-w-[280px]">Work Description</th>
                                <th className="p-3 border-b border-r border-slate-200 min-w-[80px] text-center">Qty</th>
                                <th className="p-3 border-b border-r border-slate-200 min-w-[140px]">Technician</th>
                                <th className="p-3 border-b border-r border-slate-200 min-w-[220px]">Remarks</th>
                                <th className="p-3 border-b border-slate-200 w-24 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {/* New Row Input */}
                            {showNewRow && (
                                <tr className="bg-blue-50/50 animate-in fade-in duration-200">
                                    <td className="p-2 pl-5 border-r border-slate-100 text-center text-slate-400 font-bold text-xs">
                                        <i className="fa-solid fa-asterisk text-blue-400"></i>
                                    </td>
                                    <td className="p-1.5 border-r border-slate-100">
                                        <input
                                            type="date"
                                            value={newRow.date}
                                            onChange={e => setNewRow({ ...newRow, date: e.target.value })}
                                            className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-1.5 border-r border-slate-100">
                                        <input
                                            type="text"
                                            value={newRow.work_description}
                                            onChange={e => setNewRow({ ...newRow, work_description: e.target.value })}
                                            placeholder="Describe work done..."
                                            className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-1.5 border-r border-slate-100">
                                        <input
                                            type="text"
                                            value={newRow.qty}
                                            onChange={e => setNewRow({ ...newRow, qty: e.target.value })}
                                            placeholder="0"
                                            className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-sm font-medium text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-1.5 border-r border-slate-100">
                                        <input
                                            type="text"
                                            value={newRow.technician}
                                            onChange={e => setNewRow({ ...newRow, technician: e.target.value })}
                                            placeholder="Name..."
                                            className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-1.5 border-r border-slate-100">
                                        <input
                                            type="text"
                                            value={newRow.remarks}
                                            onChange={e => setNewRow({ ...newRow, remarks: e.target.value })}
                                            placeholder="Remarks..."
                                            className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="p-1.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={handleAddRow} className="w-7 h-7 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors flex items-center justify-center" title="Save">
                                                <i className="fa-solid fa-check text-xs"></i>
                                            </button>
                                            <button onClick={() => { setShowNewRow(false); setNewRow({ date: new Date().toISOString().split('T')[0], work_description: '', qty: '1', technician: '', remarks: '' }); }} className="w-7 h-7 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-colors flex items-center justify-center" title="Cancel">
                                                <i className="fa-solid fa-xmark text-xs"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Loading */}
                            {isLoading && (
                                <tr><td colSpan={7} className="p-8 text-center text-slate-400"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</td></tr>
                            )}

                            {/* Log Rows */}
                            {!isLoading && filteredLogs.map((log, index) => (
                                <tr key={log.id} className={`group transition-colors ${editingId === log.id ? 'bg-amber-50/50' : 'hover:bg-slate-50/50'}`}>
                                    <td className="p-3 pl-5 border-r border-slate-100 text-center text-slate-400 font-bold text-xs">{index + 1}</td>

                                    {editingId === log.id ? (
                                        <>
                                            <td className="p-1.5 border-r border-slate-100">
                                                <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none" />
                                            </td>
                                            <td className="p-1.5 border-r border-slate-100">
                                                <input type="text" value={editForm.work_description} onChange={e => setEditForm({ ...editForm, work_description: e.target.value })} className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none" />
                                            </td>
                                            <td className="p-1.5 border-r border-slate-100">
                                                <input type="text" value={editForm.qty} onChange={e => setEditForm({ ...editForm, qty: e.target.value })} className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-sm font-medium text-center focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none" />
                                            </td>
                                            <td className="p-1.5 border-r border-slate-100">
                                                <input type="text" value={editForm.technician} onChange={e => setEditForm({ ...editForm, technician: e.target.value })} className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none" />
                                            </td>
                                            <td className="p-1.5 border-r border-slate-100">
                                                <input type="text" value={editForm.remarks} onChange={e => setEditForm({ ...editForm, remarks: e.target.value })} className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none" />
                                            </td>
                                            <td className="p-1.5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={handleSaveEdit} className="w-7 h-7 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors flex items-center justify-center" title="Save">
                                                        <i className="fa-solid fa-check text-xs"></i>
                                                    </button>
                                                    <button onClick={handleCancelEdit} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors flex items-center justify-center" title="Cancel">
                                                        <i className="fa-solid fa-xmark text-xs"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-3 border-r border-slate-100 font-medium text-slate-700 whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                                            <td className="p-3 border-r border-slate-100 text-slate-700">{log.work_description || <span className="text-slate-300 italic">—</span>}</td>
                                            <td className="p-3 border-r border-slate-100 text-center font-bold text-slate-800">{log.qty || '0'}</td>
                                            <td className="p-3 border-r border-slate-100 font-medium text-slate-700">{log.technician || <span className="text-slate-300 italic">—</span>}</td>
                                            <td className="p-3 border-r border-slate-100 text-slate-600 italic">{log.remarks || <span className="text-slate-300">—</span>}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleStartEdit(log)} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600 transition-colors flex items-center justify-center" title="Edit">
                                                        <i className="fa-solid fa-pen text-xs"></i>
                                                    </button>
                                                    <button onClick={() => handleDelete(log.id)} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors flex items-center justify-center" title="Delete">
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
                                    <td colSpan={7} className="p-12 text-center">
                                        <div className="space-y-3">
                                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                                                <i className="fa-solid fa-search text-2xl text-slate-300"></i>
                                            </div>
                                            <p className="text-slate-400 font-medium text-sm">No work logs found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
