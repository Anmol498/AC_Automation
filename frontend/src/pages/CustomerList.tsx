
import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { useAuth } from '../App';
import { API_BASE_URL } from '../constants';

const CustomerList: React.FC = () => {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
  const [drawingFile, setDrawingFile] = useState<File | null>(null);
  const [quotationFile, setQuotationFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCustomers = (search = '') => {
    setLoading(true);
    const url = search
      ? `${API_BASE_URL}/customers?search=${encodeURIComponent(search)}`
      : `${API_BASE_URL}/customers`;

    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setCustomers(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, token]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', email: '', phone: '', address: '' });
    setDrawingFile(null);
    setQuotationFile(null);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || ''
    });
    setDrawingFile(null);
    setQuotationFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE_URL}/customers/${editingId}` : `${API_BASE_URL}/customers`;
      const method = editingId ? 'PUT' : 'POST';

      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('email', formData.email);
      payload.append('phone', formData.phone);
      payload.append('address', formData.address);
      if (drawingFile) payload.append('drawing', drawingFile);
      if (quotationFile) payload.append('quotation', quotationFile);

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: payload,
      });

      if (res.ok) {
        setFormData({ name: '', email: '', phone: '', address: '' });
        setDrawingFile(null);
        setQuotationFile(null);
        setEditingId(null);
        setIsModalOpen(false);
        fetchCustomers();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to save customer. The server may need to be restarted. Error: ${errData.error || res.statusText}`);
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure? This will remove all jobs associated with this customer.")) return;
    try {
      await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchCustomers();
    } catch (err) { }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Customers</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium placeholder:text-slate-400"
            />
          </div>
          <button onClick={openAddModal} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors whitespace-nowrap">
            <i className="fa-solid fa-plus mr-2"></i> New Customer
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-10"><i className="fa-solid fa-spinner fa-spin text-blue-600 text-2xl"></i></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4">Files</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map(c => (
                  <tr key={c.id} className="text-sm hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{c.name}</td>
                    <td className="px-6 py-4">
                      <p className="text-slate-600">{c.email}</p>
                      <p className="text-[10px] text-slate-400">{c.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs w-48 truncate" title={c.address}>{c.address || <span className="text-slate-400 italic">No Address</span>}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {c.drawingUrl ? (
                          <a href={`${API_BASE_URL}${c.drawingUrl}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-600 hover:underline inline-flex items-center gap-1">
                            <i className="fa-solid fa-file-image"></i> Drawing
                          </a>
                        ) : <span className="text-[10px] text-slate-300 italic">No drawing</span>}
                        {c.quotationUrl ? (
                          <a href={`${API_BASE_URL}${c.quotationUrl}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1">
                            <i className="fa-solid fa-file-pdf"></i> Quotation
                          </a>
                        ) : <span className="text-[10px] text-slate-300 italic">No quotation</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => openEditModal(c)} className="text-blue-400 hover:text-blue-600" title="Edit Customer">
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600" title="Delete Customer">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={6} className="p-10 text-center text-slate-400 italic">No customers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input placeholder="Name" className="w-full p-2.5 border border-slate-200 rounded-lg" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              <input type="email" placeholder="Email" className="w-full p-2.5 border border-slate-200 rounded-lg" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              <input placeholder="Phone" className="w-full p-2.5 border border-slate-200 rounded-lg" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              <textarea placeholder="Address" className="w-full p-2.5 border border-slate-200 rounded-lg" rows={3} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 pl-1">Drawing</label>
                  <input type="file" className="text-sm p-1 w-full outline-none" onChange={e => setDrawingFile(e.target.files ? e.target.files[0] : null)} />
                  {editingId && <span className="text-[9px] text-slate-400 pl-1 italic">Leave empty to keep existing drawing</span>}
                </div>
                <div className="h-px bg-slate-200 w-full" />
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 pl-1">Quotation</label>
                  <input type="file" className="text-sm p-1 w-full outline-none" onChange={e => setQuotationFile(e.target.files ? e.target.files[0] : null)} />
                  {editingId && <span className="text-[9px] text-slate-400 pl-1 italic">Leave empty to keep existing quotation</span>}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-3 bg-slate-100 font-bold rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20">{editingId ? 'Save Changes' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
