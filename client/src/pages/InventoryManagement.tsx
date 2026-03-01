import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, useSettings } from '../App';

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
    actionType: 'ADDED_STOCK' | 'SOLD_STOCK' | 'UPDATED_DETAILS';
    quantityChange: number;
    previousQuantity: number;
    newQuantity: number;
    createdAt: string;
}

const InventoryManagement: React.FC = () => {
    const { token } = useAuth();
    const { lowStockThreshold, enableLowStockAlert } = useSettings();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'Mitsubishi' | 'Akabishi'>('Mitsubishi');
    const [lastSoldItem, setLastSoldItem] = useState<{ id: number, quantity: number, soldQuantity: number } | null>(null);
    const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [addQtyAmount, setAddQtyAmount] = useState<number>(0);

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

    const fetchInventory = async () => {
        try {
            setIsLoading(true);
            const apiUrl = import.meta.env.VITE_API_URL
                ? `${import.meta.env.VITE_API_URL}/inventory`
                : 'http://localhost:5000/api/inventory';

            const res = await axios.get(apiUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setItems(res.data);
        } catch (err: any) {
            console.error("Inventory Fetch Error:", err);
            console.error("Error response details:", err.response?.data);
            setError(err.response?.data?.error || 'Failed to fetch inventory');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, [token]);

    const openModal = (item?: InventoryItem) => {
        if (item) {
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
        setAddQtyAmount(0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const apiUrl = import.meta.env.VITE_API_URL
                ? `${import.meta.env.VITE_API_URL}/inventory`
                : 'http://localhost:5000/api/inventory';
            const headers = { Authorization: `Bearer ${token}` };

            if (editingItem) {
                // When editing, we ONLY update the quantity by adding the new amount
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
                await axios.put(`${apiUrl}/${editingItem.id}`, updatedData, { headers });
            } else {
                await axios.post(apiUrl, formData, { headers });
            }

            fetchInventory();
            closeModal();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save item');
        }
    };

    const fetchHistory = async () => {
        try {
            const apiUrl = import.meta.env.VITE_API_URL
                ? `${import.meta.env.VITE_API_URL}/inventory/history`
                : `http://localhost:5000/api/inventory/history`;

            const res = await axios.get(apiUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistoryLogs(res.data);
            setIsHistoryModalOpen(true);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to fetch history');
        }
    };

    const closeHistoryModal = () => {
        setIsHistoryModalOpen(false);
        setHistoryLogs([]);
    };

    const handleSold = async (item: InventoryItem) => {
        if (item.quantity <= 0) {
            alert('Out of stock!');
            return;
        }
        try {
            const apiUrl = import.meta.env.VITE_API_URL
                ? `${import.meta.env.VITE_API_URL}/inventory/${item.id}`
                : `http://localhost:5000/api/inventory/${item.id}`;
            const headers = { Authorization: `Bearer ${token}` };

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

            await axios.put(apiUrl, updatedData, { headers });

            // Track for potential undo operations
            setLastSoldItem({
                id: item.id,
                quantity: item.quantity,
                soldQuantity: item.soldQuantity
            });

            fetchInventory();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update sold status');
        }
    };

    const handleUndo = async () => {
        if (!lastSoldItem) return;

        try {
            const itemToRevert = items.find(i => i.id === lastSoldItem.id);
            if (!itemToRevert) return;

            const apiUrl = import.meta.env.VITE_API_URL
                ? `${import.meta.env.VITE_API_URL}/inventory/${lastSoldItem.id}`
                : `http://localhost:5000/api/inventory/${lastSoldItem.id}`;
            const headers = { Authorization: `Bearer ${token}` };

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

            await axios.put(apiUrl, revertedData, { headers });
            setLastSoldItem(null);
            fetchInventory();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to undo action');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            const apiUrl = import.meta.env.VITE_API_URL
                ? `${import.meta.env.VITE_API_URL}/inventory/${id}`
                : `http://localhost:5000/api/inventory/${id}`;

            await axios.delete(apiUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchInventory();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete item');
        }
    };

    const filteredItems = items.filter(item => item.brand === activeTab);
    const lowStockItems = enableLowStockAlert ? items.filter(i => (i.quantity - i.soldQuantity) <= lowStockThreshold) : [];
    const totalLowStockCount = lowStockItems.length;

    if (isLoading) return <div className="p-6">Loading inventory...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage stock, pricing, and product details</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {lastSoldItem && (
                        <button
                            onClick={handleUndo}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-slate-200"
                        >
                            <i className="fa-solid fa-rotate-left"></i>
                            Undo
                        </button>
                    )}
                    <div className="flex items-center gap-2 mr-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <button
                            onClick={fetchHistory}
                            title="Global Audit History"
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200 shadow-sm"
                        >
                            <i className="fa-solid fa-history text-lg"></i>
                        </button>
                        {enableLowStockAlert && (
                            <button
                                onClick={() => setIsLowStockModalOpen(true)}
                                title="Low Stock Vehicles"
                                className="relative w-10 h-10 rounded-lg flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-200 shadow-sm"
                            >
                                <i className="fa-solid fa-triangle-exclamation text-lg"></i>
                                {totalLowStockCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                        {totalLowStockCount}
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
                        Add Product
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button
                        className={`flex-1 py-4 text-sm font-semibold text-center transition-colors ${activeTab === 'Mitsubishi' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        onClick={() => setActiveTab('Mitsubishi')}
                    >
                        Mitsubishi
                    </button>
                    <button
                        className={`flex-1 py-4 text-sm font-semibold text-center transition-colors ${activeTab === 'Akabishi' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                        onClick={() => setActiveTab('Akabishi')}
                    >
                        Akabishi
                    </button>
                </div>

                {/* Table */}
                <div className="w-full">
                    <table className="w-full text-left text-sm block sm:table table-fixed">
                        <thead className="hidden sm:table-header-group bg-slate-50 text-slate-600 uppercase text-[10px] sm:text-xs font-semibold border-b border-slate-200">
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
                        <tbody className="block sm:table-row-group divide-y sm:divide-y divide-slate-100">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                        No products found for {activeTab}.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map(item => (
                                    <tr key={item.id} className="block sm:table-row bg-white border border-slate-200 sm:border-none rounded-xl sm:rounded-none mb-4 sm:mb-0 shadow-sm sm:shadow-none hover:bg-slate-50/50 transition-colors text-xs sm:text-sm">
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-3 py-3 border-b border-slate-50 sm:border-none font-medium text-slate-900 whitespace-nowrap text-right sm:text-left">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase text-left w-1/3">Model Name</span>
                                            <span>{item.modelName}</span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-3 py-2 sm:py-3 border-b border-slate-50 sm:border-none text-slate-600">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase w-1/3">Type</span>
                                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] sm:text-xs whitespace-normal break-words inline-block text-right sm:text-left">
                                                {item.type || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-2 py-2 sm:py-3 border-b border-slate-50 sm:border-none text-slate-600">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase w-1/3">Tonnage</span>
                                            <span className="text-right sm:text-left">{item.tonnage || '-'}</span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-3 py-2 sm:py-3 border-b border-slate-50 sm:border-none text-slate-600">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase w-1/3">Cost</span>
                                            <span className="text-right sm:text-left">₹{Number(item.ourPrice).toLocaleString()}</span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-3 py-2 sm:py-3 border-b border-slate-50 sm:border-none text-slate-600">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase w-1/3">Sale</span>
                                            <span className="text-right sm:text-left">₹{Number(item.salePrice).toLocaleString()}</span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-2 py-2 sm:py-3 border-b border-slate-50 sm:border-none sm:text-center">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase w-1/3">Qty</span>
                                            <span className={`inline-block px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap text-right sm:text-center ${(item.quantity - item.soldQuantity) <= 5 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {item.quantity}
                                            </span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-2 py-2 sm:py-3 border-b border-slate-50 sm:border-none text-slate-800 font-bold sm:text-center">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase w-1/3">Sold</span>
                                            <span className="text-right sm:text-center">{item.soldQuantity || 0}</span>
                                        </td>
                                        <td className="hidden lg:table-cell px-1 py-3 text-slate-500 text-xs whitespace-nowrap">
                                            {new Date(item.updatedAt).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-3 py-3 sm:py-3 text-right">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase text-left w-1/3">Actions</span>
                                            <div className="flex flex-row justify-end gap-1 w-full lg:w-auto ml-auto">
                                                <button onClick={() => handleSold(item)} title="Mark Sold" className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors bg-emerald-50 sm:bg-transparent border border-emerald-200 sm:border-none shadow-sm sm:shadow-none flex items-center justify-center w-8 h-8">
                                                    <span className="material-icons-outlined text-[18px]">check_circle</span>
                                                </button>
                                                <button onClick={() => openModal(item)} title="Update Stock" className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors bg-blue-50 sm:bg-transparent border border-blue-200 sm:border-none shadow-sm sm:shadow-none flex items-center justify-center w-8 h-8">
                                                    <span className="material-icons-outlined text-[18px]">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} title="Delete" className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition-colors bg-red-50 sm:bg-transparent border border-red-200 sm:border-none shadow-sm sm:shadow-none flex items-center justify-center w-8 h-8">
                                                    <span className="material-icons-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <h2 className="text-xl font-bold text-slate-800">{editingItem ? 'Update Stock Options' : 'Add Product'}</h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-2 hover:bg-slate-100">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="inventory-form" onSubmit={handleSubmit} className="space-y-4">
                                {editingItem ? (
                                    <div className="space-y-4">
                                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6">
                                            <h3 className="text-lg font-bold text-slate-800 mb-1">{editingItem.modelName}</h3>
                                            <p className="text-sm text-slate-500">Current Stock: <span className="font-bold text-slate-700">{editingItem.quantity} units</span></p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Add Stock Quantity</label>
                                            <input
                                                required
                                                type="number"
                                                min="1"
                                                placeholder="Enter quantity to add to inventory..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                value={addQtyAmount || ''}
                                                onChange={e => setAddQtyAmount(parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Model Name *</label>
                                            <input
                                                required
                                                type="text"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                value={formData.modelName}
                                                onChange={e => setFormData({ ...formData, modelName: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Brand *</label>
                                            <select
                                                required
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                value={formData.brand}
                                                onChange={e => setFormData({ ...formData, brand: e.target.value as 'Mitsubishi' | 'Akabishi' })}
                                            >
                                                <option value="Mitsubishi">Mitsubishi</option>
                                                <option value="Akabishi">Akabishi</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                                            <select
                                                required
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                value={formData.type}
                                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            >
                                                <option value="Inverter">Inverter</option>
                                                <option value="Non-Inverter">Non-Inverter</option>
                                                <option value="Inverter Hot & Cold">Inverter Hot & Cold</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                value={formData.quantity}
                                                onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Sold Quantity</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                value={formData.soldQuantity}
                                                onChange={e => setFormData({ ...formData, soldQuantity: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Tonnage</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 1.5 Ton"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                value={formData.tonnage}
                                                onChange={e => setFormData({ ...formData, tonnage: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Rating</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 5 Star"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                value={formData.starRating}
                                                onChange={e => setFormData({ ...formData, starRating: e.target.value })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Cost (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                value={formData.ourPrice}
                                                onChange={e => setFormData({ ...formData, ourPrice: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Sale (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                value={formData.salePrice}
                                                onChange={e => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-4 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="inventory-form"
                                className="px-4 py-2.5 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all"
                            >
                                {editingItem ? 'Update Stock' : 'Add Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Low Stock Modal */}
            {isLowStockModalOpen && (
                <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden" style={{ margin: 0 }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] relative z-[101]">
                        <div className="p-6 border-b border-red-100 flex justify-between items-center shrink-0 bg-red-50/80">
                            <div className="flex flex-row items-center gap-3">
                                <div className="bg-red-100 text-red-600 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                                    <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-red-800">Low Stock Alert</h2>
                                    <p className="text-red-600 text-sm mt-0.5">Products with {lowStockThreshold} or fewer units available.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsLowStockModalOpen(false)} className="text-red-400 hover:text-red-600 transition-colors rounded-lg p-2 hover:bg-red-100 bg-white shadow-sm border border-red-100">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1 bg-slate-50/30">
                            {lowStockItems.length === 0 ? (
                                <div className="p-10 text-center text-slate-500">
                                    <i className="fa-solid fa-check-circle text-4xl mb-3 text-emerald-400"></i>
                                    <p className="text-slate-700 font-bold mb-1">All Stock Levels Healthy</p>
                                    <p className="text-sm">No items are currently running low on stock.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-white text-slate-600 uppercase text-[10px] sm:text-xs font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-4">Product Model</th>
                                            <th className="px-6 py-4">Brand</th>
                                            <th className="px-6 py-4">Type / Ton</th>
                                            <th className="px-6 py-4 text-right">Stock Extant</th>
                                            <th className="px-6 py-4 text-center">Available</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {lowStockItems.map(item => {
                                            const available = item.quantity - item.soldQuantity;
                                            return (
                                                <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-bold text-slate-900">{item.modelName}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-700 text-xs font-bold uppercase tracking-wider">
                                                        {item.brand}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                        {item.type} {item.tonnage ? `· ${item.tonnage}` : ''}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-slate-500 text-xs">
                                                        {item.quantity} brought - {item.soldQuantity} sold
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className="inline-block px-3 py-1 bg-red-100 text-red-700 font-bold rounded-full border border-red-200 shadow-sm">
                                                            {available}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
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
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {isHistoryModalOpen && (
                <div className="fixed top-0 left-0 w-screen h-screen z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden" style={{ margin: 0 }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] relative z-[101]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50/80">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Global Inventory Audit Log</h2>
                                <p className="text-slate-500 text-sm mt-1">Review all stock additions, sales, and corrections.</p>
                            </div>
                            <button onClick={closeHistoryModal} className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-2 hover:bg-slate-200 bg-white shadow-sm">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1 bg-slate-50/30">
                            {historyLogs.length === 0 ? (
                                <div className="p-10 text-center text-slate-500">
                                    <i className="fa-solid fa-clock-rotate-left text-4xl mb-3 text-slate-300"></i>
                                    <p>No history available yet.</p>
                                    <p className="text-xs mt-2">History tracking begins from when the items are next updated.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className="bg-white text-slate-600 uppercase text-[10px] sm:text-xs font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-4">Date / Time</th>
                                            <th className="px-6 py-4">Product Model</th>
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Action</th>
                                            <th className="px-6 py-4 text-center">Change</th>
                                            <th className="px-6 py-4 text-center">Available Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {historyLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                    <div className="font-semibold text-slate-800">{new Date(log.createdAt).toLocaleDateString('en-GB')}</div>
                                                    <div className="text-xs">{new Date(log.createdAt).toLocaleTimeString('en-US')}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                                                    <div className="font-bold text-slate-900">{log.modelName || 'Unknown Model'}</div>
                                                    <div className="text-[10px] uppercase text-slate-500">{log.brand}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                                                    {log.userEmail}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${log.actionType === 'ADDED_STOCK' ? 'bg-blue-100 text-blue-700' :
                                                        log.actionType === 'SOLD_STOCK' ? 'bg-emerald-100 text-emerald-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {log.actionType.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center font-bold">
                                                    <span className={log.quantityChange > 0 ? 'text-blue-600' : log.quantityChange < 0 ? 'text-red-500' : 'text-slate-500'}>
                                                        {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-slate-700 font-semibold">
                                                    {log.newQuantity}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryManagement;
