import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';

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

const InventoryManagement: React.FC = () => {
    const { token } = useAuth();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'Mitsubishi' | 'Akabishi'>('Mitsubishi');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

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
            setFormData({
                modelName: item.modelName,
                brand: item.brand,
                type: item.type || 'Inverter',
                tonnage: item.tonnage || '',
                starRating: item.starRating || '',
                quantity: item.quantity,
                soldQuantity: item.soldQuantity || 0,
                ourPrice: item.ourPrice,
                salePrice: item.salePrice
            });
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
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const apiUrl = import.meta.env.VITE_API_URL
                ? `${import.meta.env.VITE_API_URL}/inventory`
                : 'http://localhost:5000/api/inventory';
            const headers = { Authorization: `Bearer ${token}` };

            if (editingItem) {
                await axios.put(`${apiUrl}/${editingItem.id}`, formData, { headers });
            } else {
                await axios.post(apiUrl, formData, { headers });
            }

            fetchInventory();
            closeModal();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save item');
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

    if (isLoading) return <div className="p-6">Loading inventory...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage stock, pricing, and product details</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-blue-500/30 transition-all flex items-center gap-2"
                >
                    <i className="fa-solid fa-plus"></i>
                    Add Product
                </button>
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
                                <th className="px-3 py-3 w-[15%] sm:w-auto">Model Name</th>
                                <th className="px-3 py-3 w-[12%] sm:w-auto">Type</th>
                                <th className="px-2 py-3 w-[8%] sm:w-auto">Ton</th>
                                <th className="px-2 py-3 hidden sm:table-cell">Rating</th>
                                <th className="px-3 py-3 w-[10%] sm:w-auto">Cost</th>
                                <th className="px-3 py-3 w-[10%] sm:w-auto">Sale</th>
                                <th className="px-2 py-3 w-[8%] sm:w-auto">Qty</th>
                                <th className="px-2 py-3 w-[8%] sm:w-auto">Sold</th>
                                <th className="px-3 py-3 hidden lg:table-cell">Last Updated</th>
                                <th className="px-3 py-3 text-right w-[15%] sm:w-auto">Actions</th>
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
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-3 py-3 border-b border-slate-50 sm:border-none font-medium text-slate-900 break-words whitespace-normal text-right sm:text-left">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase text-left w-1/3">Model Name</span>
                                            <span className="w-2/3">{item.modelName}</span>
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
                                        <td className="hidden sm:table-cell px-2 py-3 text-slate-600">
                                            {item.starRating || '-'}
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-3 py-2 sm:py-3 border-b border-slate-50 sm:border-none text-slate-600">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase w-1/3">Cost</span>
                                            <span className="text-right sm:text-left">₹{Number(item.ourPrice).toLocaleString()}</span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-3 py-2 sm:py-3 border-b border-slate-50 sm:border-none text-slate-600">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase w-1/3">Sale</span>
                                            <span className="text-right sm:text-left">₹{Number(item.salePrice).toLocaleString()}</span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-2 py-2 sm:py-3 border-b border-slate-50 sm:border-none">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase w-1/3">Qty</span>
                                            <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap text-right sm:text-left ${item.quantity <= 5 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {item.quantity}
                                            </span>
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-2 py-2 sm:py-3 border-b border-slate-50 sm:border-none text-slate-800 font-bold">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase w-1/3">Sold</span>
                                            <span className="text-right sm:text-left">{item.soldQuantity || 0}</span>
                                        </td>
                                        <td className="hidden lg:table-cell px-3 py-3 text-slate-500 text-xs">
                                            {new Date(item.updatedAt).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="flex sm:table-cell justify-between items-center px-4 sm:px-3 py-3 sm:py-3 text-right">
                                            <span className="sm:hidden font-semibold text-slate-500 text-[10px] uppercase text-left w-1/3">Actions</span>
                                            <div className="flex flex-row sm:flex-col lg:flex-row justify-end gap-2 w-2/3">
                                                <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-800 p-2 text-[10px] sm:text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors bg-blue-50 sm:bg-transparent">
                                                    Update
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 p-2 text-[10px] sm:text-xs font-medium rounded-lg hover:bg-red-50 transition-colors bg-red-50 sm:bg-transparent">
                                                    Delete
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
                            <h2 className="text-xl font-bold text-slate-800">{editingItem ? 'Edit Product' : 'Add Product'}</h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-2 hover:bg-slate-100">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="inventory-form" onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Model Name *</label>
                                        <input
                                            required
                                            type="text"
                                            className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${editingItem ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50'}`}
                                            value={formData.modelName}
                                            onChange={e => setFormData({ ...formData, modelName: e.target.value })}
                                            readOnly={!!editingItem}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Brand *</label>
                                        <select
                                            required
                                            className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${editingItem ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50'}`}
                                            value={formData.brand}
                                            onChange={e => setFormData({ ...formData, brand: e.target.value as 'Mitsubishi' | 'Akabishi' })}
                                            disabled={!!editingItem}
                                        >
                                            <option value="Mitsubishi">Mitsubishi</option>
                                            <option value="Akabishi">Akabishi</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                                        <select
                                            required
                                            className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${editingItem ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50'}`}
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                            disabled={!!editingItem}
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
                                            className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${editingItem ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50'}`}
                                            value={formData.tonnage}
                                            onChange={e => setFormData({ ...formData, tonnage: e.target.value })}
                                            readOnly={!!editingItem}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Rating</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 5 Star"
                                            className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${editingItem ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50'}`}
                                            value={formData.starRating}
                                            onChange={e => setFormData({ ...formData, starRating: e.target.value })}
                                            readOnly={!!editingItem}
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
                                {editingItem ? 'Save Changes' : 'Add Product'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryManagement;
