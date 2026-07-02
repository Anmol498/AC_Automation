import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AppContext';
import { api } from '../lib/api';
import { useRealtimeListener } from '../components/RealtimeProvider';
import Pagination from '../components/Pagination';
import { toast } from 'sonner';
import CustomDatePicker from '../components/CustomDatePicker';
import { createPortal } from 'react-dom';

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

interface CashFlowLog {
    id: number;
    date: string;
    received: number;
    from_source: string;
    expenditure: number;
    on_source: string;
    sent_home: number;
    balance: number;
    created_at: string;
}

interface InventoryHistoryLog {
    id: number;
    modelName?: string;
    brand?: string;
    userEmail: string;
    actionType: string;
    quantityChange: number;
    previousQuantity: number;
    newQuantity: number;
    createdAt: string;
    customerName?: string;
    jobId?: number;
}

interface CopperHistoryLog {
    id: number;
    date: string;
    size: string;
    origin: string;
    sentQty: number;
    returnQty: number;
    createdAt: string;
}

export default function DailyWork() {
    const { token, user } = useAuth();
    const { isDark = false } = useOutletContext<{ isDark?: boolean }>() || {};
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Active Tab state
    const [activeTab, setActiveTab] = useState<'Daily-Work' | 'Cash-flow' | 'Inventory-logs' | 'Copper-logs'>(() => {
        const tab = searchParams.get('tab');
        if (tab && ['Daily-Work', 'Cash-flow', 'Inventory-logs', 'Copper-logs'].includes(tab)) {
            if (tab === 'Cash-flow' && user?.role !== 'superadmin') {
                return 'Daily-Work';
            }
            return tab as any;
        }
        return 'Daily-Work';
    });

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['Daily-Work', 'Cash-flow', 'Inventory-logs', 'Copper-logs'].includes(tab)) {
            if (tab === 'Cash-flow' && user?.role !== 'superadmin') {
                setActiveTab('Daily-Work');
            } else {
                setActiveTab(tab as any);
            }
        }
    }, [searchParams, user]);

    const handleTabChange = (tab: 'Daily-Work' | 'Cash-flow' | 'Inventory-logs' | 'Copper-logs') => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    // --- Daily Work Logs states ---
    const [dailyLogs, setDailyLogs] = useState<DailyWorkLog[]>([]);
    const [isDailyLoading, setIsDailyLoading] = useState(false);
    
    const [dailyPage, setDailyPage] = useState(() => {
        const page = searchParams.get('dailyPage');
        return page ? parseInt(page, 10) : 1;
    });

    const [dailySearch, setDailySearch] = useState('');
    const [isDailySearchExpanded, setIsDailySearchExpanded] = useState(false);
    const dailySearchRef = useRef<HTMLInputElement>(null);
    const [editingDailyId, setEditingDailyId] = useState<number | null>(null);
    const [editDailyForm, setEditDailyForm] = useState({ date: '', work_description: '', qty: '', technician: '', remarks: '', address: '' });
    const [newDailyRow, setNewDailyRow] = useState<Partial<DailyWorkLog>>({ date: new Date().toISOString().split('T')[0], work_description: '', qty: '1', technician: '', remarks: '', address: '' });
    const [showNewDailyRow, setShowNewDailyRow] = useState(false);

    // --- Cash Flow Logs states ---
    const [cashLogs, setCashLogs] = useState<CashFlowLog[]>([]);
    const [isCashLoading, setIsCashLoading] = useState(false);
    
    const [cashPage, setCashPage] = useState(() => {
        const page = searchParams.get('cashPage');
        return page ? parseInt(page, 10) : 1;
    });

    const [cashSearch, setCashSearch] = useState('');
    const [isCashSearchExpanded, setIsCashSearchExpanded] = useState(false);
    const cashSearchRef = useRef<HTMLInputElement>(null);
    const [editingCashId, setEditingCashId] = useState<number | null>(null);
    const [editCashForm, setEditCashForm] = useState({ date: '', received: '', from_source: '', expenditure: '', on_source: '', sent_home: '' });
    const [newCashRow, setNewCashRow] = useState({ date: new Date().toISOString().split('T')[0], received: '', from_source: '', expenditure: '', on_source: '', sent_home: '' });
    const [showNewCashRow, setShowNewCashRow] = useState(false);

    // --- Inventory History Logs states ---
    const [inventoryLogs, setInventoryLogs] = useState<InventoryHistoryLog[]>([]);
    const [isInventoryLoading, setIsInventoryLoading] = useState(false);
    
    const [inventoryPage, setInventoryPage] = useState(() => {
        const page = searchParams.get('inventoryPage');
        return page ? parseInt(page, 10) : 1;
    });

    const [inventorySearch, setInventorySearch] = useState('');
    const [isInventorySearchExpanded, setIsInventorySearchExpanded] = useState(false);
    const inventorySearchRef = useRef<HTMLInputElement>(null);

    // --- Copper History Logs states ---
    const [copperLogs, setCopperLogs] = useState<CopperHistoryLog[]>([]);
    const [isCopperLoading, setIsCopperLoading] = useState(false);
    
    const [copperPage, setCopperPage] = useState(() => {
        const page = searchParams.get('copperPage');
        return page ? parseInt(page, 10) : 1;
    });

    const [copperSearch, setCopperSearch] = useState('');
    const [isCopperSearchExpanded, setIsCopperSearchExpanded] = useState(false);
    const copperSearchRef = useRef<HTMLInputElement>(null);

    // --- Download Modal states ---
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [downloadTab, setDownloadTab] = useState<'Daily-Work' | 'Cash-flow' | 'Inventory-logs' | 'Copper-logs' | null>(null);
    const [downloadStartDate, setDownloadStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [downloadEndDate, setDownloadEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const itemsPerPage = 10;

    useEffect(() => {
        const dp = searchParams.get('dailyPage');
        if (dp) {
            const p = parseInt(dp, 10);
            if (!isNaN(p) && p !== dailyPage) setDailyPage(p);
        } else {
            setDailyPage(1);
        }

        const cp = searchParams.get('cashPage');
        if (cp) {
            const p = parseInt(cp, 10);
            if (!isNaN(p) && p !== cashPage) setCashPage(p);
        } else {
            setCashPage(1);
        }

        const ip = searchParams.get('inventoryPage');
        if (ip) {
            const p = parseInt(ip, 10);
            if (!isNaN(p) && p !== inventoryPage) setInventoryPage(p);
        } else {
            setInventoryPage(1);
        }

        const cop = searchParams.get('copperPage');
        if (cop) {
            const p = parseInt(cop, 10);
            if (!isNaN(p) && p !== copperPage) setCopperPage(p);
        } else {
            setCopperPage(1);
        }
    }, [searchParams]);

    const handleDailyPageChange = (page: number) => {
        setDailyPage(page);
        const params = new URLSearchParams(searchParams);
        params.set('dailyPage', String(page));
        setSearchParams(params);
    };

    const handleCashPageChange = (page: number) => {
        setCashPage(page);
        const params = new URLSearchParams(searchParams);
        params.set('cashPage', String(page));
        setSearchParams(params);
    };

    const handleInventoryPageChange = (page: number) => {
        setInventoryPage(page);
        const params = new URLSearchParams(searchParams);
        params.set('inventoryPage', String(page));
        setSearchParams(params);
    };

    const handleCopperPageChange = (page: number) => {
        setCopperPage(page);
        const params = new URLSearchParams(searchParams);
        params.set('copperPage', String(page));
        setSearchParams(params);
    };

    // --- FETCH METHODS ---
    const fetchDailyLogs = async () => {
        setIsDailyLoading(true);
        try {
            const data = await api.get('/daily-work');
            setDailyLogs(data);
        } catch (err) {
            console.error('Failed to fetch daily work logs', err);
        } finally {
            setIsDailyLoading(false);
        }
    };

    const fetchCashLogs = async () => {
        setIsCashLoading(true);
        try {
            const data = await api.get('/cash-flow');
            setCashLogs(data);
        } catch (err) {
            console.error('Failed to fetch cash flow logs', err);
        } finally {
            setIsCashLoading(false);
        }
    };

    const fetchInventoryLogs = async () => {
        setIsInventoryLoading(true);
        try {
            const data = await api.get('/inventory/history');
            setInventoryLogs(data);
        } catch (err) {
            console.error('Failed to fetch inventory history logs', err);
        } finally {
            setIsInventoryLoading(false);
        }
    };

    const fetchCopperLogs = async () => {
        setIsCopperLoading(true);
        try {
            const data = await api.get('/inventory/copper/logs');
            setCopperLogs(data);
        } catch (err) {
            console.error('Failed to fetch copper history logs', err);
        } finally {
            setIsCopperLoading(false);
        }
    };

    // Load everything on mount / tab mount
    useEffect(() => {
        fetchDailyLogs();
        if (user?.role === 'superadmin') {
            fetchCashLogs();
        }
        fetchInventoryLogs();
        fetchCopperLogs();
    }, [token, user]);

    // Realtime listeners
    useRealtimeListener('work', () => {
        fetchDailyLogs();
        if (user?.role === 'superadmin') {
            fetchCashLogs();
        }
    });

    useRealtimeListener('inventory', () => {
        fetchInventoryLogs();
        fetchCopperLogs();
    });

    const isDailyMounted = useRef(false);
    useEffect(() => {
        if (!isDailyMounted.current) {
            isDailyMounted.current = true;
            return;
        }
        handleDailyPageChange(1);
    }, [dailySearch]);

    const isCashMounted = useRef(false);
    useEffect(() => {
        if (!isCashMounted.current) {
            isCashMounted.current = true;
            return;
        }
        handleCashPageChange(1);
    }, [cashSearch]);

    const isInventoryMounted = useRef(false);
    useEffect(() => {
        if (!isInventoryMounted.current) {
            isInventoryMounted.current = true;
            return;
        }
        handleInventoryPageChange(1);
    }, [inventorySearch]);

    const isCopperMounted = useRef(false);
    useEffect(() => {
        if (!isCopperMounted.current) {
            isCopperMounted.current = true;
            return;
        }
        handleCopperPageChange(1);
    }, [copperSearch]);

    // --- DAILY WORK HANDLERS ---
    const handleAddDailyRow = async () => {
        if (!newDailyRow.date) {
            toast.error('Date is required');
            return;
        }
        try {
            await api.post('/daily-work', newDailyRow);
            toast.success('Daily work entry added successfully!');
            setNewDailyRow({ date: new Date().toISOString().split('T')[0], work_description: '', qty: '1', technician: '', remarks: '', address: '' });
            setShowNewDailyRow(false);
            fetchDailyLogs();
        } catch (err) {
            toast.error('Failed to add daily work entry');
        }
    };

    const handleStartDailyEdit = (log: DailyWorkLog) => {
        setEditingDailyId(log.id);
        setEditDailyForm({
            date: new Date(log.date).toISOString().split('T')[0],
            work_description: log.work_description || '',
            qty: log.qty || '',
            technician: log.technician || '',
            remarks: log.remarks || '',
            address: log.address || ''
        });
    };

    const handleSaveDailyEdit = async () => {
        if (!editingDailyId) return;
        try {
            await api.put(`/daily-work/${editingDailyId}`, editDailyForm);
            toast.success('Daily work entry updated successfully!');
            setEditingDailyId(null);
            fetchDailyLogs();
        } catch (err) {
            toast.error('Failed to update daily work entry');
        }
    };

    const handleDeleteDaily = (id: number) => {
        toast.error("Delete daily work entry?", {
            description: "Are you sure you want to delete this entry? This action cannot be undone.",
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await api.delete(`/daily-work/${id}`);
                        toast.success("Entry deleted successfully!");
                        fetchDailyLogs();
                    } catch (err) {
                        toast.error('Failed to delete entry');
                    }
                }
            }
        });
    };

    // --- CASH FLOW HANDLERS ---
    const handleAddCashRow = async () => {
        if (!newCashRow.date) {
            toast.error('Date is required');
            return;
        }
        try {
            await api.post('/cash-flow', newCashRow);
            toast.success('Cash flow entry added successfully!');
            setNewCashRow({ date: new Date().toISOString().split('T')[0], received: '', from_source: '', expenditure: '', on_source: '', sent_home: '' });
            setShowNewCashRow(false);
            fetchCashLogs();
        } catch (err) {
            toast.error('Failed to add cash flow entry');
        }
    };

    const handleStartCashEdit = (log: CashFlowLog) => {
        setEditingCashId(log.id);
        setEditCashForm({
            date: new Date(log.date).toISOString().split('T')[0],
            received: String(log.received) || '',
            from_source: log.from_source || '',
            expenditure: String(log.expenditure) || '',
            on_source: log.on_source || '',
            sent_home: String(log.sent_home) || ''
        });
    };

    const handleSaveCashEdit = async () => {
        if (!editingCashId) return;
        try {
            await api.put(`/cash-flow/${editingCashId}`, editCashForm);
            toast.success('Cash flow entry updated successfully!');
            setEditingCashId(null);
            fetchCashLogs();
        } catch (err) {
            toast.error('Failed to update cash flow entry');
        }
    };

    const handleDeleteCash = (id: number) => {
        toast.error("Delete cash flow entry?", {
            description: "Are you sure you want to delete this cash flow entry? This action cannot be undone.",
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await api.delete(`/cash-flow/${id}`);
                        toast.success("Entry deleted successfully!");
                        fetchCashLogs();
                    } catch (err) {
                        toast.error('Failed to delete entry');
                    }
                }
            }
        });
    };

    // --- FILTERS & PAGINATIONS ---
    
    // 1. Daily Work
    const filteredDailyLogs = dailyLogs.filter(log =>
        (log.technician || '').toLowerCase().includes(dailySearch.toLowerCase()) ||
        (log.work_description || '').toLowerCase().includes(dailySearch.toLowerCase()) ||
        (log.address || '').toLowerCase().includes(dailySearch.toLowerCase())
    );
    const totalDailyPages = Math.ceil(filteredDailyLogs.length / itemsPerPage);
    const paginatedDailyLogs = filteredDailyLogs.slice((dailyPage - 1) * itemsPerPage, dailyPage * itemsPerPage);

    // 2. Cash Flow
    const filteredCashLogs = cashLogs.filter(log =>
        (log.from_source || '').toLowerCase().includes(cashSearch.toLowerCase()) ||
        (log.on_source || '').toLowerCase().includes(cashSearch.toLowerCase())
    );
    const totalCashPages = Math.ceil(filteredCashLogs.length / itemsPerPage);
    const paginatedCashLogs = filteredCashLogs.slice((cashPage - 1) * itemsPerPage, cashPage * itemsPerPage);

    // 3. Inventory Logs
    const filteredInventoryLogs = inventoryLogs.filter(log =>
        (log.modelName || '').toLowerCase().includes(inventorySearch.toLowerCase()) ||
        (log.brand || '').toLowerCase().includes(inventorySearch.toLowerCase()) ||
        (log.userEmail || '').toLowerCase().includes(inventorySearch.toLowerCase()) ||
        (log.actionType || '').toLowerCase().includes(inventorySearch.toLowerCase()) ||
        (log.customerName || '').toLowerCase().includes(inventorySearch.toLowerCase())
    );
    const totalInventoryPages = Math.ceil(filteredInventoryLogs.length / itemsPerPage);
    const paginatedInventoryLogs = filteredInventoryLogs.slice((inventoryPage - 1) * itemsPerPage, inventoryPage * itemsPerPage);

    // 4. Copper Logs
    const filteredCopperLogs = copperLogs.filter(log =>
        (log.size || '').toLowerCase().includes(copperSearch.toLowerCase()) ||
        (log.origin || '').toLowerCase().includes(copperSearch.toLowerCase())
    );
    const totalCopperPages = Math.ceil(filteredCopperLogs.length / itemsPerPage);
    const paginatedCopperLogs = filteredCopperLogs.slice((copperPage - 1) * itemsPerPage, copperPage * itemsPerPage);

    // --- DOWNLOAD DATE RANGE FLOW ---
    const openDownloadModal = (tab: 'Daily-Work' | 'Cash-flow' | 'Inventory-logs' | 'Copper-logs') => {
        setDownloadTab(tab);
        const d = new Date();
        d.setDate(d.getDate() - 30);
        setDownloadStartDate(d.toISOString().split('T')[0]);
        setDownloadEndDate(new Date().toISOString().split('T')[0]);
        setIsDownloadModalOpen(true);
    };

    const handleDownloadRange = () => {
        if (!downloadStartDate || !downloadEndDate) {
            toast.error('Please specify both start and end dates.');
            return;
        }
        if (new Date(downloadStartDate) > new Date(downloadEndDate)) {
            toast.error('Start date cannot be after end date.');
            return;
        }

        const start = new Date(downloadStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(downloadEndDate);
        end.setHours(23, 59, 59, 999);

        if (downloadTab === 'Daily-Work') {
            const filtered = dailyLogs.filter(log => {
                const logDate = new Date(log.date);
                return logDate >= start && logDate <= end;
            });
            if (!filtered.length) {
                toast.error('No logs found in the selected date range.');
                return;
            }
            const headers = ['Date', 'Work Description', 'Qty', 'Technician', 'Address', 'Remarks'];
            const rows = filtered.map(log => [
                new Date(log.date).toLocaleDateString(),
                `"${(log.work_description || '').replace(/"/g, '""')}"`,
                `"${(log.qty || '0').replace(/"/g, '""')}"`,
                `"${(log.technician || '').replace(/"/g, '""')}"`,
                `"${(log.address || '').replace(/"/g, '""')}"`,
                `"${(log.remarks || '').replace(/"/g, '""')}"`
            ]);
            triggerCSVDownload(headers, rows, `Daily_Work_Logs_from_${downloadStartDate}_to_${downloadEndDate}`);
        } else if (downloadTab === 'Cash-flow') {
            const filtered = cashLogs.filter(log => {
                const logDate = new Date(log.date);
                return logDate >= start && logDate <= end;
            });
            if (!filtered.length) {
                toast.error('No logs found in the selected date range.');
                return;
            }
            const headers = ['Date', 'Received', 'From Source', 'Expenditure', 'On Source', 'Sent Home', 'Balance'];
            const rows = filtered.map(log => [
                new Date(log.date).toLocaleDateString(),
                log.received,
                `"${(log.from_source || '').replace(/"/g, '""')}"`,
                log.expenditure,
                `"${(log.on_source || '').replace(/"/g, '""')}"`,
                log.sent_home,
                log.balance
            ]);
            triggerCSVDownload(headers, rows, `Cash_Flow_Logs_from_${downloadStartDate}_to_${downloadEndDate}`);
        } else if (downloadTab === 'Inventory-logs') {
            const filtered = inventoryLogs.filter(log => {
                const logDate = new Date(log.createdAt);
                return logDate >= start && logDate <= end;
            });
            if (!filtered.length) {
                toast.error('No logs found in the selected date range.');
                return;
            }
            const headers = ['Date/Time', 'Product Model', 'Brand', 'User', 'Action', 'Customer', 'Change', 'Available Stock'];
            const rows = filtered.map(log => [
                `${new Date(log.createdAt).toLocaleDateString()} ${new Date(log.createdAt).toLocaleTimeString()}`,
                `"${(log.modelName || 'Unknown').replace(/"/g, '""')}"`,
                log.brand || '',
                log.userEmail,
                log.actionType,
                log.customerName ? `"${log.customerName.replace(/"/g, '""')}"` : '-',
                log.quantityChange,
                log.newQuantity
            ]);
            triggerCSVDownload(headers, rows, `Inventory_History_Logs_from_${downloadStartDate}_to_${downloadEndDate}`);
        } else if (downloadTab === 'Copper-logs') {
            const filtered = copperLogs.filter(log => {
                const logDate = new Date(log.date);
                return logDate >= start && logDate <= end;
            });
            if (!filtered.length) {
                toast.error('No logs found in the selected date range.');
                return;
            }
            const headers = ['Date', 'Pipe Size', 'Origin', 'Sent Qty (ft)', 'Returned Qty (ft)', 'Net Used (ft)'];
            const rows = filtered.map(log => [
                new Date(log.date).toLocaleDateString(),
                `${log.size}"`,
                log.origin,
                log.sentQty,
                log.returnQty,
                (Number(log.sentQty || 0) - Number(log.returnQty || 0)).toFixed(1)
            ]);
            triggerCSVDownload(headers, rows, `Copper_History_Logs_from_${downloadStartDate}_to_${downloadEndDate}`);
        }

        setIsDownloadModalOpen(false);
        toast.success('Download completed successfully!');
    };

    const triggerCSVDownload = (headers: string[], rows: any[][], fileNamePrefix: string) => {
        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${fileNamePrefix}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>Logging</h1>
                <p className={`${isDark ? 'text-zinc-400' : 'text-slate-500'} text-sm mt-1`}>Track activities, cash flow, and stock movements.</p>
            </div>

            {/* Navigation Tabs (matches the design style in inventory) */}
            <div className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col ${isDark ? 'bg-[#242427] border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className={`flex border-b overflow-x-auto scrollbar-none ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <button
                        className={`flex-1 py-4 px-3 text-sm font-bold text-center transition-colors min-w-[120px] ${
                            activeTab === 'Daily-Work'
                                ? isDark ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-950/20' : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                : isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                        onClick={() => handleTabChange('Daily-Work')}
                    >
                        Daily Work
                    </button>
                    {user?.role === 'superadmin' && (
                        <button
                            className={`flex-1 py-4 px-3 text-sm font-bold text-center transition-colors min-w-[120px] ${
                                activeTab === 'Cash-flow'
                                    ? isDark ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-950/20' : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                    : isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                            onClick={() => handleTabChange('Cash-flow')}
                        >
                            Cash Flow
                        </button>
                    )}
                    <button
                        className={`flex-1 py-4 px-3 text-sm font-bold text-center transition-colors min-w-[120px] ${
                            activeTab === 'Inventory-logs'
                                ? isDark ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-950/20' : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                : isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                        onClick={() => handleTabChange('Inventory-logs')}
                    >
                        Inventory Logs
                    </button>
                    <button
                        className={`flex-1 py-4 px-3 text-sm font-bold text-center transition-colors min-w-[120px] ${
                            activeTab === 'Copper-logs'
                                ? isDark ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-950/20' : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                : isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                        onClick={() => handleTabChange('Copper-logs')}
                    >
                        Copper Logs
                    </button>
                </div>

                {/* Subtab Contents */}

                {/* 1. Daily Work Tab */}
                {activeTab === 'Daily-Work' && (
                    <div className="flex flex-col flex-1">
                        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 border-b gap-4 ${isDark ? 'bg-[#1e1e21] border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                            <h3 className={`text-xs font-black uppercase tracking-widest min-w-max ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Work Activity Log</h3>
                            <div className="flex flex-1 items-center justify-end gap-3 w-full sm:w-auto">
                                <div className="relative flex items-center">
                                    {!isDailySearchExpanded && !dailySearch ? (
                                        <button
                                            onClick={() => { setIsDailySearchExpanded(true); setTimeout(() => dailySearchRef.current?.focus(), 50); }}
                                            className={`w-9 h-9 border rounded-lg flex items-center justify-center transition-all shadow-sm ${isDark ? 'bg-[#242427] border-zinc-800 text-zinc-400 hover:text-blue-400 hover:border-zinc-700' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300'}`}
                                            title="Search"
                                        >
                                            <i className="fa-solid fa-magnifying-glass text-xs"></i>
                                        </button>
                                    ) : (
                                        <div className="relative group animate-in fade-in slide-in-from-right-2 duration-200">
                                            <i className={`fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 transition-colors text-xs ${isDark ? 'text-zinc-400 group-focus-within:text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'}`}></i>
                                            <input
                                                ref={dailySearchRef}
                                                type="text"
                                                placeholder="Search work logs..."
                                                value={dailySearch}
                                                onChange={(e) => setDailySearch(e.target.value)}
                                                onBlur={() => { if (!dailySearch) setIsDailySearchExpanded(false); }}
                                                className={`w-full sm:w-56 pl-8 pr-8 py-2 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${isDark ? 'bg-[#242427] border-zinc-800 text-white placeholder-zinc-500 focus:ring-blue-500/20 focus:border-zinc-700' : 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                            />
                                            {dailySearch && (
                                                <button onClick={() => { setDailySearch(''); dailySearchRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                                                    <i className="fa-solid fa-xmark text-xs"></i>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => openDownloadModal('Daily-Work')} disabled={dailyLogs.length === 0} className={`px-4 py-2 border font-bold text-xs rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 ${isDark ? 'bg-[#242427] text-blue-400 border-blue-950/40 hover:bg-blue-900/20' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}>
                                        <i className="fa-solid fa-download"></i> Download
                                    </button>
                                    <button onClick={() => setShowNewDailyRow(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-blue-500/20 flex items-center gap-2">
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
                                    {showNewDailyRow && (
                                        <tr className={`${isDark ? 'bg-blue-950/20' : 'bg-blue-50/50'} animate-in fade-in duration-200`}>
                                            <td className={`p-2 pl-5 border-r text-center font-bold text-xs ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-100 text-slate-400'}`}>
                                                <i className="fa-solid fa-asterisk text-blue-400"></i>
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <CustomDatePicker value={newDailyRow.date || ''} onChange={val => setNewDailyRow({ ...newDailyRow, date: val })} isDark={isDark} placeholder="Select date..." />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="text" value={newDailyRow.work_description || ''} onChange={e => setNewDailyRow({ ...newDailyRow, work_description: e.target.value })} placeholder="Describe work done..." className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="text" value={newDailyRow.qty || ''} onChange={e => setNewDailyRow({ ...newDailyRow, qty: e.target.value })} placeholder="0" className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium text-center focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="text" value={newDailyRow.technician || ''} onChange={e => setNewDailyRow({ ...newDailyRow, technician: e.target.value })} placeholder="Name..." className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="text" value={newDailyRow.address || ''} onChange={e => setNewDailyRow({ ...newDailyRow, address: e.target.value })} placeholder="Address..." className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="text" value={newDailyRow.remarks || ''} onChange={e => setNewDailyRow({ ...newDailyRow, remarks: e.target.value })} placeholder="Remarks..." className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                                            </td>
                                            <td className="p-1.5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={handleAddDailyRow} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-green-950/30 text-green-400 hover:bg-green-900/40' : 'bg-green-100 text-green-600 hover:bg-green-200'}`} title="Save">
                                                        <i className="fa-solid fa-check text-xs"></i>
                                                    </button>
                                                    <button onClick={() => { setShowNewDailyRow(false); setNewDailyRow({ date: new Date().toISOString().split('T')[0], work_description: '', qty: '1', technician: '', remarks: '', address: '' }); }} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-red-950/30 text-red-455 hover:bg-red-900/40 text-red-400' : 'bg-red-100 text-red-500 hover:bg-red-200'}`} title="Cancel">
                                                        <i className="fa-solid fa-xmark text-xs"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {isDailyLoading && (
                                        <tr><td colSpan={8} className={`p-8 text-center ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}><i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</td></tr>
                                    )}

                                    {!isDailyLoading && paginatedDailyLogs.map((log, index) => (
                                        <tr key={log.id} className={`group transition-colors ${editingDailyId === log.id ? (isDark ? 'bg-amber-950/20' : 'bg-amber-50/50') : (isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50/50')}`}>
                                            <td className={`p-3 pl-5 border-r text-center font-bold text-xs ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-100 text-slate-400'}`}>{(dailyPage - 1) * itemsPerPage + index + 1}</td>
                                            {editingDailyId === log.id ? (
                                                <>
                                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                        <CustomDatePicker value={editDailyForm.date} onChange={val => setEditDailyForm({ ...editDailyForm, date: val })} isDark={isDark} placeholder="Select date..." />
                                                    </td>
                                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                        <input type="text" value={editDailyForm.work_description} onChange={e => setEditDailyForm({ ...editDailyForm, work_description: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                                    </td>
                                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                        <input type="text" value={editDailyForm.qty} onChange={e => setEditDailyForm({ ...editDailyForm, qty: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium text-center focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                                    </td>
                                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                        <input type="text" value={editDailyForm.technician} onChange={e => setEditDailyForm({ ...editDailyForm, technician: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                                    </td>
                                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                        <input type="text" value={editDailyForm.address} onChange={e => setEditDailyForm({ ...editDailyForm, address: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                                    </td>
                                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                        <input type="text" value={editDailyForm.remarks} onChange={e => setEditDailyForm({ ...editDailyForm, remarks: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                                    </td>
                                                    <td className="p-1.5 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={handleSaveDailyEdit} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-green-950/30 text-green-450 hover:bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600 hover:bg-green-200'}`} title="Save">
                                                                <i className="fa-solid fa-check text-xs"></i>
                                                            </button>
                                                            <button onClick={() => setEditingDailyId(null)} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-slate-100 text-slate-550 hover:bg-slate-200'}`} title="Cancel">
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
                                                    <td className={`p-3 border-r italic whitespace-normal break-words ${isDark ? 'text-zinc-400 border-zinc-800' : 'text-slate-650 border-slate-100'}`}>{log.remarks || <span className={isDark ? 'text-zinc-600' : 'text-slate-305 text-slate-300'}>—</span>}</td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleStartDailyEdit(log)} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-blue-950/40 hover:text-blue-400' : 'bg-slate-100 text-slate-550 hover:bg-blue-100 hover:text-blue-600'}`} title="Edit">
                                                                <i className="fa-solid fa-pen text-xs"></i>
                                                            </button>
                                                            <button onClick={() => handleDeleteDaily(log.id)} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-500 hover:bg-red-950/40 hover:text-red-400' : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500'}`} title="Delete">
                                                                <i className="fa-solid fa-trash-can text-xs"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}

                                    {!isDailyLoading && filteredDailyLogs.length === 0 && !showNewDailyRow && (
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
                        <Pagination isDark={isDark} currentPage={dailyPage} totalPages={totalDailyPages} onPageChange={handleDailyPageChange} />
                    </div>
                )}

                {/* 2. Cash Flow Tab */}
                {activeTab === 'Cash-flow' && (
                    <div className="flex flex-col flex-1">
                        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 border-b gap-4 ${isDark ? 'bg-[#1e1e21] border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                            <h3 className={`text-xs font-black uppercase tracking-widest min-w-max ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Cash Flow Ledger</h3>
                            <div className="flex flex-1 items-center justify-end gap-3 w-full sm:w-auto">
                                <div className="relative flex items-center">
                                    {!isCashSearchExpanded && !cashSearch ? (
                                        <button
                                            onClick={() => { setIsCashSearchExpanded(true); setTimeout(() => cashSearchRef.current?.focus(), 50); }}
                                            className={`w-9 h-9 border rounded-lg flex items-center justify-center transition-all shadow-sm ${isDark ? 'bg-[#242427] border-zinc-800 text-zinc-400 hover:text-blue-400 hover:border-zinc-700' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300'}`}
                                            title="Search"
                                        >
                                            <i className="fa-solid fa-magnifying-glass text-xs"></i>
                                        </button>
                                    ) : (
                                        <div className="relative group animate-in fade-in slide-in-from-right-2 duration-200">
                                            <i className={`fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 transition-colors text-xs ${isDark ? 'text-zinc-400 group-focus-within:text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'}`}></i>
                                            <input
                                                ref={cashSearchRef}
                                                type="text"
                                                placeholder="Search source..."
                                                value={cashSearch}
                                                onChange={(e) => setCashSearch(e.target.value)}
                                                onBlur={() => { if (!cashSearch) setIsCashSearchExpanded(false); }}
                                                className={`w-full sm:w-56 pl-8 pr-8 py-2 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${isDark ? 'bg-[#242427] border-zinc-800 text-white placeholder-zinc-500 focus:ring-blue-500/20 focus:border-zinc-700' : 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                            />
                                            {cashSearch && (
                                                <button onClick={() => { setCashSearch(''); cashSearchRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                                                    <i className="fa-solid fa-xmark text-xs"></i>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => openDownloadModal('Cash-flow')} disabled={cashLogs.length === 0} className={`px-4 py-2 border font-bold text-xs rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 ${isDark ? 'bg-[#242427] text-blue-400 border-blue-950/40 hover:bg-blue-900/20' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}>
                                        <i className="fa-solid fa-download"></i> Download
                                    </button>
                                    <button onClick={() => setShowNewCashRow(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-blue-500/20 flex items-center gap-2">
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
                                        <th className={`p-3 border-b border-r w-[130px] text-right ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Received (₹)</th>
                                        <th className={`p-3 border-b border-r min-w-[150px] ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>From Source</th>
                                        <th className={`p-3 border-b border-r w-[130px] text-right ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Expenditure (₹)</th>
                                        <th className={`p-3 border-b border-r min-w-[150px] ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>On Source</th>
                                        <th className={`p-3 border-b border-r w-[130px] text-right ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Sent Home (₹)</th>
                                        <th className={`p-3 border-b border-r w-[130px] text-right ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Balance (₹)</th>
                                        <th className={`p-3 border-b w-24 text-center ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-zinc-800 bg-[#242427]' : 'divide-slate-100 bg-white'}`}>
                                    {showNewCashRow && (
                                        <tr className={`${isDark ? 'bg-blue-950/20' : 'bg-blue-50/50'} animate-in fade-in duration-200`}>
                                            <td className={`p-2 pl-5 border-r text-center font-bold text-xs ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-100 text-slate-400'}`}>
                                                <i className="fa-solid fa-asterisk text-blue-400"></i>
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <CustomDatePicker value={newCashRow.date} onChange={val => setNewCashRow({ ...newCashRow, date: val })} isDark={isDark} placeholder="Select date..." />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="number" min="0" step="1" value={newCashRow.received} onChange={e => setNewCashRow({ ...newCashRow, received: e.target.value })} placeholder="Received amt" className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium text-right focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="text" value={newCashRow.from_source} onChange={e => setNewCashRow({ ...newCashRow, from_source: e.target.value })} placeholder="e.g. Adv. Job #12" className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="number" min="0" step="1" value={newCashRow.expenditure} onChange={e => setNewCashRow({ ...newCashRow, expenditure: e.target.value })} placeholder="Spent amt" className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium text-right focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="text" value={newCashRow.on_source} onChange={e => setNewCashRow({ ...newCashRow, on_source: e.target.value })} placeholder="e.g. Copper pipes" className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                                            </td>
                                            <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                <input type="number" min="0" step="1" value={newCashRow.sent_home} onChange={e => setNewCashRow({ ...newCashRow, sent_home: e.target.value })} placeholder="Savings/Home" className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium text-right focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-zinc-600' : 'bg-white border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'}`} />
                                            </td>
                                            <td className={`p-3 border-r text-right font-bold ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-100 text-slate-400'}`}>
                                                ₹{(Number(newCashRow.received || 0) - Number(newCashRow.expenditure || 0)).toLocaleString()}
                                            </td>
                                            <td className="p-1.5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={handleAddCashRow} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-green-950/30 text-green-400 hover:bg-green-900/40' : 'bg-green-100 text-green-600 hover:bg-green-200'}`} title="Save">
                                                        <i className="fa-solid fa-check text-xs"></i>
                                                    </button>
                                                    <button onClick={() => { setShowNewCashRow(false); setNewCashRow({ date: new Date().toISOString().split('T')[0], received: '', from_source: '', expenditure: '', on_source: '', sent_home: '' }); }} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-red-950/30 text-red-400 hover:bg-red-900/40' : 'bg-red-100 text-red-500 hover:bg-red-200'}`} title="Cancel">
                                                        <i className="fa-solid fa-xmark text-xs"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {isCashLoading && (
                                        <tr><td colSpan={9} className={`p-8 text-center ${isDark ? 'text-zinc-550 text-zinc-500' : 'text-slate-400'}`}><i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</td></tr>
                                    )}

                                    {!isCashLoading && paginatedCashLogs.map((log, index) => (
                                        <tr key={log.id} className={`group transition-colors ${editingCashId === log.id ? (isDark ? 'bg-amber-950/20' : 'bg-amber-50/50') : (isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50/50')}`}>
                                            <td className={`p-3 pl-5 border-r text-center font-bold text-xs ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-100 text-slate-400'}`}>{(cashPage - 1) * itemsPerPage + index + 1}</td>
                                            {editingCashId === log.id ? (
                                                <>
                                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                        <CustomDatePicker value={editCashForm.date} onChange={val => setEditCashForm({ ...editCashForm, date: val })} isDark={isDark} placeholder="Select date..." />
                                                    </td>
                                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                        <input type="number" value={editCashForm.received} onChange={e => setEditCashForm({ ...editCashForm, received: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium text-right focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                                    </td>
                                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                        <input type="text" value={editCashForm.from_source} onChange={e => setEditCashForm({ ...editCashForm, from_source: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                                    </td>
                                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                        <input type="number" value={editCashForm.expenditure} onChange={e => setEditCashForm({ ...editCashForm, expenditure: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium text-right focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                                    </td>
                                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                        <input type="text" value={editCashForm.on_source} onChange={e => setEditCashForm({ ...editCashForm, on_source: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                                    </td>
                                                    <td className={`p-1.5 border-r ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                                                        <input type="number" value={editCashForm.sent_home} onChange={e => setEditCashForm({ ...editCashForm, sent_home: e.target.value })} className={`w-full border rounded-lg px-2 py-1.5 text-sm font-medium text-right focus:ring-2 outline-none ${isDark ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-amber-500/20 focus:border-zinc-600' : 'bg-white border-amber-300 focus:ring-amber-500/20 focus:border-amber-500'}`} />
                                                    </td>
                                                    <td className={`p-3 border-r text-right font-bold ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-100 text-slate-400'}`}>
                                                        ₹{(Number(editCashForm.received || 0) - Number(editCashForm.expenditure || 0)).toLocaleString()}
                                                    </td>
                                                    <td className="p-1.5 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={handleSaveCashEdit} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-green-950/30 text-green-400 hover:bg-green-900/40' : 'bg-green-100 text-green-600 hover:bg-green-200'}`} title="Save">
                                                                <i className="fa-solid fa-check text-xs"></i>
                                                            </button>
                                                            <button onClick={() => setEditingCashId(null)} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-slate-100 text-slate-550 hover:bg-slate-200'}`} title="Cancel">
                                                                <i className="fa-solid fa-xmark text-xs"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className={`p-3 border-r font-medium whitespace-nowrap ${isDark ? 'text-zinc-350 border-zinc-800' : 'text-slate-700 border-slate-100'}`}>{new Date(log.date).toLocaleDateString()}</td>
                                                    <td className={`p-3 border-r font-bold text-right text-emerald-600 ${isDark ? 'border-zinc-800 text-emerald-400' : 'border-slate-100'}`}>₹{Number(log.received).toLocaleString()}</td>
                                                    <td className={`p-3 border-r font-medium whitespace-normal break-words ${isDark ? 'text-zinc-200 border-zinc-800' : 'text-slate-700 border-slate-100'}`}>{log.from_source || <span className={isDark ? 'text-zinc-600 italic' : 'text-slate-300 italic'}>—</span>}</td>
                                                    <td className={`p-3 border-r font-bold text-right text-red-600 ${isDark ? 'border-zinc-800 text-red-400' : 'border-slate-100'}`}>₹{Number(log.expenditure).toLocaleString()}</td>
                                                    <td className={`p-3 border-r font-medium whitespace-normal break-words ${isDark ? 'text-zinc-200 border-zinc-800' : 'text-slate-700 border-slate-100'}`}>{log.on_source || <span className={isDark ? 'text-zinc-600 italic' : 'text-slate-300 italic'}>—</span>}</td>
                                                    <td className={`p-3 border-r font-semibold text-right text-blue-600 ${isDark ? 'border-zinc-800 text-blue-400' : 'border-slate-100'}`}>₹{Number(log.sent_home).toLocaleString()}</td>
                                                    <td className={`p-3 border-r font-black text-right ${log.balance >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-700') : (isDark ? 'text-red-400' : 'text-red-700')} ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>₹{Number(log.balance).toLocaleString()}</td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleStartCashEdit(log)} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-blue-950/40 hover:text-blue-450' : 'bg-slate-100 text-slate-550 hover:bg-blue-100 hover:text-blue-600'}`} title="Edit">
                                                                <i className="fa-solid fa-pen text-xs"></i>
                                                            </button>
                                                            <button onClick={() => handleDeleteCash(log.id)} className={`w-7 h-7 rounded-lg transition-colors flex items-center justify-center ${isDark ? 'bg-zinc-800 text-zinc-500 hover:bg-red-950/40 hover:text-red-400' : 'bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-500'}`} title="Delete">
                                                                <i className="fa-solid fa-trash-can text-xs"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}

                                    {!isCashLoading && filteredCashLogs.length === 0 && !showNewCashRow && (
                                        <tr>
                                            <td colSpan={9} className="p-12 text-center">
                                                <div className="space-y-3">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                                                        <i className={`fa-solid fa-search text-2xl ${isDark ? 'text-zinc-650 text-zinc-600' : 'text-slate-300'}`}></i>
                                                    </div>
                                                    <p className={`font-medium text-sm ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>No cash flow logs found.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination isDark={isDark} currentPage={cashPage} totalPages={totalCashPages} onPageChange={handleCashPageChange} />
                    </div>
                )}

                {/* 3. Inventory Logs Tab */}
                {activeTab === 'Inventory-logs' && (
                    <div className="flex flex-col flex-1">
                        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 border-b gap-4 ${isDark ? 'bg-[#1e1e21] border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                            <h3 className={`text-xs font-black uppercase tracking-widest min-w-max ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Inventory Audit Trail (Full)</h3>
                            <div className="flex flex-1 items-center justify-end gap-3 w-full sm:w-auto">
                                <div className="relative flex items-center">
                                    {!isInventorySearchExpanded && !inventorySearch ? (
                                        <button
                                            onClick={() => { setIsInventorySearchExpanded(true); setTimeout(() => inventorySearchRef.current?.focus(), 50); }}
                                            className={`w-9 h-9 border rounded-lg flex items-center justify-center transition-all shadow-sm ${isDark ? 'bg-[#242427] border-zinc-800 text-zinc-400 hover:text-blue-400 hover:border-zinc-700' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300'}`}
                                            title="Search"
                                        >
                                            <i className="fa-solid fa-magnifying-glass text-xs"></i>
                                        </button>
                                    ) : (
                                        <div className="relative group animate-in fade-in slide-in-from-right-2 duration-200">
                                            <i className={`fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 transition-colors text-xs ${isDark ? 'text-zinc-400 group-focus-within:text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'}`}></i>
                                            <input
                                                ref={inventorySearchRef}
                                                type="text"
                                                placeholder="Search model, user, customer..."
                                                value={inventorySearch}
                                                onChange={(e) => setInventorySearch(e.target.value)}
                                                onBlur={() => { if (!inventorySearch) setIsInventorySearchExpanded(false); }}
                                                className={`w-full sm:w-56 pl-8 pr-8 py-2 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${isDark ? 'bg-[#242427] border-zinc-800 text-white placeholder-zinc-500 focus:ring-blue-500/20 focus:border-zinc-700' : 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                            />
                                            {inventorySearch && (
                                                <button onClick={() => { setInventorySearch(''); inventorySearchRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                                                    <i className="fa-solid fa-xmark text-xs"></i>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => openDownloadModal('Inventory-logs')} disabled={inventoryLogs.length === 0} className={`px-4 py-2 border font-bold text-xs rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 ${isDark ? 'bg-[#242427] text-blue-400 border-blue-950/40 hover:bg-blue-900/20' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}>
                                    <i className="fa-solid fa-download"></i> Download
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className={`${isDark ? 'bg-[#1e1e21] text-zinc-400' : 'bg-slate-100 text-slate-500'} text-[10px] uppercase font-black tracking-wider`}>
                                    <tr>
                                        <th className="px-6 py-4">Date / Time</th>
                                        <th className="px-6 py-4">Product Model</th>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Action</th>
                                        <th className="px-6 py-4">Customer</th>
                                        <th className="px-6 py-4 text-center">Change</th>
                                        <th className="px-6 py-4 text-center">Available Stock</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60 bg-[#242427]' : 'divide-slate-100 bg-white'}`}>
                                    {isInventoryLoading && (
                                        <tr><td colSpan={7} className={`p-8 text-center ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}><i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</td></tr>
                                    )}

                                    {!isInventoryLoading && paginatedInventoryLogs.map(log => (
                                        <tr key={log.id} className={`transition-colors ${isDark ? 'hover:bg-zinc-800/20' : 'hover:bg-slate-50'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-650">
                                                <div className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>{new Date(log.createdAt).toLocaleDateString('en-GB')}</div>
                                                <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{new Date(log.createdAt).toLocaleTimeString('en-US')}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className={`font-bold ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}>{log.modelName || 'Unknown Model'}</div>
                                                <div className={`text-[10px] uppercase ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{log.brand}</div>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-zinc-350' : 'text-slate-700'}`}>
                                                {log.userEmail}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                                                    log.actionType === 'ADDED_STOCK' ? (isDark ? 'bg-blue-950/40 text-blue-400 border border-blue-900/30' : 'bg-blue-100 text-blue-700') :
                                                    log.actionType === 'SOLD_STOCK' ? (isDark ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' : 'bg-emerald-100 text-emerald-700') :
                                                    log.actionType === 'RETURNED_STOCK' ? (isDark ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30' : 'bg-indigo-100 text-indigo-700') :
                                                    (isDark ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' : 'bg-amber-100 text-amber-700')
                                                }`}>
                                                    {log.actionType === 'RETURNED_STOCK' ? 'RETURN' : log.actionType.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                                                {log.customerName ? (
                                                    <div className="flex flex-col">
                                                        <span className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>{log.customerName}</span>
                                                        {log.jobId && <span className={`text-[10px] font-medium ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Job #{log.jobId}</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 font-medium">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center font-bold">
                                                <span className={log.quantityChange > 0 ? (isDark ? 'text-blue-400' : 'text-blue-600') : log.quantityChange < 0 ? (isDark ? 'text-red-400' : 'text-red-500') : (isDark ? 'text-zinc-400' : 'text-slate-500')}>
                                                    {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-center font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-750 text-slate-700'}`}>
                                                {log.newQuantity}
                                            </td>
                                        </tr>
                                    ))}

                                    {!isInventoryLoading && filteredInventoryLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-slate-500">
                                                No inventory logs recorded yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination isDark={isDark} currentPage={inventoryPage} totalPages={totalInventoryPages} onPageChange={handleInventoryPageChange} />
                    </div>
                )}

                {/* 4. Copper Logs Tab */}
                {activeTab === 'Copper-logs' && (
                    <div className="flex flex-col flex-1">
                        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 border-b gap-4 ${isDark ? 'bg-[#1e1e21] border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                            <h3 className={`text-xs font-black uppercase tracking-widest min-w-max ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Copper Pipe Audit Trail (Full)</h3>
                            <div className="flex flex-1 items-center justify-end gap-3 w-full sm:w-auto">
                                <div className="relative flex items-center">
                                    {!isCopperSearchExpanded && !copperSearch ? (
                                        <button
                                            onClick={() => { setIsCopperSearchExpanded(true); setTimeout(() => copperSearchRef.current?.focus(), 50); }}
                                            className={`w-9 h-9 border rounded-lg flex items-center justify-center transition-all shadow-sm ${isDark ? 'bg-[#242427] border-zinc-800 text-zinc-400 hover:text-blue-400 hover:border-zinc-700' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300'}`}
                                            title="Search"
                                        >
                                            <i className="fa-solid fa-magnifying-glass text-xs"></i>
                                        </button>
                                    ) : (
                                        <div className="relative group animate-in fade-in slide-in-from-right-2 duration-200">
                                            <i className={`fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 transition-colors text-xs ${isDark ? 'text-zinc-400 group-focus-within:text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'}`}></i>
                                            <input
                                                ref={copperSearchRef}
                                                type="text"
                                                placeholder="Search pipe size, origin..."
                                                value={copperSearch}
                                                onChange={(e) => setCopperSearch(e.target.value)}
                                                onBlur={() => { if (!copperSearch) setIsCopperSearchExpanded(false); }}
                                                className={`w-full sm:w-56 pl-8 pr-8 py-2 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 ${isDark ? 'bg-[#242427] border-zinc-800 text-white placeholder-zinc-500 focus:ring-blue-500/20 focus:border-zinc-700' : 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                            />
                                            {copperSearch && (
                                                <button onClick={() => { setCopperSearch(''); copperSearchRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                                                    <i className="fa-solid fa-xmark text-xs"></i>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => openDownloadModal('Copper-logs')} disabled={copperLogs.length === 0} className={`px-4 py-2 border font-bold text-xs rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 ${isDark ? 'bg-[#242427] text-blue-400 border-blue-950/40 hover:bg-blue-900/20' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}>
                                    <i className="fa-solid fa-download"></i> Download
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className={`${isDark ? 'bg-[#1e1e21] text-zinc-400' : 'bg-slate-100 text-slate-500'} text-[10px] uppercase font-black tracking-wider`}>
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Pipe Size</th>
                                        <th className="px-6 py-4">Origin</th>
                                        <th className="px-6 py-4 text-center">Sent Qty</th>
                                        <th className="px-6 py-4 text-center">Returned Qty</th>
                                        <th className="px-6 py-4 text-center">Net Used</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60 bg-[#242427]' : 'divide-slate-100 bg-white'}`}>
                                    {isCopperLoading && (
                                        <tr><td colSpan={6} className={`p-8 text-center ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}><i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading...</td></tr>
                                    )}

                                    {!isCopperLoading && paginatedCopperLogs.map(log => {
                                        const netUsed = Number(log.sentQty || 0) - Number(log.returnQty || 0);
                                        return (
                                            <tr key={`${log.origin || 'warehouse'}-${log.id}`} className={`transition-colors ${isDark ? 'hover:bg-zinc-800/20' : 'hover:bg-slate-50'}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-850 text-slate-800'}`}>{log.date}</div>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap font-bold ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>
                                                    {log.size}"
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {log.origin !== 'warehouse' ? (
                                                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${isDark ? 'bg-blue-950/40 border-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                            {log.origin === 'job' ? 'Job site' : log.origin}
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>Warehouse</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-red-650 text-red-600 font-semibold">
                                                    {Number(log.sentQty).toFixed(1)} ft
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-emerald-650 text-emerald-600 font-semibold">
                                                    {Number(log.returnQty).toFixed(1)} ft
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-center font-bold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                                                    {netUsed.toFixed(1)} ft
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {!isCopperLoading && filteredCopperLogs.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-500">
                                                No copper history logs recorded yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination isDark={isDark} currentPage={copperPage} totalPages={totalCopperPages} onPageChange={handleCopperPageChange} />
                    </div>
                )}
            </div>

            {/* Date Range Selector Modal for CSV Download */}
            {isDownloadModalOpen && createPortal(
                <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden" style={{ margin: 0 }}>
                    <div className={`rounded-2xl shadow-xl w-full max-w-md flex flex-col border relative overflow-visible ${
                        isDark ? 'bg-[#242427] border-zinc-800 text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                        {/* Header */}
                        <div className={`p-5 border-b flex justify-between items-center rounded-t-2xl ${
                            isDark ? 'bg-[#1e1e21] border-zinc-800' : 'bg-slate-50 border-slate-100'
                        }`}>
                            <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                                <i className="fa-solid fa-download text-blue-500"></i> Download {
                                    downloadTab === 'Daily-Work' ? 'Daily Work' :
                                    downloadTab === 'Cash-flow' ? 'Cash Flow' :
                                    downloadTab === 'Inventory-logs' ? 'Inventory' :
                                    downloadTab === 'Copper-logs' ? 'Copper' : ''
                                } Logs
                            </h3>
                            <button onClick={() => setIsDownloadModalOpen(false)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                            }`}>
                                <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                        </div>
                        {/* Body */}
                        <div className="p-6 space-y-4 overflow-visible">
                            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                Select a date range to filter and download the logs in CSV format.
                            </p>
                            <div className="grid grid-cols-2 gap-4 overflow-visible">
                                <div className="space-y-1.5 relative overflow-visible">
                                    <label className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Start Date</label>
                                    <CustomDatePicker value={downloadStartDate} onChange={setDownloadStartDate} isDark={isDark} placeholder="From..." />
                                </div>
                                <div className="space-y-1.5 relative overflow-visible">
                                    <label className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-550 text-slate-500'}`}>End Date</label>
                                    <CustomDatePicker value={downloadEndDate} onChange={setDownloadEndDate} isDark={isDark} placeholder="To..." />
                                </div>
                            </div>
                        </div>
                        {/* Footer */}
                        <div className={`p-4 border-t flex justify-end gap-2.5 rounded-b-2xl ${
                            isDark ? 'bg-[#1e1e21] border-zinc-800' : 'bg-slate-50 border-slate-100'
                        }`}>
                            <button
                                onClick={() => setIsDownloadModalOpen(false)}
                                className={`px-4 py-2 border rounded-lg font-bold text-xs transition-colors ${
                                    isDark ? 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border-zinc-700/60' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDownloadRange}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                            >
                                <i className="fa-solid fa-download"></i> Download
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
