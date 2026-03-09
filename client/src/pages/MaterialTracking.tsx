import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { useAuth } from '../App';

type Tab = 'copper' | 'drain' | 'remote' | 'others';

export default function MaterialTracking() {
    const { token } = useAuth();
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<Tab>('copper');

    const [copperLogs, setCopperLogs] = useState<any[]>([]);
    const [drainLogs, setDrainLogs] = useState<any[]>([]);
    const [remoteLogs, setRemoteLogs] = useState<any[]>([]);
    const [otherLogs, setOtherLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch jobs on mount
    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/jobs`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setJobs(res.data);
            } catch (err) {
                console.error('Failed to fetch jobs', err);
            }
        };
        fetchJobs();
    }, [token]);

    useEffect(() => {
        if (selectedJobId) {
            fetchLogs(activeTab);
        } else {
            setCopperLogs([]);
            setDrainLogs([]);
            setRemoteLogs([]);
            setOtherLogs([]);
        }
    }, [activeTab, selectedJobId]);

    const fetchLogs = async (tab: Tab) => {
        if (!selectedJobId) return;
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/material/${tab}?job_id=${selectedJobId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (tab === 'copper') setCopperLogs(response.data);
            else if (tab === 'drain') setDrainLogs(response.data);
            else if (tab === 'remote') setRemoteLogs(response.data);
            else if (tab === 'others') setOtherLogs(response.data);
        } catch (err) {
            console.error(`Error fetching ${tab} logs:`, err);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteLog = async (id: number) => {
        if (!window.confirm('Delete this log entry?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/material/${activeTab}/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchLogs(activeTab);
        } catch (err) {
            console.error('Error deleting log:', err);
            alert('Failed to delete log entry.');
        }
    };

    const copperSizes = ['1/4', '3/8', '1/2', '5/8', '3/4', '7/8', '1 1/8', '1 3/8'];

    type CopperEntryItem = { id: string; size: string; isCustomSize: boolean; sent: string; return: string };

    const defaultCopperEntries = copperSizes.map((size, index) => ({ id: `default-${index}`, size, isCustomSize: false, sent: '', return: '' }));

    const [copperDate, setCopperDate] = useState(new Date().toISOString().split('T')[0]);
    const [copperEntries, setCopperEntries] = useState<CopperEntryItem[]>(defaultCopperEntries);

    const updateCopperEntries = (action: React.SetStateAction<CopperEntryItem[]>) => {
        setCopperEntries(prev => {
            const next = typeof action === 'function' ? (action as Function)(prev) : action;
            if (selectedJobId && activeTab === 'copper') {
                const key = `copperCards_job_${selectedJobId}`;
                localStorage.setItem(key, JSON.stringify(next));
            }
            return next;
        });
    };

    // Load from local storage when selected job changes
    useEffect(() => {
        if (selectedJobId && activeTab === 'copper') {
            const key = `copperCards_job_${selectedJobId}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                try {
                    setCopperEntries(JSON.parse(saved));
                } catch (e) {
                    setCopperEntries(defaultCopperEntries);
                }
            } else {
                setCopperEntries(defaultCopperEntries);
            }
        }
    }, [selectedJobId, activeTab]);

    const handleAddCopperEntry = () => {
        updateCopperEntries(prev => [...prev, { id: Date.now().toString() + Math.random(), size: '', isCustomSize: false, sent: '', return: '' }]);
    };

    const handleRemoveCopperEntry = (idToRemove: string) => {
        updateCopperEntries(prev => prev.filter(entry => entry.id !== idToRemove));
    };

    const handleCopperEntryChange = (id: string, field: 'size' | 'isCustomSize' | 'sent' | 'return', value: any) => {
        updateCopperEntries(prev => prev.map(entry => {
            if (entry.id === id) {
                const newEntry = { ...entry, [field]: value };
                if (field === 'isCustomSize' && value === true) newEntry.size = '';
                else if (field === 'isCustomSize' && value === false) newEntry.size = '';
                return newEntry;
            }
            return entry;
        }));
    };

    const handleCopperSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedJobId) return alert("Select a job first");

        try {
            const promises = copperEntries.map(entry => {
                if (entry.sent || entry.return) {
                    return axios.post(`${API_BASE_URL}/material/copper`, {
                        job_id: selectedJobId,
                        date: copperDate,
                        size: entry.size,
                        sent_qty: entry.sent || 0,
                        return_qty: entry.return || 0
                    }, { headers: { 'Authorization': `Bearer ${token}` } });
                }
                return Promise.resolve();
            });
            await Promise.all(promises);
            updateCopperEntries(defaultCopperEntries);
            fetchLogs('copper');
        } catch (err) {
            alert('Failed to save log');
        }
    };

    const buildCopperDisplayLogs = () => {
        const sorted = [...copperLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
        const totalsBySize: Record<string, number> = {};
        return sorted.map(log => {
            const used = Number(log.sent_qty) - Number(log.return_qty);
            totalsBySize[log.size] = (totalsBySize[log.size] || 0) + used;
            return { ...log, used, cumulativeTotal: totalsBySize[log.size] };
        }).reverse(); // Newest first
    };

    const [expandedCopperSizes, setExpandedCopperSizes] = useState<Record<string, boolean>>({});
    const toggleCopperSize = (size: string) => {
        setExpandedCopperSizes(prev => ({ ...prev, [size]: !prev[size] }));
    };

    const buildGroupedCopperLogs = () => {
        const logs = buildCopperDisplayLogs();
        const grouped: Record<string, any[]> = {};
        copperSizes.forEach(s => grouped[s] = []);
        logs.forEach(l => {
            if (grouped[l.size]) grouped[l.size].push(l);
        });

        return copperSizes.map(size => {
            if (!grouped[size] || grouped[size].length === 0) return null;
            const sizeLogs = grouped[size];
            const overallTotal = sizeLogs[0].cumulativeTotal;
            const totalSent = sizeLogs.reduce((sum, l) => sum + Number(l.sent_qty), 0);
            const totalReturn = sizeLogs.reduce((sum, l) => sum + Number(l.return_qty), 0);
            const totalUsed = sizeLogs.reduce((sum, l) => sum + Number(l.used), 0);
            return { size, overallTotal, totalSent, totalReturn, totalUsed, logs: sizeLogs };
        }).filter(Boolean);
    };

    // ----- Drain Pipe Form -----
    const [drainForm, setDrainForm] = useState({ date: new Date().toISOString().split('T')[0], used: '' });
    const handleDrainSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/material/drain`, {
                job_id: selectedJobId,
                date: drainForm.date,
                used_qty: drainForm.used || 0
            }, { headers: { 'Authorization': `Bearer ${token}` } });
            setDrainForm(prev => ({ ...prev, used: '' }));
            fetchLogs('drain');
        } catch (err) { alert('Failed to save log'); }
    };
    const buildDrainDisplayLogs = () => {
        let runningTotal = 0;
        const sorted = [...drainLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
        return sorted.map(log => {
            runningTotal += Number(log.used_qty);
            return { ...log, cumulativeTotal: runningTotal };
        }).reverse();
    };

    // ----- Remote Form -----
    const [remoteForm, setRemoteForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'wired', used: '' });
    const handleRemoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/material/remote`, {
                job_id: selectedJobId,
                date: remoteForm.date,
                type: remoteForm.type,
                used_qty: remoteForm.used || 0
            }, { headers: { 'Authorization': `Bearer ${token}` } });
            setRemoteForm(prev => ({ ...prev, used: '' }));
            fetchLogs('remote');
        } catch (err) { alert('Failed to save log'); }
    };
    const buildRemoteDisplayLogs = () => {
        const sorted = [...remoteLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
        const totalsByType: Record<string, number> = {};
        return sorted.map(log => {
            const used = Number(log.used_qty);
            const type = log.type || 'wired';
            totalsByType[type] = (totalsByType[type] || 0) + used;
            return { ...log, cumulativeTotal: totalsByType[type] };
        }).reverse();
    };

    // ----- Others Form -----
    const [otherForm, setOtherForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', qty: '' });
    const handleOtherSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE_URL}/material/others`, {
                job_id: selectedJobId,
                date: otherForm.date,
                description: otherForm.description,
                qty: otherForm.qty || 0
            }, { headers: { 'Authorization': `Bearer ${token}` } });
            setOtherForm(prev => ({ ...prev, description: '', qty: '' }));
            fetchLogs('others');
        } catch (err) { alert('Failed to save log'); }
    };
    const buildOtherDisplayLogs = () => {
        let runningTotal = 0;
        const sorted = [...otherLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
        return sorted.map(log => {
            runningTotal += Number(log.qty);
            return { ...log, cumulativeTotal: runningTotal };
        }).reverse();
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Material Tracking</h1>
                    <p className="text-sm text-slate-500 mt-1">Log usage for copper, drain pipes, remotes, and other materials.</p>
                </div>
            </div>

            {/* Job Selector */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="hidden sm:flex w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl items-center justify-center text-xl shrink-0">
                    <i className="fa-solid fa-briefcase"></i>
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Select Job</label>
                    <div className="relative">
                        <select
                            value={selectedJobId}
                            onChange={(e) => setSelectedJobId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="">-- Choose a Job First --</option>
                            {jobs.map(job => (
                                <option key={job.id} value={job.id}>Job #{job.id} - {job.customerName || `Customer #${job.customerId}`} ({job.jobType})</option>
                            ))}
                        </select>
                        <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                    </div>
                </div>
            </div>

            {!selectedJobId ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 text-2xl mb-4">
                        <i className="fa-solid fa-arrow-up"></i>
                    </div>
                    <h2 className="text-lg font-bold text-slate-700">Please Select a Job</h2>
                    <p className="mt-2 text-sm text-slate-400">You must select a job from the dropdown above to view and track its materials.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Tabs Menu */}
                    <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2 overflow-x-auto">
                        {(['copper', 'drain', 'remote', 'others'] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all capitalize whitespace-nowrap ${activeTab === tab
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'
                                    }`}
                            >
                                {tab === 'drain' ? 'Drain Pipe' : tab}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="p-4 sm:p-6">
                        {isLoading && <div className="py-10 text-center text-slate-400"><i className="fa-solid fa-spinner fa-spin text-2xl"></i></div>}

                        {!isLoading && activeTab === 'copper' && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Log Copper Usage</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-2 bg-white px-3 py-1 border border-slate-200 rounded-lg shadow-sm">
                                                <i className="fa-solid fa-calendar text-slate-400 text-xs"></i>
                                                <input type="date" required value={copperDate} onChange={e => setCopperDate(e.target.value)} className="bg-transparent border-none text-sm font-semibold focus:ring-0 text-slate-700 outline-none w-[125px]" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddCopperEntry}
                                                className="bg-white border border-slate-200 text-blue-600 w-8 h-8 rounded-lg shadow-sm flex items-center justify-center hover:bg-blue-50 transition-colors"
                                                title="Add Custom Size Entry"
                                            >
                                                <i className="fa-solid fa-plus"></i>
                                            </button>
                                        </div>
                                    </div>

                                    <form onSubmit={handleCopperSubmit} className="space-y-4">
                                        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-black tracking-wider">
                                                    <tr>
                                                        <th className="p-3 pl-5 border-b border-r border-slate-200 min-w-[150px]">Pipe Size</th>
                                                        <th className="p-3 border-b border-r border-slate-200 min-w-[120px] text-center">Sent</th>
                                                        <th className="p-3 border-b border-r border-slate-200 min-w-[120px] text-center">Return</th>
                                                        <th className="p-3 border-b border-slate-200 w-16 text-center"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {copperEntries.map((entry, index) => (
                                                        <tr key={entry.id} className="hover:bg-slate-50/50 group transition-colors">
                                                            <td className="p-1.5 border-r border-slate-100 align-top relative">
                                                                {!entry.isCustomSize ? (
                                                                    <div className="relative h-full flex items-center">
                                                                        <select
                                                                            required
                                                                            value={entry.size}
                                                                            onChange={(e) => {
                                                                                if (e.target.value === 'custom') {
                                                                                    handleCopperEntryChange(entry.id, 'isCustomSize', true);
                                                                                } else {
                                                                                    handleCopperEntryChange(entry.id, 'size', e.target.value);
                                                                                }
                                                                            }}
                                                                            className={`w-full bg-transparent border-none py-2 pl-3 pr-8 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer ${!entry.size ? 'text-slate-400' : 'text-slate-800'}`}
                                                                        >
                                                                            <option value="" disabled hidden>Select Size...</option>
                                                                            {copperSizes.map(size => {
                                                                                const isSelectedElsewhere = copperEntries.some(e => e.id !== entry.id && e.size === size);
                                                                                return (
                                                                                    <option
                                                                                        key={size}
                                                                                        value={size}
                                                                                        disabled={isSelectedElsewhere}
                                                                                        className={isSelectedElsewhere ? "text-slate-300 bg-slate-50" : "text-slate-800"}
                                                                                    >
                                                                                        {size} {isSelectedElsewhere ? '(Selected)' : ''}
                                                                                    </option>
                                                                                );
                                                                            })}
                                                                            <option value="custom" className="text-blue-600 font-bold">Other (Custom)...</option>
                                                                        </select>
                                                                        <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1 p-1 h-full">
                                                                        <input
                                                                            type="text"
                                                                            required
                                                                            value={entry.size}
                                                                            onChange={(e) => handleCopperEntryChange(entry.id, 'size', e.target.value)}
                                                                            placeholder="Type size..."
                                                                            autoFocus
                                                                            className="w-full bg-white border border-blue-300 rounded-lg pl-3 pr-3 py-1.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                                        />
                                                                        <button type="button" onClick={() => handleCopperEntryChange(entry.id, 'isCustomSize', false)} className="p-2 text-slate-400 hover:text-red-500" title="Cancel Custom Size">
                                                                            <i className="fa-solid fa-xmark text-sm"></i>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className={`p-1.5 border-r border-slate-100 align-top transition-opacity duration-300 ${!entry.size ? 'opacity-40' : 'opacity-100'}`}>
                                                                <input type="number" step="0.01" min="0" value={entry.sent} onChange={e => handleCopperEntryChange(entry.id, 'sent', e.target.value)} placeholder="0.00" disabled={!entry.size} className="w-full bg-transparent border-none px-3 py-2 text-sm font-semibold text-center focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-md transition-all outline-none" />
                                                            </td>
                                                            <td className={`p-1.5 border-r border-slate-100 align-top transition-opacity duration-300 ${!entry.size ? 'opacity-40' : 'opacity-100'}`}>
                                                                <input type="number" step="0.01" min="0" value={entry.return} onChange={e => handleCopperEntryChange(entry.id, 'return', e.target.value)} placeholder="0.00" disabled={!entry.size} className="w-full bg-transparent border-none px-3 py-2 text-sm font-semibold text-center focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-md transition-all outline-none" />
                                                            </td>
                                                            <td className="p-1.5 text-center align-middle">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveCopperEntry(entry.id)}
                                                                    className="w-7 h-7 mx-auto rounded-lg bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                                                                    title="Remove Entry"
                                                                >
                                                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex justify-end pt-4 border-t border-slate-200 mt-6 gap-3">
                                            <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2">
                                                <i className="fa-solid fa-save"></i> Save Copper Logs
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">History</h3>
                                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                                                <tr>
                                                    <th className="p-4 border-b border-slate-200 text-slate-600">Date</th>
                                                    <th className="p-4 border-b border-slate-200 text-slate-600">Size</th>
                                                    <th className="p-4 border-b border-slate-200 text-right text-slate-600">Sent</th>
                                                    <th className="p-4 border-b border-slate-200 text-right text-slate-600">Return</th>
                                                    <th className="p-4 border-b border-slate-200 text-right text-orange-600">Used</th>
                                                    <th className="p-4 border-b border-slate-200 text-right text-blue-600">Cumulative Total</th>
                                                    <th className="p-4 border-b border-slate-200 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {buildGroupedCopperLogs().map(group => (
                                                    <React.Fragment key={group.size}>
                                                        <tr
                                                            className="hover:bg-slate-50/50 transition-colors cursor-pointer bg-slate-50/30"
                                                            onClick={() => toggleCopperSize(group.size)}
                                                        >
                                                            <td className="p-4 font-bold text-slate-700 whitespace-nowrap">
                                                                <i className={`fa-solid fa-chevron-${expandedCopperSizes[group.size] ? 'up' : 'down'} mr-3 text-slate-400 text-xs transition-transform`}></i>
                                                                {new Date(group.logs[0].date).toLocaleDateString()} ({group.logs.length})
                                                            </td>
                                                            <td className="p-4 font-bold text-slate-900"><span className="bg-slate-100 px-2 py-1 rounded text-xs shadow-sm border border-slate-200">{group.size}</span></td>
                                                            <td className="p-4 text-right font-bold text-slate-600">{group.totalSent.toFixed(2)}</td>
                                                            <td className="p-4 text-right font-bold text-slate-600">{group.totalReturn.toFixed(2)}</td>
                                                            <td className="p-4 text-right font-black text-orange-600">{group.totalUsed.toFixed(2)}</td>
                                                            <td className="p-4 text-right font-black text-blue-700 text-base bg-blue-50/50">{group.overallTotal}</td>
                                                            <td className="p-4 text-center"></td>
                                                        </tr>
                                                        {expandedCopperSizes[group.size] && group.logs.map((log: any) => (
                                                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors bg-white">
                                                                <td className="p-4 pl-12 font-medium text-slate-500 whitespace-nowrap">
                                                                    <i className="fa-solid fa-turn-up fa-rotate-90 mr-2 text-slate-300"></i>
                                                                    {new Date(log.date).toLocaleDateString()}
                                                                </td>
                                                                <td className="p-4 text-slate-400 text-xs italic">Entry</td>
                                                                <td className="p-4 text-right font-medium text-slate-500">{log.sent_qty}</td>
                                                                <td className="p-4 text-right font-medium text-slate-500">{log.return_qty}</td>
                                                                <td className="p-4 text-right font-bold text-orange-500/80">{log.used}</td>
                                                                <td className="p-4 text-right font-bold text-blue-600/80 bg-blue-50/20">{log.cumulativeTotal}</td>
                                                                <td className="p-4 text-center">
                                                                    <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center mx-auto"><i className="fa-solid fa-trash-can"></i></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                                {copperLogs.length === 0 && (
                                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic font-medium">No copper logs recorded yet for this job.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isLoading && activeTab === 'drain' && (
                            <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Log Drain Pipe Usage</h3>
                                    <form onSubmit={handleDrainSubmit} className="flex flex-wrap gap-4 items-end">
                                        <div className="w-full sm:w-auto flex-1 min-w-[150px]">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Date</label>
                                            <input type="date" required value={drainForm.date} onChange={e => setDrainForm({ ...drainForm, date: e.target.value })} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                                        </div>
                                        <div className="w-full sm:w-auto flex-1 min-w-[150px]">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Drain Pipe Used</label>
                                            <input type="number" step="0.01" min="0" required value={drainForm.used} onChange={e => setDrainForm({ ...drainForm, used: e.target.value })} placeholder="0.00" className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                                        </div>
                                        <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20">
                                            <i className="fa-solid fa-plus mr-2"></i>Add Log
                                        </button>
                                    </form>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">History</h3>
                                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                                                <tr>
                                                    <th className="p-4 border-b border-slate-200">Date</th>
                                                    <th className="p-4 border-b border-slate-200 text-right text-orange-600">Drain Pipe Used</th>
                                                    <th className="p-4 border-b border-slate-200 text-right text-blue-600">Cumulative Total</th>
                                                    <th className="p-4 border-b border-slate-200 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {buildDrainDisplayLogs().map(log => (
                                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 font-medium text-slate-700 whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                                                        <td className="p-4 text-right font-bold text-orange-600">{log.used_qty}</td>
                                                        <td className="p-4 text-right font-black text-blue-700 text-base bg-blue-50/50">{log.cumulativeTotal}</td>
                                                        <td className="p-4 text-center">
                                                            <button onClick={() => deleteLog(log.id)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center mx-auto"><i className="fa-solid fa-trash-can"></i></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {drainLogs.length === 0 && (
                                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No drain logs recorded yet.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isLoading && activeTab === 'remote' && (
                            <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Log Remote Usage</h3>
                                    <form onSubmit={handleRemoteSubmit} className="flex flex-wrap gap-4 items-end">
                                        <div className="w-full sm:w-auto flex-1 min-w-[150px]">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Date</label>
                                            <input type="date" required value={remoteForm.date} onChange={e => setRemoteForm({ ...remoteForm, date: e.target.value })} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                                        </div>
                                        <div className="w-full sm:w-auto flex-1 min-w-[150px]">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Type</label>
                                            <div className="relative">
                                                <select value={remoteForm.type} onChange={e => setRemoteForm({ ...remoteForm, type: e.target.value })} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl pl-4 pr-10 py-2 text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none appearance-none cursor-pointer text-slate-800">
                                                    <option value="wired">Wired</option>
                                                    <option value="wireless">Wireless</option>
                                                    <option value="sensor">Sensor</option>
                                                </select>
                                                <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-auto flex-1 min-w-[150px]">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Remote Used</label>
                                            <input type="number" step="0.01" min="0" required value={remoteForm.used} onChange={e => setRemoteForm({ ...remoteForm, used: e.target.value })} placeholder="0.00" className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                                        </div>
                                        <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20">
                                            <i className="fa-solid fa-plus mr-2"></i>Add Log
                                        </button>
                                    </form>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">History</h3>
                                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                                                <tr>
                                                    <th className="p-4 border-b border-slate-200">Date</th>
                                                    <th className="p-4 border-b border-slate-200">Type</th>
                                                    <th className="p-4 border-b border-slate-200 text-right text-orange-600">Remote Used</th>
                                                    <th className="p-4 border-b border-slate-200 text-right text-blue-600">Cumulative Total</th>
                                                    <th className="p-4 border-b border-slate-200 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {buildRemoteDisplayLogs().map(log => (
                                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 font-medium text-slate-700 whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                                                        <td className="p-4 font-bold text-slate-600 capitalize">{log.type || 'wired'}</td>
                                                        <td className="p-4 text-right font-bold text-orange-600">{log.used_qty}</td>
                                                        <td className="p-4 text-right font-black text-blue-700 text-base bg-blue-50/50">{log.cumulativeTotal}</td>
                                                        <td className="p-4 text-center">
                                                            <button onClick={() => deleteLog(log.id)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center mx-auto"><i className="fa-solid fa-trash-can"></i></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {remoteLogs.length === 0 && (
                                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No remote logs recorded yet.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isLoading && activeTab === 'others' && (
                            <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl">
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Log Other Material Usage</h3>
                                    <form onSubmit={handleOtherSubmit} className="flex flex-wrap gap-4 items-end">
                                        <div className="w-full sm:w-auto flex-1 min-w-[150px] max-w-[200px]">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Date</label>
                                            <input type="date" required value={otherForm.date} onChange={e => setOtherForm({ ...otherForm, date: e.target.value })} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                                        </div>
                                        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Description</label>
                                            <input type="text" required value={otherForm.description} onChange={e => setOtherForm({ ...otherForm, description: e.target.value })} placeholder="e.g. Screws, Tape" className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                                        </div>
                                        <div className="w-full sm:w-auto flex-1 min-w-[100px] max-w-[150px]">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Quantity</label>
                                            <input type="number" step="0.01" min="0" required value={otherForm.qty} onChange={e => setOtherForm({ ...otherForm, qty: e.target.value })} placeholder="0.00" className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 text-sm font-semibold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none" />
                                        </div>
                                        <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20">
                                            <i className="fa-solid fa-plus mr-2"></i>Add Log
                                        </button>
                                    </form>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">History</h3>
                                    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-bold tracking-wider">
                                                <tr>
                                                    <th className="p-4 border-b border-slate-200">Date</th>
                                                    <th className="p-4 border-b border-slate-200">Description</th>
                                                    <th className="p-4 border-b border-slate-200 text-right text-orange-600">Quantity</th>
                                                    <th className="p-4 border-b border-slate-200 text-right text-blue-600">Cumulative Total</th>
                                                    <th className="p-4 border-b border-slate-200 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {buildOtherDisplayLogs().map(log => (
                                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 font-medium text-slate-700 whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                                                        <td className="p-4 font-bold text-slate-800">{log.description}</td>
                                                        <td className="p-4 text-right font-bold text-orange-600">{log.qty}</td>
                                                        <td className="p-4 text-right font-black text-blue-700 text-base bg-blue-50/50">{log.cumulativeTotal}</td>
                                                        <td className="p-4 text-center">
                                                            <button onClick={() => deleteLog(log.id)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center mx-auto"><i className="fa-solid fa-trash-can"></i></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {otherLogs.length === 0 && (
                                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">No logs recorded yet.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
