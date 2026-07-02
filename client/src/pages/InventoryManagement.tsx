import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { useAuth, useSettings } from '../context/AppContext';
import { useRealtimeListener } from '../components/RealtimeProvider';
import { api } from '../lib/api';
import Pagination from '../components/Pagination';
import { toast } from 'sonner';
import CustomSelect from '../components/CustomSelect';



interface InventoryItem {
    id: number;
    modelName: string;
    brand: 'Mitsubishi' | 'Akabishi';
    type: string;
    tonnage: string;
    starRating: string;
    quantity: number;
    soldQuantity: number;
    ourPrice: number;
    salePrice: number;
    createdAt: string;
    updatedAt: string;
}

interface HistoryRecord {
    id: number;
    modelName?: string;
    brand?: string;
    userEmail: string;
    actionType: 'ADDED_STOCK' | 'SOLD_STOCK' | 'UPDATED_DETAILS' | 'RETURNED_STOCK';
    quantityChange: number;
    previousQuantity: number;
    newQuantity: number;
    createdAt: string;
    customerName?: string;
    jobId?: number;
}

const InventoryManagement: React.FC = () => {
    const { token, user } = useAuth();
    const { isDark = false } = useOutletContext<{ isDark?: boolean }>() || {};
    const { lowStockThreshold, enableLowStockAlert, copperPipeLowStockThreshold, enableCopperPipeLowStockAlert } = useSettings();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'Mitsubishi' | 'Akabishi' | 'Copper'>('Mitsubishi');
    const [lastSoldItem, setLastSoldItem] = useState<{ id: number, quantity: number, soldQuantity: number } | null>(null);
    const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const itemsPerPage = 10;

    // Copper inventory states
    const [copperInventoryLogs, setCopperInventoryLogs] = useState<any[]>([]);
    const [copperHistoryLogs, setCopperHistoryLogs] = useState<any[]>([]);
    const [loadingCopper, setLoadingCopper] = useState(false);
    const [copperFormData, setCopperFormData] = useState({
        size: '',
        totalInStock: '',
        sentQty: '',
        returnQty: '',
        groupName: 'Standard Sizes'
    });
    const [editingCopperItem, setEditingCopperItem] = useState<any | null>(null);
    const [customGroups, setCustomGroups] = useState<string[]>([]);
    const [draggingOverGroup, setDraggingOverGroup] = useState<{ [key: string]: boolean }>({});

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [addQtyAmount, setAddQtyAmount] = useState<number>(0);
    const [isEditingFullDetails, setIsEditingFullDetails] = useState(false);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyLogs, setHistoryLogs] = useState<HistoryRecord[]>([]);

    const [formData, setFormData] = useState({
        modelName: '',
        brand: 'Mitsubishi' as 'Mitsubishi' | 'Akabishi',
        type: 'Inverter',
        tonnage: '',
        starRating: '',
        quantity: 0,
        soldQuantity: 0,
        ourPrice: 0,
        salePrice: 0
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    const fetchInventory = async () => {
        try {
            setIsLoading(true);
            const data = await api.get('/inventory');
            setItems(data);
        } catch (err: any) {
            console.error("Inventory Fetch Error:", err);
            setError(err.message || 'Failed to fetch inventory');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCopperLogs = async () => {
        try {
            setLoadingCopper(true);
            const [stockRes, logsRes] = await Promise.all([
                api.get('/inventory/copper').catch(() => []),
                api.get('/inventory/copper/logs').catch(() => [])
            ]);
            setCopperInventoryLogs(stockRes);
            setCopperHistoryLogs(logsRes);
        } catch (err: any) {
            console.error("Failed to fetch copper logs:", err);
        } finally {
            setLoadingCopper(false);
        }
    };

    useEffect(() => {
        fetchInventory();
        fetchCopperLogs();
    }, [token]);

    useRealtimeListener('inventory', () => {
        fetchInventory();
        fetchCopperLogs();
    });

    useEffect(() => {
        const stored = localStorage.getItem('satguru_copper_groups');
        let groups = ['Standard Sizes', 'Home Sizes'];
        if (stored) {
            try {
                groups = JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse stored groups:', e);
            }
        }
        
        if (!groups.includes('Standard Sizes')) {
            groups.unshift('Standard Sizes');
        }

        const databaseGroups = Array.from(new Set(
            copperInventoryLogs
                .map(item => item.groupName || 'Standard Sizes')
        ));
        
        const merged = Array.from(new Set([...groups, ...databaseGroups]));
        setCustomGroups(merged);
        localStorage.setItem('satguru_copper_groups', JSON.stringify(merged));
    }, [copperInventoryLogs]);

    const handleAddGroup = () => {
        const name = window.prompt('Enter new group name:');
        if (!name) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        
        if (customGroups.includes(trimmed)) {
            toast.error('A group with this name already exists');
            return;
        }
        
        const updated = [...customGroups, trimmed];
        setCustomGroups(updated);
        localStorage.setItem('satguru_copper_groups', JSON.stringify(updated));
    };

    const handleDeleteGroup = (groupName: string) => {
        if (groupName === 'Standard Sizes') {
            toast.error('Cannot delete the default Standard Sizes group');
            return;
        }
        toast.error(`Delete size group "${groupName}"?`, {
            description: `All copper sizes in this group will be moved to "Standard Sizes".`,
            action: {
                label: "Delete Group",
                onClick: async () => {
                    try {
                        const itemsInGroup = copperInventoryLogs.filter(item => (item.groupName || 'Standard Sizes') === groupName);
                        
                        for (const item of itemsInGroup) {
                            await api.put(`/inventory/copper/group/${item.id}`, { groupName: 'Standard Sizes' });
                        }
                        
                        const updated = customGroups.filter(grp => grp !== groupName);
                        setCustomGroups(updated);
                        localStorage.setItem('satguru_copper_groups', JSON.stringify(updated));
                        toast.success("Group deleted successfully");
                        fetchCopperLogs();
                    } catch (err: any) {
                        toast.error(err.message || 'Failed to delete group');
                    }
                }
            }
        });
    };

    const openModal = (item?: InventoryItem, copperItem?: any) => {
        if (activeTab === 'Copper') {
            if (copperItem) {
                setEditingCopperItem(copperItem);
                setCopperFormData({
                    size: copperItem.size,
                    totalInStock: '',
                    sentQty: '',
                    returnQty: '',
                    groupName: copperItem.groupName || 'Standard Sizes'
                });
            } else {
                setEditingCopperItem(null);
                setCopperFormData({
                    size: '',
                    totalInStock: '',
                    sentQty: '',
                    returnQty: '',
                    groupName: 'Standard Sizes'
                });
            }
        } else if (item) {
            setEditingItem(item);
            setAddQtyAmount(0);
        } else {
            setEditingItem(null);
            setFormData({
                modelName: '',
                brand: activeTab,
                type: 'Inverter',
                tonnage: '',
                starRating: '',
                quantity: 0,
                soldQuantity: 0,
                ourPrice: 0,
                salePrice: 0
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
        setEditingCopperItem(null);
        setAddQtyAmount(0);
        setIsEditingFullDetails(false);
    };

    const handleDeleteCopperLog = (logId: number) => {
        toast.error("Delete copper log entry?", {
            description: "Are you sure you want to delete this copper log entry?",
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await api.delete(`/inventory/copper/logs/${logId}`);
                        toast.success("Copper log entry deleted successfully");
                        fetchCopperLogs();
                    } catch (err: any) {
                        toast.error(err.message || 'Failed to delete copper log entry');
                    }
                }
            }
        });
    };

    const handleDeleteCopperSize = (id: number) => {
        toast.error("Delete copper size?", {
            description: "Are you sure you want to delete this copper size? This will also delete all associated warehouse logs and job material logs.",
            action: {
                label: "Delete Size",
                onClick: async () => {
                    try {
                        await api.delete(`/inventory/copper/${id}`);
                        toast.success("Copper size deleted successfully");
                        fetchCopperLogs();
                    } catch (err: any) {
                        toast.error(err.message || 'Failed to delete copper size');
                    }
                }
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (activeTab === 'Copper') {
                if (editingCopperItem) {
                    const payload = {
                        size: copperFormData.size,
                        sentQty: Number(copperFormData.sentQty || 0),
                        returnQty: Number(copperFormData.returnQty || 0)
                    };
                    await api.put(`/inventory/copper/${editingCopperItem.id}`, payload);
                } else {
                    const group = copperFormData.groupName || 'Standard Sizes';
                    let sizeVal = copperFormData.size.trim();
                    if (group !== 'Standard Sizes' && !sizeVal.toLowerCase().startsWith(group.toLowerCase() + ' ')) {
                        sizeVal = group + ' ' + sizeVal;
                    }
                    const payload = {
                        size: sizeVal,
                        totalInStock: Number(copperFormData.totalInStock || 0),
                        groupName: group
                    };
                    await api.post('/inventory/copper', payload);
                }
                fetchCopperLogs();
                closeModal();
                return;
            }

            if (editingItem) {
                if (isEditingFullDetails) {
                    await api.put(`/inventory/${editingItem.id}`, formData);
                } else {
                    // When editing just stock, we ONLY update the quantity by adding the new amount
                    const updatedData = {
                        modelName: editingItem.modelName,
                        brand: editingItem.brand,
                        type: editingItem.type,
                        tonnage: editingItem.tonnage,
                        starRating: editingItem.starRating,
                        quantity: editingItem.quantity + addQtyAmount,
                        soldQuantity: editingItem.soldQuantity,
                        ourPrice: editingItem.ourPrice,
                        salePrice: editingItem.salePrice
                    };
                    await api.put(`/inventory/${editingItem.id}`, updatedData);
                }
            } else {
                await api.post('/inventory', formData);
            }

            fetchInventory();
            closeModal();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save item');
        }
    };

    const fetchHistory = async () => {
        if (activeTab === 'Copper') {
            setIsHistoryModalOpen(true);
            setHistoryPage(1);
            return;
        }
        try {
            const data = await api.get('/inventory/history');
            setHistoryLogs(data);
            setHistoryPage(1);
            setIsHistoryModalOpen(true);
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch history');
        }
    };

    const closeHistoryModal = () => {
        setIsHistoryModalOpen(false);
        setHistoryLogs([]);
    };

    const handleSold = async (item: InventoryItem) => {
        if (item.quantity <= 0) {
            toast.error('Out of stock!');
            return;
        }
        try {
            const updatedData = {
                modelName: item.modelName,
                brand: item.brand,
                type: item.type || 'Inverter',
                tonnage: item.tonnage || '',
                starRating: item.starRating || '',
                quantity: item.quantity - 1,
                soldQuantity: (item.soldQuantity || 0) + 1,
                ourPrice: item.ourPrice,
                salePrice: item.salePrice
            };

            await api.put(`/inventory/${item.id}`, updatedData);

            // Track for potential undo operations
            setLastSoldItem({
                id: item.id,
                quantity: item.quantity,
                soldQuantity: item.soldQuantity
            });
            toast.success(`${item.modelName} marked as sold`);
            fetchInventory();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update sold status');
        }
    };

    const handleUndo = async () => {
        if (!lastSoldItem) return;

        try {
            const itemToRevert = items.find(i => i.id === lastSoldItem.id);
            if (!itemToRevert) return;

            const revertedData = {
                modelName: itemToRevert.modelName,
                brand: itemToRevert.brand,
                type: itemToRevert.type || 'Inverter',
                tonnage: itemToRevert.tonnage || '',
                starRating: itemToRevert.starRating || '',
                quantity: lastSoldItem.quantity,
                soldQuantity: lastSoldItem.soldQuantity,
                ourPrice: itemToRevert.ourPrice,
                salePrice: itemToRevert.salePrice
            };

            await api.put(`/inventory/${lastSoldItem.id}`, revertedData);
            setLastSoldItem(null);
            toast.success("Action undone successfully");
            fetchInventory();
        } catch (err: any) {
            toast.error(err.message || 'Failed to undo action');
        }
    };

    const handleDelete = (id: number) => {
        const itemToDelete = items.find(i => i.id === id);
        toast.error("Delete inventory item?", {
            description: `Are you sure you want to delete ${itemToDelete ? itemToDelete.modelName : 'this item'}?`,
            action: {
                label: "Delete",
                onClick: async () => {
                    try {
                        await api.delete(`/inventory/${id}`);
                        toast.success("Item deleted successfully!");
                        fetchInventory();
                    } catch (err: any) {
                        toast.error(err.message || 'Failed to delete item');
                    }
                }
            }
        });
    };

    const filteredItems = items.filter(item => item.brand === (activeTab === 'Copper' ? 'Mitsubishi' : activeTab));
    const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalItemsPages = Math.ceil(filteredItems.length / itemsPerPage);

    const copperSummary = copperInventoryLogs.map(item => ({
        id: item.id,
        size: item.size,
        groupName: item.groupName || 'Standard Sizes',
        totalInStock: Number(item.totalInStock || 0)
    }));

    const getCopperSizeTotals = (size: string) => {
        let sent = 0;
        let returned = 0;
        const todayStr = new Date().toISOString().split('T')[0];

        copperHistoryLogs.forEach(log => {
            if (log.size === size && log.date === todayStr) {
                sent += Number(log.sentQty || 0);
                returned += Number(log.returnQty || 0);
            }
        });
        return { sent, returned };
    };

    const formatSize = (size: string, groupName?: string) => {
        let clean = size;
        if (groupName && groupName !== 'Standard Sizes') {
            const escapedGroup = groupName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const prefix = new RegExp('^' + escapedGroup + '\\s+', 'i');
            clean = clean.replace(prefix, '');
        }
        clean = clean.replace(/^(Homes|Home)\s+/i, '').trim().replace(/"/g, '');
        return `${clean}"`;
    };

    const handleCopperDrop = async (e: React.DragEvent, targetGroup: string) => {
        e.preventDefault();
        const dataStr = e.dataTransfer.getData('text/plain');
        if (!dataStr) return;
        
        try {
            const dragData = JSON.parse(dataStr) as { id: number; size: string };
            const { id } = dragData;
            
            await api.put(`/inventory/copper/group/${id}`, { groupName: targetGroup });
            fetchCopperLogs();
        } catch (err: any) {
            console.error("Failed to move size group:", err);
            toast.error(err.message || 'Failed to move size group.');
        }
    };

    const renderCopperCard = (summary: { id: number; size: string; groupName: string; totalInStock: number }) => {
        const { sent, returned } = getCopperSizeTotals(summary.size);
        const originalItem = copperInventoryLogs.find(item => item.size === summary.size);
        
        return (
            <div 
                key={summary.size} 
                draggable={true}
                onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({ id: summary.id, size: summary.size }));
                }}
                onClick={() => originalItem && openModal(undefined, originalItem)}
                className={`p-3.5 rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 cursor-grab active:cursor-grabbing select-none group relative ${
                    isDark 
                        ? 'bg-[#242427] border-zinc-800/80 hover:border-blue-500 text-white' 
                        : 'bg-white border-slate-200/60 hover:border-blue-300 text-slate-800'
                }`}
                title="Drag to group, or click to record movement"
            >
                <div>
                    <div className="flex justify-between items-baseline">
                        <span className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {formatSize(summary.size, summary.groupName)}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className={`text-lg font-extrabold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                {summary.totalInStock.toFixed(1)} ft
                            </span>
                            {(user?.role === 'superadmin' || user?.role === 'admin') && originalItem && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteCopperSize(originalItem.id);
                                    }}
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all md:opacity-0 md:group-hover:opacity-100 shrink-0 ${
                                        isDark 
                                            ? 'text-zinc-500 hover:text-red-400 hover:bg-red-950/40' 
                                            : 'text-slate-350 text-slate-300 hover:text-red-600 hover:bg-red-50'
                                    }`}
                                    title="Delete Size from Stock"
                                >
                                    <i className="fa-solid fa-trash-can text-[10px]"></i>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className={`flex justify-between items-center text-[9px] uppercase tracking-widest font-black mt-0.5 ${
                        isDark ? 'text-zinc-500' : 'text-slate-400'
                    }`}>
                        <span>Copper Diameter</span>
                        <span>In Stock</span>
                    </div>
                </div>
                <div className={`mt-3 pt-2.5 border-t grid grid-cols-2 gap-2 text-[10px] ${
                    isDark ? 'border-zinc-800' : 'border-slate-100'
                }`}>
                    <div className="flex flex-col">
                        <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} font-medium`}>Sent</span>
                        <span className="font-bold text-red-500">{sent.toFixed(1)} ft</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} font-medium`}>Returned</span>
                        <span className="font-bold text-emerald-500">{returned.toFixed(1)} ft</span>
                    </div>
                </div>
            </div>
        );
    };

    const lowStockItems = enableLowStockAlert ? items.filter(i => i.quantity <= lowStockThreshold) : [];
    const lowStockCopperItems = enableCopperPipeLowStockAlert ? copperSummary.filter(c => c.totalInStock <= copperPipeLowStockThreshold) : [];
    const activeLowStockCount = activeTab === 'Copper' ? lowStockCopperItems.length : lowStockItems.length;
    const isAlertEnabledForTab = activeTab === 'Copper' ? enableCopperPipeLowStockAlert : enableLowStockAlert;

    if (isLoading) return <div className="p-6">Loading inventory...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Inventory Management</h1>
                    <p className={`${isDark ? 'text-zinc-400' : 'text-slate-500'} text-sm mt-1`}>Manage stock, pricing, and product details</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {lastSoldItem && (
                        <button
                            onClick={handleUndo}
                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border ${
                                isDark 
                                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                        >
                            <i className="fa-solid fa-rotate-left"></i>
                            Undo
                        </button>
                    )}
                    <div className={`flex items-center gap-2 mr-2 p-1.5 rounded-xl border ${
                        isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                        <button
                            onClick={fetchHistory}
                            title="Global Audit History"
                            className={`w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm transition-colors ${
                                isDark 
                                    ? 'text-amber-400 bg-amber-950/20 hover:bg-amber-900/20 border-amber-950/40' 
                                    : 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200'
                            }`}
                        >
                            <i className="fa-solid fa-history text-lg"></i>
                        </button>
                        {isAlertEnabledForTab && (
                            <button
                                onClick={() => setIsLowStockModalOpen(true)}
                                title={activeTab === 'Copper' ? "Low Copper Pipe Alerts" : "Low Stock Alerts"}
                                className={`relative w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm transition-colors ${
                                    isDark 
                                        ? 'text-red-400 bg-red-950/20 hover:bg-red-900/20 border-red-950/40' 
                                        : 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'
                                }`}
                            >
                                <i className="fa-solid fa-triangle-exclamation text-lg"></i>
                                {activeLowStockCount > 0 && (
                                    <span className={`absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 shadow-sm ${
                                        isDark ? 'border-[#1e1e21]' : 'border-white'
                                    }`}>
                                        {activeLowStockCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-blue-500/30 transition-all flex items-center gap-2"
                    >
                        <i className="fa-solid fa-plus"></i>
                        {activeTab === 'Copper' ? 'Copper Pipe' : 'Add Product'}
                    </button>
                </div>
            </div>

            <div className={`rounded-2xl shadow-sm border overflow-hidden ${
                isDark ? 'bg-[#242427] border-zinc-800' : 'bg-white border-slate-200'
            }`}>
                {/* Tabs */}
                <div className={`flex border-b ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <button
                        className={`flex-1 py-4 text-sm font-semibold text-center transition-colors ${
                            activeTab === 'Mitsubishi' 
                                ? isDark ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-950/20' : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                                : isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                        onClick={() => setActiveTab('Mitsubishi')}
                    >
                        Mitsubishi
                    </button>
                    <button
                        className={`flex-1 py-4 text-sm font-semibold text-center transition-colors ${
                            activeTab === 'Akabishi' 
                                ? isDark ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-950/20' : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                                : isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                        onClick={() => setActiveTab('Akabishi')}
                    >
                        Akabishi
                    </button>
                    <button
                        className={`flex-1 py-4 text-sm font-semibold text-center transition-colors ${
                            activeTab === 'Copper' 
                                ? isDark ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-950/20' : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' 
                                : isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                        onClick={() => setActiveTab('Copper')}
                    >
                        Copper Pipe
                    </button>
                </div>

                {/* AC Brand Table (Mitsubishi / Akabishi) */}
                {(activeTab === 'Mitsubishi' || activeTab === 'Akabishi') && (
                <div className="w-full">
                    <table className="w-full text-left text-sm block sm:table table-fixed">
                        <thead className={`hidden sm:table-header-group uppercase text-[10px] sm:text-xs font-semibold border-b ${
                            isDark ? 'bg-[#1e1e21] text-zinc-400 border-zinc-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                            <tr>
                                <th className="px-3 py-3 w-auto whitespace-nowrap">Model Name</th>
                                <th className="px-3 py-3 w-[12%] sm:w-auto">Type</th>
                                <th className="px-2 py-3 w-[8%] sm:w-auto">Ton</th>
                                <th className="px-3 py-3 w-[10%] sm:w-auto">Cost</th>
                                <th className="px-3 py-3 w-[10%] sm:w-auto">Sale</th>
                                <th className="px-2 py-3 w-[6%] sm:w-[6%] text-center">Qty</th>
                                <th className="px-2 py-3 w-[6%] sm:w-[6%] text-center">Sold</th>
                                <th className="px-1 py-3 hidden lg:table-cell w-[8%] whitespace-nowrap">Updated</th>
                                <th className="px-3 py-3 text-right w-auto whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`block sm:table-row-group divide-y ${isDark ? 'divide-zinc-800 bg-[#242427]' : 'divide-slate-100 bg-white'}`}>
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className={`px-6 py-8 text-center ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                                        No products found for {activeTab}.
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map(item => (
                                    <tr key={item.id} className={`block sm:table-row border sm:border-none rounded-xl sm:rounded-none mb-4 sm:mb-0 shadow-sm sm:shadow-none transition-colors text-xs sm:text-sm ${
                                        isDark 
                                            ? 'bg-[#242427] border-zinc-800 hover:bg-zinc-800/40' 
                                            : 'bg-white border-slate-200 hover:bg-slate-50/50'
                                    }`}>
                                        <td className={`flex sm:table-cell justify-between items-center px-4 sm:px-3 py-3 border-b sm:border-none font-medium whitespace-nowrap text-right sm:text-left ${
                                            isDark ? 'border-zinc-800 text-white' : 'border-slate-50 text-slate-900'
                                        }`}>
                                            <span className={`sm:hidden font-semibold text-[10px] uppercase text-left w-1/3 ${isDark ? 'text-zinc-500' : 'text-slate-550 text-slate-500'}`}>Model Name</span>
                                            <span>{item.modelName}</span>
                                        </td>
                                        <td className={`flex sm:table-cell justify-between items-center px-4 sm:px-3 py-2 sm:py-3 border-b sm:border-none ${
                                            isDark ? 'border-zinc-800 text-zinc-300' : 'border-slate-50 text-slate-600'
                                        }`}>
                                            <span className={`sm:hidden font-semibold text-[10px] uppercase w-1/3 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Type</span>
                                            <span className={`px-2 py-1 rounded text-[10px] sm:text-xs whitespace-normal break-words inline-block text-right sm:text-left ${
                                                isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {item.type || 'N/A'}
                                            </span>
                                        </td>
                                        <td className={`flex sm:table-cell justify-between items-center px-4 sm:px-2 py-2 sm:py-3 border-b sm:border-none ${
                                            isDark ? 'border-zinc-800 text-zinc-300' : 'border-slate-50 text-slate-600'
                                        }`}>
                                            <span className={`sm:hidden font-semibold text-[10px] uppercase w-1/3 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Tonnage</span>
                                            <span className="text-right sm:text-left">{item.tonnage || '-'}</span>
                                        </td>
                                        <td className={`flex sm:table-cell justify-between items-center px-4 sm:px-3 py-2 sm:py-3 border-b sm:border-none ${
                                            isDark ? 'border-zinc-800 text-zinc-300' : 'border-slate-50 text-slate-600'
                                        }`}>
                                            <span className={`sm:hidden font-semibold text-[10px] uppercase w-1/3 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Cost</span>
                                            <span className="text-right sm:text-left">₹{Number(item.ourPrice).toLocaleString()}</span>
                                        </td>
                                        <td className={`flex sm:table-cell justify-between items-center px-4 sm:px-3 py-2 sm:py-3 border-b sm:border-none ${
                                            isDark ? 'border-zinc-800 text-zinc-300' : 'border-slate-50 text-slate-600'
                                        }`}>
                                            <span className={`sm:hidden font-semibold text-[10px] uppercase w-1/3 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Sale</span>
                                            <span className="text-right sm:text-left">₹{Number(item.salePrice).toLocaleString()}</span>
                                        </td>
                                        <td className={`flex sm:table-cell justify-between items-center px-4 sm:px-2 py-2 sm:py-3 border-b sm:border-none sm:text-center ${
                                            isDark ? 'border-zinc-800' : 'border-slate-50'
                                        }`}>
                                            <span className={`sm:hidden font-semibold text-[10px] uppercase w-1/3 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Qty</span>
                                            <span className={`inline-block px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap text-right sm:text-center ${
                                                item.quantity <= 5 
                                                    ? isDark ? 'bg-red-950/40 text-red-400' : 'bg-red-100 text-red-700' 
                                                    : isDark ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {item.quantity}
                                            </span>
                                        </td>
                                        <td className={`flex sm:table-cell justify-between items-center px-4 sm:px-2 py-2 sm:py-3 border-b sm:border-none font-bold sm:text-center ${
                                            isDark ? 'border-zinc-800 text-zinc-200' : 'border-slate-50 text-slate-800'
                                        }`}>
                                            <span className={`sm:hidden font-semibold text-[10px] uppercase w-1/3 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Sold</span>
                                            <span className="text-right sm:text-center">{item.soldQuantity || 0}</span>
                                        </td>
                                        <td className={`hidden lg:table-cell px-1 py-3 text-xs whitespace-nowrap ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                            {new Date(item.updatedAt).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className={`flex sm:table-cell justify-between items-center px-4 sm:px-3 py-3 border-b sm:border-none text-right ${
                                            isDark ? 'border-zinc-800' : 'border-slate-50'
                                        }`}>
                                            <span className={`sm:hidden font-semibold text-[10px] uppercase text-left w-1/3 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Actions</span>
                                            <div className="flex flex-row justify-end gap-1 w-full lg:w-auto ml-auto">
                                                <button onClick={() => handleSold(item)} title="Mark Sold" className={`p-1.5 rounded-lg transition-colors border shadow-sm sm:shadow-none flex items-center justify-center w-8 h-8 ${
                                                    isDark 
                                                        ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 bg-emerald-950/20 border-emerald-900/35 sm:bg-transparent sm:border-none' 
                                                        : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 bg-emerald-50 sm:bg-transparent border border-emerald-200 sm:border-none'
                                                }`}>
                                                    <span className="material-icons-outlined text-[18px]">remove</span>
                                                </button>
                                                <button onClick={() => openModal(item)} title="Update Stock" className={`p-1.5 rounded-lg transition-colors border shadow-sm sm:shadow-none flex items-center justify-center w-8 h-8 ${
                                                    isDark 
                                                        ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 bg-blue-950/20 border-blue-900/35 sm:bg-transparent sm:border-none' 
                                                        : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 bg-blue-50 sm:bg-transparent border border-blue-200 sm:border-none'
                                                }`}>
                                                    <span className="material-icons-outlined text-[18px]">add</span>
                                                </button>
                                                {user?.role === 'superadmin' && (
                                                    <button onClick={() => handleDelete(item.id)} title="Delete" className={`p-1.5 rounded-lg transition-colors border shadow-sm sm:shadow-none flex items-center justify-center w-8 h-8 ${
                                                        isDark 
                                                            ? 'text-red-400 hover:text-red-300 hover:bg-red-950/30 bg-red-950/20 border-red-900/35 sm:bg-transparent sm:border-none' 
                                                            : 'text-red-600 hover:text-red-800 hover:bg-red-50 bg-red-50 sm:bg-transparent border border-red-200 sm:border-none'
                                                    }`}>
                                                        <span className="material-icons-outlined text-[18px]">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                             )}
                        </tbody>
                    </table>
                    <Pagination isDark={isDark}
                        currentPage={currentPage}
                        totalPages={totalItemsPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
                )}

                {activeTab === 'Copper' && (
                    <div className="w-full flex flex-col gap-6 p-6">
                        {/* Header bar for groups */}
                        <div className="flex justify-between items-center pb-2 border-b border-dashed border-zinc-800/20">
                            <div className="flex items-center gap-2">
                                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                    Group Boards
                                </h3>
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-600'}`}>
                                    {customGroups.length} Groups
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddGroup}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                            >
                                <i className="fa-solid fa-plus"></i>
                                Add Group Board
                            </button>
                        </div>

                        {/* Horizontal Rows Container */}
                        <div className="flex flex-col gap-6">
                            {customGroups.map(groupName => {
                                const groupItems = copperSummary.filter(s => s.groupName === groupName);
                                const isDraggingOver = !!draggingOverGroup[groupName];
                                
                                return (
                                    <div 
                                        key={groupName}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setDraggingOverGroup(prev => ({ ...prev, [groupName]: true }));
                                        }}
                                        onDragLeave={() => {
                                            setDraggingOverGroup(prev => ({ ...prev, [groupName]: false }));
                                        }}
                                        onDrop={(e) => {
                                            setDraggingOverGroup(prev => ({ ...prev, [groupName]: false }));
                                            handleCopperDrop(e, groupName);
                                        }}
                                        className={`flex flex-col gap-4 border-2 border-dashed rounded-3xl p-5 transition-all duration-300 w-full ${
                                            isDraggingOver
                                                ? (isDark ? 'border-blue-500 bg-blue-500/5' : 'border-blue-500 bg-blue-50/50')
                                                : (isDark ? 'border-zinc-800 bg-[#1e1e21]/30' : 'border-slate-200 bg-slate-50/30')
                                        }`}
                                    >
                                        <h3 className={`text-sm font-bold uppercase tracking-wider pl-1 flex items-center justify-between transition-colors duration-300 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                            <div className="flex items-center gap-2">
                                                <span>{groupName}</span>
                                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-all ${
                                                    isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'
                                                }`}>{groupItems.length} sizes</span>
                                            </div>
                                            {groupName !== 'Standard Sizes' && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteGroup(groupName);
                                                    }}
                                                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                                                        isDark 
                                                            ? 'text-zinc-500 hover:text-red-400 hover:bg-red-955/40' 
                                                            : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                    title={`Delete group ${groupName}`}
                                                >
                                                    <i className="fa-solid fa-trash-can text-[10px]"></i>
                                                </button>
                                            )}
                                        </h3>

                                        {groupItems.length === 0 ? (
                                            <div className={`text-center py-8 border border-dashed rounded-2xl text-sm transition-all ${
                                                isDark ? 'border-zinc-800 text-zinc-500' : 'border-slate-200 text-slate-400'
                                            }`}>
                                                Drag sizes here to add to this group
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                                {groupItems.map(summary => renderCopperCard(summary))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className={`rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border ${
                        isDark ? 'bg-[#242427] border-zinc-800 text-zinc-100' : 'bg-white border-slate-200'
                    }`}>
                        <div className={`p-6 border-b flex justify-between items-center shrink-0 ${
                            isDark ? 'bg-[#1e1e21] border-zinc-800' : 'bg-slate-50/50 border-slate-100'
                        }`}>
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                {activeTab === 'Copper' ? (editingCopperItem ? 'Record Copper Pipe Movement' : 'Add Copper Stock') : (isEditingFullDetails ? 'Edit Product Details' : (editingItem ? 'Update Stock Options' : 'Add Product'))}
                            </h2>
                            <div className="flex items-center gap-2">
                                {editingItem && !isEditingFullDetails && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditingFullDetails(true);
                                            setFormData({
                                                modelName: editingItem.modelName,
                                                brand: editingItem.brand,
                                                type: editingItem.type,
                                                tonnage: editingItem.tonnage,
                                                starRating: editingItem.starRating,
                                                quantity: editingItem.quantity,
                                                soldQuantity: editingItem.soldQuantity,
                                                ourPrice: editingItem.ourPrice,
                                                salePrice: editingItem.salePrice
                                            });
                                        }}
                                        className={`font-semibold px-3 py-1.5 rounded-lg transition-colors text-sm border shadow-sm flex items-center gap-2 ${
                                            isDark 
                                                ? 'text-zinc-300 border-zinc-700 hover:text-white hover:bg-zinc-800' 
                                                : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 border-slate-200 hover:border-blue-200'
                                        }`}
                                    >
                                        <i className="fa-solid fa-pen text-xs"></i>
                                        Edit Details
                                    </button>
                                )}
                                <button type="button" onClick={closeModal} className={`transition-colors rounded-lg p-2 flex items-center justify-center ${
                                    isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                }`}>
                                    <i className="fa-solid fa-xmark text-lg"></i>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="inventory-form" onSubmit={handleSubmit} className="space-y-4">
                                {activeTab === 'Copper' ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Pipe Size *</label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="e.g. 1/4, 3/8, 1-1/8, etc."
                                                className={`w-full rounded-xl px-4 py-2.5 transition-all font-semibold focus:outline-none focus:ring-4 ${
                                                    isDark 
                                                        ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-blue-500' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                                                }`}
                                                value={copperFormData.size}
                                                onChange={e => setCopperFormData({ ...copperFormData, size: e.target.value })}
                                                disabled={!!editingCopperItem}
                                            />
                                        </div>
                                        {!editingCopperItem && (
                                            <div>
                                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Group Board *</label>
                                                <CustomSelect
                                                    value={copperFormData.groupName}
                                                    onChange={val => setCopperFormData({ ...copperFormData, groupName: val })}
                                                    options={customGroups.map(grp => ({ value: grp, label: grp }))}
                                                    isDark={isDark}
                                                    placeholder="Select Group..."
                                                />
                                            </div>
                                        )}
                                        {!editingCopperItem ? (
                                            <div>
                                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Total In Stock (ft) *</label>
                                                <input
                                                    required
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                    placeholder="0.0"
                                                    className={`w-full rounded-xl px-4 py-2.5 transition-all font-semibold focus:outline-none focus:ring-4 ${
                                                        isDark 
                                                            ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-blue-500' 
                                                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                                                    }`}
                                                    value={copperFormData.totalInStock}
                                                    onChange={e => setCopperFormData({ ...copperFormData, totalInStock: e.target.value })}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Pipe Sent (ft) *</label>
                                                    <input
                                                        required
                                                        type="number"
                                                        min="0"
                                                        step="0.1"
                                                        placeholder="0.0"
                                                        className={`w-full rounded-xl px-4 py-2.5 transition-all font-semibold focus:outline-none focus:ring-4 ${
                                                            isDark 
                                                                ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-blue-500' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                                                        }`}
                                                        value={copperFormData.sentQty}
                                                        onChange={e => setCopperFormData({ ...copperFormData, sentQty: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Pipe Returned (ft) *</label>
                                                    <input
                                                        required
                                                        type="number"
                                                        min="0"
                                                        step="0.1"
                                                        placeholder="0.0"
                                                        className={`w-full rounded-xl px-4 py-2.5 transition-all font-semibold focus:outline-none focus:ring-4 ${
                                                            isDark 
                                                                ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-blue-500' 
                                                                : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                                                        }`}
                                                        value={copperFormData.returnQty}
                                                        onChange={e => setCopperFormData({ ...copperFormData, returnQty: e.target.value })}
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : editingItem && !isEditingFullDetails ? (
                                    <div className="space-y-4">
                                        <div className={`p-4 rounded-xl border mb-6 ${
                                            isDark ? 'bg-blue-950/20 border-blue-900/30' : 'bg-blue-50/50 border border-blue-100'
                                        }`}>
                                            <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{editingItem.modelName}</h3>
                                            <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                                Current Stock: <span className={`font-bold ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>{editingItem.quantity} units</span>
                                            </p>
                                        </div>

                                        <div>
                                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Add Stock Quantity</label>
                                            <input
                                                required
                                                type="number"
                                                min="1"
                                                placeholder="Enter quantity to add to inventory..."
                                                className={`w-full rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-4 transition-all ${
                                                    isDark 
                                                        ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-blue-500' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                                                }`}
                                                value={addQtyAmount || ''}
                                                onChange={e => setAddQtyAmount(parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Model Name *</label>
                                            <input
                                                required
                                                type="text"
                                                className={`w-full rounded-xl px-4 py-2.5 transition-all focus:outline-none focus:ring-4 ${
                                                    isDark 
                                                        ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-blue-500' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                                                }`}
                                                value={formData.modelName}
                                                onChange={e => setFormData({ ...formData, modelName: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Brand *</label>
                                            <CustomSelect
                                                 value={formData.brand}
                                                 onChange={val => setFormData({ ...formData, brand: val as 'Mitsubishi' | 'Akabishi' })}
                                                 options={[
                                                     { value: 'Mitsubishi', label: 'Mitsubishi' },
                                                     { value: 'Akabishi', label: 'Akabishi' }
                                                 ]}
                                                 isDark={isDark}
                                                 placeholder="Select Brand..."
                                             />
                                        </div>

                                        <div>
                                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Type *</label>
                                            <CustomSelect
                                                 value={formData.type}
                                                 onChange={val => setFormData({ ...formData, type: val })}
                                                 options={[
                                                     { value: 'Inverter', label: 'Inverter' },
                                                     { value: 'Non-Inverter', label: 'Non-Inverter' },
                                                     { value: 'Inverter Hot & Cold', label: 'Inverter Hot & Cold' }
                                                 ]}
                                                 isDark={isDark}
                                                 placeholder="Select Type..."
                                             />
                                        </div>

                                        <div>
                                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Quantity</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className={`w-full rounded-xl px-4 py-2.5 transition-all focus:outline-none focus:ring-4 ${
                                                    isDark 
                                                        ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-blue-500' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                                                }`}
                                                value={formData.quantity}
                                                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>

                                        <div>
                                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Sold Quantity</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className={`w-full rounded-xl px-4 py-2.5 transition-all focus:outline-none focus:ring-4 ${
                                                    isDark 
                                                        ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-blue-500' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                                                }`}
                                                value={formData.soldQuantity}
                                                onChange={e => setFormData({ ...formData, soldQuantity: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>

                                        <div>
                                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Tonnage</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 1.5 Ton"
                                                className={`w-full rounded-xl px-4 py-2.5 transition-all focus:outline-none focus:ring-4 ${
                                                    isDark 
                                                        ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-blue-500' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                                                }`}
                                                value={formData.tonnage}
                                                onChange={e => setFormData({ ...formData, tonnage: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Rating</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 5 Star"
                                                className={`w-full rounded-xl px-4 py-2.5 transition-all focus:outline-none focus:ring-4 ${
                                                    isDark 
                                                        ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-blue-500' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                                                }`}
                                                value={formData.starRating}
                                                onChange={e => setFormData({ ...formData, starRating: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Cost (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className={`w-full rounded-xl px-4 py-2.5 transition-all focus:outline-none focus:ring-4 ${
                                                    isDark 
                                                        ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-blue-500' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                                                }`}
                                                value={formData.ourPrice}
                                                onChange={e => setFormData({ ...formData, ourPrice: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>

                                        <div>
                                            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Sale (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className={`w-full rounded-xl px-4 py-2.5 transition-all focus:outline-none focus:ring-4 ${
                                                    isDark 
                                                        ? 'bg-[#1e1e21] border-zinc-700 text-white focus:ring-blue-500/20 focus:border-blue-500' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-blue-500/20 focus:border-blue-500'
                                                }`}
                                                value={formData.salePrice}
                                                onChange={e => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className={`p-6 border-t flex justify-end gap-3 shrink-0 ${
                            isDark ? 'border-zinc-800 bg-[#1e1e21]' : 'border-slate-100 bg-slate-50'
                        }`}>
                            <button
                                type="button"
                                onClick={closeModal}
                                className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${
                                    isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="inventory-form"
                                className="px-4 py-2.5 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all"
                            >
                                {activeTab === 'Copper' ? 'Save Logs' : (editingItem ? 'Update Stock' : 'Add Product')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Low Stock Modal */}
            {isLowStockModalOpen && createPortal(
                <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden" style={{ margin: 0 }}>
                    <div className={`rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] relative z-[101] border ${
                        isDark ? 'bg-[#242427] border-zinc-800 text-zinc-100' : 'bg-white border-slate-200'
                    }`}>
                        <div className={`p-6 border-b flex justify-between items-center shrink-0 ${
                            isDark ? 'bg-red-950/20 border-red-900/30' : 'bg-red-50/80 border-red-100'
                        }`}>
                            <div className="flex flex-row items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                    isDark ? 'bg-red-950/40 text-red-400 border border-red-900/30' : 'bg-red-100 text-red-600'
                                }`}>
                                    <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                                </div>
                                <div>
                                    <h2 className={`text-xl font-bold ${isDark ? 'text-red-400' : 'text-red-800'}`}>
                                        {activeTab === 'Copper' ? 'Low Copper Pipe Alert' : 'Low Stock Alert'}
                                    </h2>
                                    <p className={`text-sm mt-0.5 ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                                        {activeTab === 'Copper' 
                                            ? `Copper pipes with ${copperPipeLowStockThreshold} ft or less available.` 
                                            : `Products with ${lowStockThreshold} or fewer units available.`}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsLowStockModalOpen(false)} className={`transition-colors rounded-lg p-2 border ${
                                isDark 
                                    ? 'text-red-450 hover:text-red-300 hover:bg-red-950/30 bg-red-950/20 border-red-900/40' 
                                    : 'text-red-400 hover:text-red-600 hover:bg-red-100 bg-white border-red-100'
                            }`}>
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className={`p-0 overflow-auto flex-1 ${
                            isDark ? 'bg-[#1e1e21]/50' : 'bg-slate-50/30'
                        }`}>
                            {activeLowStockCount === 0 ? (
                                <div className="p-10 text-center text-slate-500">
                                    <i className={`text-4xl mb-3 ${isDark ? 'text-emerald-500' : 'text-emerald-400'}`}></i>
                                    <p className={`font-bold mb-1 ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>All Stock Levels Healthy</p>
                                    <p className="text-sm">No items are currently running low on stock.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className={`uppercase text-[10px] sm:text-xs font-semibold border-b sticky top-0 z-10 shadow-sm ${
                                        isDark ? 'bg-[#242427] text-zinc-400 border-zinc-800' : 'bg-white text-slate-600 border-slate-200'
                                    }`}>
                                        {activeTab === 'Copper' ? (
                                            <tr>
                                                <th className="px-4 py-3">Copper Size</th>
                                                <th className="px-4 py-3 text-right">Available Stock</th>
                                                <th className="px-4 py-3 text-center">Action</th>
                                            </tr>
                                        ) : (
                                            <tr>
                                                <th className="px-4 py-3">Product Model</th>
                                                <th className="px-4 py-3">Brand</th>
                                                <th className="px-4 py-3">Type / Ton</th>
                                                <th className="px-4 py-3 text-right">Stock Extant</th>
                                                <th className="px-4 py-3 text-center">Available</th>
                                                <th className="px-4 py-3 text-center">Action</th>
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody className={`divide-y ${
                                        isDark ? 'divide-zinc-800/60 bg-[#242427]' : 'divide-slate-100 bg-white'
                                    }`}>
                                        {activeTab === 'Copper' ? (
                                            lowStockCopperItems.map(item => (
                                                <tr key={item.size} className={`transition-colors ${
                                                    isDark ? 'hover:bg-red-950/10' : 'hover:bg-red-50/30'
                                                }`}>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.size}"</div>
                                                        <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>COPPER DIAMETER</div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                                        <div className={`font-bold text-lg ${
                                                            item.totalInStock <= 0 ? 'text-red-500' : 'text-orange-500'
                                                        }`}>
                                                            {item.totalInStock} ft
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                                        <button
                                                            onClick={() => {
                                                                setIsLowStockModalOpen(false);
                                                                openModal(undefined, item);
                                                            }}
                                                            className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors"
                                                        >
                                                            Update Stock
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            lowStockItems.map(item => {
                                                const available = item.quantity;
                                                const brought = item.quantity + item.soldQuantity;
                                                return (
                                                    <tr key={item.id} className={`transition-colors ${
                                                        isDark ? 'hover:bg-red-950/10' : 'hover:bg-red-50/30'
                                                    }`}>
                                                        <td className="px-4 py-3">
                                                            <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} break-words min-w-[120px]`}>{item.modelName}</div>
                                                        </td>
                                                        <td className={`px-4 py-3 whitespace-nowrap text-xs font-bold uppercase tracking-wider ${
                                                            isDark ? 'text-zinc-350' : 'text-slate-700'
                                                        }`}>
                                                            {item.brand}
                                                        </td>
                                                        <td className={`px-4 py-3 ${
                                                            isDark ? 'text-zinc-400' : 'text-slate-600'
                                                        }`}>
                                                            {item.type} {item.tonnage ? `· ${item.tonnage}` : ''}
                                                        </td>
                                                        <td className={`px-4 py-3 whitespace-nowrap text-right text-xs ${
                                                            isDark ? 'text-zinc-500' : 'text-slate-500'
                                                        }`}>
                                                            {brought} brought - {item.soldQuantity} sold
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                                            <span className={`inline-block px-3 py-1 font-bold rounded-full border shadow-sm ${
                                                                isDark ? 'bg-red-950/40 text-red-400 border-red-900/50' : 'bg-red-100 text-red-700 border-red-200'
                                                            }`}>
                                                                {available}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-center">
                                                            <button
                                                                onClick={() => {
                                                                    setIsLowStockModalOpen(false);
                                                                    openModal(item);
                                                                }}
                                                                className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors"
                                                            >
                                                                Update Stock
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* History Modal */}
            {isHistoryModalOpen && createPortal(
                <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden" style={{ margin: 0 }}>
                    <div className={`rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] relative z-[101] border ${
                        isDark ? 'bg-[#242427] border-zinc-800 text-zinc-100' : 'bg-white border-slate-200'
                    }`}>
                        <div className={`p-6 border-b flex justify-between items-center shrink-0 ${
                            isDark ? 'bg-[#1e1e21] border-zinc-800' : 'bg-slate-50/80 border-slate-100'
                        }`}>
                            <div>
                                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                    {activeTab === 'Copper' ? 'Copper Pipe Stock Audit Log' : 'Global Inventory Audit Log'}
                                </h2>
                                <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                    {activeTab === 'Copper' 
                                        ? 'Review all copper pipe allocations, returns, and warehouse entries.' 
                                        : 'Review all stock additions, sales, and corrections.'}
                                </p>
                            </div>
                            <button onClick={closeHistoryModal} className={`transition-colors rounded-lg p-2 border ${
                                isDark 
                                    ? 'text-zinc-400 hover:text-white hover:bg-zinc-800 border-zinc-700 bg-zinc-900/20' 
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 bg-white shadow-sm border-slate-100'
                            }`}>
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className={`p-0 overflow-y-auto flex-1 ${
                            isDark ? 'bg-[#1e1e21]/40' : 'bg-slate-50/30'
                        }`}>
                            {activeTab === 'Copper' ? (
                                copperHistoryLogs.length === 0 ? (
                                    <div className={`p-10 text-center ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                        <i className={`fa-solid fa-clock-rotate-left text-4xl mb-3 ${isDark ? 'text-zinc-700' : 'text-slate-300'}`}></i>
                                        <p>No copper logs available yet.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead className={`uppercase text-[10px] sm:text-xs font-semibold border-b sticky top-0 z-10 shadow-sm ${
                                            isDark ? 'bg-[#242427] text-zinc-400 border-zinc-800' : 'bg-white text-slate-600 border-slate-200'
                                        }`}>
                                            <tr>
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Pipe Size</th>
                                                <th className="px-6 py-4">Origin</th>
                                                <th className="px-6 py-4 text-center">Sent Qty</th>
                                                <th className="px-6 py-4 text-center">Returned Qty</th>
                                                <th className="px-6 py-4 text-center">Net Used</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${
                                            isDark ? 'divide-zinc-800/60 bg-[#242427]' : 'divide-slate-100 bg-white'
                                        }`}>
                                            {copperHistoryLogs.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage).map(log => {
                                                const netUsed = Number(log.sentQty || 0) - Number(log.returnQty || 0);
                                                return (
                                                    <tr key={`${log.origin || 'warehouse'}-${log.id}`} className={`transition-colors ${
                                                        isDark ? 'hover:bg-zinc-800/20' : 'hover:bg-slate-50'
                                                    }`}>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>{log.date}</div>
                                                        </td>
                                                        <td className={`px-6 py-4 whitespace-nowrap font-bold ${
                                                            isDark ? 'text-zinc-200' : 'text-slate-700'
                                                        }`}>
                                                            {log.size}"
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {log.origin !== 'warehouse' ? (
                                                                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                                    isDark ? 'bg-blue-950/40 border-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700 border-blue-100'
                                                                }`}>
                                                                    {log.origin === 'job' ? 'Job site' : log.origin}
                                                                </span>
                                                            ) : (
                                                                <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                                    isDark ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-slate-50 text-slate-600 border-slate-200'
                                                                }`}>Warehouse</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center text-red-600 font-semibold">
                                                            {Number(log.sentQty).toFixed(1)} ft
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center text-emerald-600 font-semibold">
                                                            {Number(log.returnQty).toFixed(1)} ft
                                                        </td>
                                                        <td className={`px-6 py-4 whitespace-nowrap text-center font-bold ${
                                                            isDark ? 'text-zinc-200' : 'text-slate-800'
                                                        }`}>
                                                            {netUsed.toFixed(1)} ft
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )
                            ) : (
                                historyLogs.length === 0 ? (
                                    <div className={`p-10 text-center ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                                        <i className={`fa-solid fa-clock-rotate-left text-4xl mb-3 ${isDark ? 'text-zinc-700' : 'text-slate-300'}`}></i>
                                        <p>No history available yet.</p>
                                        <p className="text-xs mt-2">History tracking begins from when the items are next updated.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead className={`uppercase text-[10px] sm:text-xs font-semibold border-b sticky top-0 z-10 shadow-sm ${
                                            isDark ? 'bg-[#242427] text-zinc-400 border-zinc-800' : 'bg-white text-slate-600 border-slate-200'
                                        }`}>
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
                                        <tbody className={`divide-y ${
                                            isDark ? 'divide-zinc-800/60 bg-[#242427]' : 'divide-slate-100 bg-white'
                                        }`}>
                                            {historyLogs.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage).map(log => (
                                                <tr key={log.id} className={`transition-colors ${
                                                    isDark ? 'hover:bg-zinc-800/20' : 'hover:bg-slate-50'
                                                }`}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                        <div className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>{new Date(log.createdAt).toLocaleDateString('en-GB')}</div>
                                                        <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{new Date(log.createdAt).toLocaleTimeString('en-US')}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">
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
                                                    <td className={`px-6 py-4 whitespace-nowrap text-center font-semibold ${
                                                        isDark ? 'text-zinc-300' : 'text-slate-700'
                                                    }`}>
                                                        {log.newQuantity}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            )}
                        </div>
                        {activeTab === 'Copper' ? (
                            copperHistoryLogs.length > itemsPerPage && (
                                <Pagination
                                    isDark={isDark}
                                    currentPage={historyPage}
                                    totalPages={Math.ceil(copperHistoryLogs.length / itemsPerPage)}
                                    onPageChange={setHistoryPage}
                                />
                            )
                        ) : (
                            historyLogs.length > itemsPerPage && (
                                <Pagination
                                    isDark={isDark}
                                    currentPage={historyPage}
                                    totalPages={Math.ceil(historyLogs.length / itemsPerPage)}
                                    onPageChange={setHistoryPage}
                                />
                            )
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default InventoryManagement;
