import React, { useState, useEffect, useRef } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Customer, Job } from '../types';
import { useAuth } from '../context/AppContext';
import Pagination from '../components/Pagination';
import FileViewerModal from '../components/FileViewerModal';
import CustomDatePicker from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import { toast } from 'sonner';
import { useRealtimeListener } from '../components/RealtimeProvider';
import { api } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import { API_BASE_URL } from '../constants';
import { Skeleton } from '../components/ui/Skeleton';


const CustomerList: React.FC = () => {
  const { token } = useAuth();
  const { isDark = false } = useOutletContext<{ isDark?: boolean }>() || {};
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
  const [drawingFile, setDrawingFile] = useState<File | null>(null);
  const [quotationFile, setQuotationFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFile, setActiveFile] = useState<{ url: string, name: string } | null>(null);

  const itemsPerPage = 10;

  // Clickable Row / Jobs State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerJobs, setCustomerJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [technicians, setTechnicians] = useState<{ email: string }[]>([]);
  const [newJobFormData, setNewJobFormData] = useState({
    jobType: 'Installation' as 'Installation' | 'Service',
    technician: '',
    startDate: new Date().toISOString().split('T')[0],
    copperPipingCost: 0,
    outdoorFittingCost: 0,
    commissioningCost: 0,
    equipmentCost: 0
  });

  const fetchCustomerJobs = (customerId: number) => {
    setLoadingJobs(true);
    api.get(`/jobs?customerId=${customerId}`)
      .then(data => {
        setCustomerJobs(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error("Failed to fetch customer jobs:", err))
      .finally(() => setLoadingJobs(false));
  };

  const fetchTechnicians = () => {
    api.get('/technicians')
      .then(data => setTechnicians(Array.isArray(data) ? data : []))
      .catch(err => console.error("Failed to fetch technicians:", err));
  };

  const handleScheduleJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!newJobFormData.technician) {
      toast.error("Please select a technician");
      return;
    }

    try {
      const payload = {
        customerId: selectedCustomer.id.toString(),
        jobType: newJobFormData.jobType,
        technician: newJobFormData.technician,
        startDate: newJobFormData.startDate,
        copperPipingCost: newJobFormData.copperPipingCost,
        outdoorFittingCost: newJobFormData.outdoorFittingCost,
        commissioningCost: newJobFormData.commissioningCost,
        equipmentCost: newJobFormData.equipmentCost
      };

      await api.post('/jobs', payload);
      toast.success("Job scheduled successfully!");
      setIsAddingJob(false);
      setNewJobFormData({
        jobType: 'Installation',
        technician: '',
        startDate: new Date().toISOString().split('T')[0],
        copperPipingCost: 0,
        outdoorFittingCost: 0,
        commissioningCost: 0,
        equipmentCost: 0
      });
      fetchCustomerJobs(selectedCustomer.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule job");
    }
  };



  const fetchCustomers = (search = '') => {
    setLoading(true);
    const params = search ? { search } : undefined;
    api.get('/customers', { params })
      .then(data => {
        setCustomers(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error("Failed to fetch customers:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchCustomers(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useRealtimeListener('customers', () => {
    fetchCustomers(searchQuery);
  });

  useRealtimeListener('jobs', () => {
    if (selectedCustomer) {
      fetchCustomerJobs(selectedCustomer.id);
    }
  });

  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const paginatedCustomers = customers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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

    const saveCustomer = async () => {
      try {
        const endpoint = editingId ? `/customers/${editingId}` : '/customers';
        const method = editingId ? 'put' : 'post';

        const payload = new FormData();
        payload.append('name', formData.name);
        payload.append('email', formData.email);
        payload.append('phone', formData.phone);
        payload.append('address', formData.address);
        if (drawingFile) payload.append('drawing', drawingFile);
        if (quotationFile) payload.append('quotation', quotationFile);

        await api[method](endpoint, payload);
        
        toast.success("Customer details saved successfully!");
        setFormData({ name: '', email: '', phone: '', address: '' });
        setDrawingFile(null);
        setQuotationFile(null);
        setEditingId(null);
        setIsModalOpen(false);
        fetchCustomers();
      } catch (err: any) {
        toast.error(err.message || "Failed to save customer");
      }
    };

    if (!formData.name.trim()) {
      toast.warning("Name is left blank!", {
        description: "Please add a location key or address as name. Do you want to save anyway?",
        action: {
          label: "Save Anyway",
          onClick: saveCustomer
        }
      });
      return;
    }

    saveCustomer();
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/customers/${id}`);
      toast.success("Customer profile deleted successfully!");
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete customer");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>Customers</h2>
          <p className={`md:hidden text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Manage your client directory and resources.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            {!isSearchExpanded && !searchQuery ? (
              <button
                onClick={() => { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-all shadow-sm ${
                  isDark 
                    ? 'bg-[#242427] border-zinc-800 text-zinc-400 hover:text-blue-400 hover:border-zinc-700' 
                    : 'bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300'
                }`}
                title="Search"
              >
                <i className="fa-solid fa-magnifying-glass text-sm"></i>
              </button>
            ) : (
              <div className="relative group animate-in fade-in slide-in-from-right-2 duration-200">
                <i className={`fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors text-sm ${
                  isDark ? 'text-zinc-500' : 'text-slate-400'
                }`}></i>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name, email, phone or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => { if (!searchQuery) setIsSearchExpanded(false); }}
                  className={`pl-10 pr-9 py-2.5 border rounded-xl outline-none focus:ring-4 transition-all w-full md:w-64 text-sm font-medium shadow-sm ${
                    isDark 
                      ? 'bg-[#242427] border-zinc-800 text-white placeholder-zinc-500 focus:ring-blue-500/20 focus:border-zinc-700' 
                      : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-blue-500/10 focus:border-blue-500'
                  }`}
                />
                {searchQuery && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-sm"></i>
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            onClick={openAddModal}
            className="md:hidden bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all aspect-square shrink-0"
          >
            <i className="fa-solid fa-plus text-lg"></i>
          </button>
          <button
            onClick={openAddModal}
            className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all font-medium shrink-0"
          >
            <i className="fa-solid fa-plus"></i>
            New Customer
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {/* Skeleton Mobile Card View */}
          <div className="md:hidden space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className={`rounded-3xl p-5 shadow-sm border flex flex-col ${
                  isDark ? 'bg-[#242427] border-zinc-800' : 'bg-white border-slate-100'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3 w-full">
                    <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3 mb-5">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-3/4" />
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-zinc-800">
                  <Skeleton className="h-6 w-20 rounded-lg" />
                  <Skeleton className="h-8 w-16 rounded-xl" />
                </div>
              </div>
            ))}
          </div>

          {/* Skeleton Desktop Table View */}
          <div className="hidden md:flex flex-col gap-4">
            <div className={`rounded-2xl border overflow-hidden shadow-sm ${
              isDark ? 'bg-[#242427] border-zinc-800' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left table-fixed">
                  <thead className={`text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'bg-[#1e1e21] text-zinc-400' : 'bg-slate-50 text-slate-500'
                  }`}>
                    <tr>
                      <th className="w-[25%] px-6 py-4">Name</th>
                      <th className="w-[25%] px-6 py-4">Contact</th>
                      <th className="w-[32%] px-6 py-4">Address</th>
                      <th className="w-[12%] px-6 py-4">Files</th>
                      <th className="w-[6%] px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-100'}`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="text-sm">
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-28 mb-1.5" />
                          <Skeleton className="h-3 w-20" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-4 w-36 mb-1.5" />
                          <Skeleton className="h-3 w-24" />
                        </td>
                        <td className="px-6 py-4">
                          <Skeleton className="h-3.5 w-full mb-1" />
                          <Skeleton className="h-3.5 w-2/3" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mobile Card View (< md) */}
          <div className="md:hidden space-y-4">
            {paginatedCustomers.map((c, index) => (
              <div 
                key={c.id} 
                onClick={() => { setSelectedCustomer(c); fetchCustomerJobs(c.id); }}
                className={`rounded-3xl p-5 shadow-sm border flex flex-col cursor-pointer transition-all ${
                  isDark ? 'bg-[#242427] border-zinc-800 hover:border-zinc-700' : 'bg-white border-slate-100 hover:border-blue-200'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      index % 2 === 0 
                        ? isDark ? 'bg-blue-950/40 text-blue-400' : 'bg-blue-50 text-blue-600'
                        : isDark ? 'bg-emerald-950/40 text-emerald-400' : 'bg-emerald-50 text-emerald-500'
                    }`}>
                      <i className="fa-solid fa-user text-xl"></i>
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg leading-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>{c.name}</h3>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>C-ID: #{c.id}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openEditModal(c); }} className={`p-2.5 rounded-full transition-colors ${
                      isDark ? 'bg-zinc-800 text-zinc-400 hover:text-blue-400' : 'bg-slate-50 text-slate-500 hover:text-blue-600'
                    }`}>
                      <i className="fa-solid fa-pen"></i>
                    </button>
                  </div>
                </div>
                <div className="space-y-2.5 mb-5">
                  <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-zinc-350' : 'text-slate-600'}`}>
                    <i className="fa-solid fa-envelope text-slate-400 w-4 text-center"></i>
                    <span className="truncate">{c.email}</span>
                  </div>
                  {c.phone && (
                    <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-zinc-350' : 'text-slate-600'}`}>
                      <i className="fa-solid fa-phone text-slate-400 w-4 text-center"></i>
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.address && (
                    <div className={`flex items-start gap-3 text-sm ${isDark ? 'text-zinc-350' : 'text-slate-600'}`}>
                      <i className="fa-solid fa-location-dot text-slate-400 w-4 text-center mt-1"></i>
                      <span className="flex-1 leading-snug">{c.address}</span>
                    </div>
                  )}
                </div>
                <div className={`flex items-center justify-between pt-4 border-t mt-auto ${isDark ? 'border-zinc-800' : 'border-slate-50'}`}>
                  <div className="flex flex-wrap gap-2">
                    {c.drawingUrl ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveFile({ url: `${API_BASE_URL}${c.drawingUrl}`, name: `${c.name}_Drawing.${c.drawingUrl?.split('.').pop()}` }); }}
                        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                          isDark 
                            ? 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30 hover:bg-emerald-900/40' 
                            : 'text-emerald-600 bg-emerald-50 border-emerald-100/50 hover:bg-emerald-100'
                        }`}
                      >
                        <i className="fa-solid fa-file-image"></i> Drawing
                      </button>
                    ) : (
                      <span className={`text-[10px] rounded-lg font-bold border uppercase px-2.5 py-1.5 ${
                        isDark 
                          ? 'bg-zinc-800/40 text-zinc-500 border-zinc-800/50' 
                          : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>No Drawing</span>
                    )}
                    {c.quotationUrl ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveFile({ url: `${API_BASE_URL}${c.quotationUrl}`, name: `${c.name}_Quotation.${c.quotationUrl?.split('.').pop()}` }); }}
                        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                          isDark 
                            ? 'text-blue-400 bg-blue-950/20 border-blue-900/30 hover:bg-blue-900/40' 
                            : 'text-blue-600 bg-blue-50 border-blue-100/50 hover:bg-blue-100'
                        }`}
                      >
                        <i className="fa-solid fa-file-pdf"></i> Quotation
                      </button>
                    ) : (
                      <span className={`text-[10px] rounded-lg font-bold border uppercase px-2.5 py-1.5 ${
                        isDark 
                          ? 'bg-zinc-800/40 text-zinc-500 border-zinc-800/50' 
                          : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>No Quote</span>
                    )}
                  </div>
                  {c.phone && (
                    <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors border ml-2 ${
                      isDark 
                        ? 'bg-blue-950/20 hover:bg-blue-900/30 text-blue-400 border-blue-900/40' 
                        : 'bg-blue-50/50 hover:bg-blue-100 text-blue-600 border-blue-100/50'
                    }`}>
                      <i className="fa-solid fa-phone"></i>
                      Call
                    </a>
                  )}
                </div>
              </div>
            ))}
            <div className="mt-4">
              <Pagination isDark={isDark} currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:flex flex-col gap-4">
            <div className={`rounded-2xl border overflow-hidden shadow-sm ${
              isDark ? 'bg-[#242427] border-zinc-800' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left table-fixed">
                  <thead className={`text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'bg-[#1e1e21] text-zinc-400' : 'bg-slate-50 text-slate-500'
                  }`}>
                    <tr>
                      <th className="w-[25%] px-6 py-4">Name</th>
                      <th className="w-[25%] px-6 py-4">Contact</th>
                      <th className="w-[32%] px-6 py-4">Address</th>
                      <th className="w-[12%] px-6 py-4">Files</th>
                      <th className="w-[6%] px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-100'}`}>
                    {paginatedCustomers.map(c => (
                      <tr 
                        key={c.id} 
                        onClick={() => { setSelectedCustomer(c); fetchCustomerJobs(c.id); }}
                        className={`text-sm transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-100/70'
                        }`}
                      >
                        <td className="px-6 py-4 overflow-hidden">
                          <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`} title={c.name}>{c.name}</p>
                          <p className={`text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Created: {new Date(c.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4 overflow-hidden">
                          <p className={`truncate ${isDark ? 'text-zinc-300' : 'text-slate-600'}`} title={c.email}>{c.email}</p>
                          <p className={`text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} title={c.phone}>{c.phone}</p>
                        </td>
                        <td className={`text-xs truncate ${isDark ? 'text-zinc-350' : 'text-slate-600'}`} title={c.address}>{c.address || <span className="text-slate-400 italic">No Address</span>}</td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1 overflow-hidden">
                            {c.drawingUrl ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveFile({ url: `${API_BASE_URL}${c.drawingUrl}`, name: `${c.name}_Drawing.${c.drawingUrl?.split('.').pop()}` }); }}
                                className={`text-[10px] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer align-left text-left justify-start truncate w-full ${
                                  isDark ? 'text-emerald-400' : 'text-emerald-600'
                                }`}
                              >
                                <i className="fa-solid fa-file-image shrink-0"></i> <span className="truncate">Drawing</span>
                              </button>
                            ) : <span className={`text-[10px] italic ${isDark ? 'text-zinc-600' : 'text-slate-350'}`}>No drawing</span>}
                            {c.quotationUrl ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setActiveFile({ url: `${API_BASE_URL}${c.quotationUrl}`, name: `${c.name}_Quotation.${c.quotationUrl?.split('.').pop()}` }); }}
                                className={`text-[10px] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer align-left text-left justify-start truncate w-full ${
                                  isDark ? 'text-blue-400' : 'text-blue-600'
                                }`}
                              >
                                <i className="fa-solid fa-file-pdf shrink-0"></i> <span className="truncate">Quotation</span>
                              </button>
                            ) : <span className={`text-[10px] italic ${isDark ? 'text-zinc-600' : 'text-slate-350'}`}>No quotation</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-3">
                            <button onClick={(e) => { e.stopPropagation(); openEditModal(c); }} className="text-blue-400 hover:text-blue-500" title="Edit Customer">
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className={`hover:text-red-500 ${isDark ? 'text-zinc-500' : 'text-red-400'}`} title="Delete Customer">
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr><td colSpan={5} className={`p-10 text-center italic ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>No customers found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination isDark={isDark} currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl w-full max-w-md p-6 shadow-2xl ${
            isDark ? 'bg-[#242427] text-zinc-100' : 'bg-white text-slate-800'
          }`}>
            <h3 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>{editingId ? 'Edit Customer' : 'Add New Customer'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input placeholder="Name" className={`w-full p-2.5 border rounded-lg ${isDark ? 'bg-[#18181b] border-zinc-800 text-white placeholder-zinc-500' : 'border-slate-200'}`} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              <input type="email" placeholder="Email" className={`w-full p-2.5 border rounded-lg ${isDark ? 'bg-[#18181b] border-zinc-800 text-white placeholder-zinc-500' : 'border-slate-200'}`} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              <input placeholder="Phone" className={`w-full p-2.5 border rounded-lg ${isDark ? 'bg-[#18181b] border-zinc-800 text-white placeholder-zinc-500' : 'border-slate-200'}`} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              <textarea placeholder="Address" className={`w-full p-2.5 border rounded-lg ${isDark ? 'bg-[#18181b] border-zinc-800 text-white placeholder-zinc-500' : 'border-slate-200'}`} rows={3} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
              <div className={`space-y-3 p-4 rounded-xl border ${
                isDark ? 'bg-zinc-800/40 border-zinc-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <label className={`block text-xs font-bold mb-1 pl-1 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Drawing</label>
                  <input type="file" className="text-sm p-1 w-full outline-none" onChange={e => setDrawingFile(e.target.files ? e.target.files[0] : null)} />
                  {editingId && <span className="text-[9px] text-slate-400 pl-1 italic">Leave empty to keep existing drawing</span>}
                </div>
                <div className={`h-px w-full ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />
                <div>
                  <label className={`block text-xs font-bold mb-1 pl-1 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>Quotation</label>
                  <input type="file" className="text-sm p-1 w-full outline-none" onChange={e => setQuotationFile(e.target.files ? e.target.files[0] : null)} />
                  {editingId && <span className="text-[9px] text-slate-400 pl-1 italic">Leave empty to keep existing quotation</span>}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 py-3 px-4 font-bold rounded-2xl transition-all ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-350' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}>Cancel</button>
                <button type="submit" className="flex-1 p-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20">{editingId ? 'Save Changes' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeFile && (
        <FileViewerModal 
          url={activeFile.url} 
          filename={activeFile.name} 
          onClose={() => {
            setActiveFile(null);
          }} 
        />
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`rounded-3xl w-full max-w-2xl p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
            isDark ? 'bg-[#242427] text-zinc-100' : 'bg-white text-slate-800'
          }`}>
            {/* Header */}
            <div className={`flex justify-between items-start mb-6 pb-4 border-b ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
              <div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedCustomer.name}</h3>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Customer ID: #{selectedCustomer.id}</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedCustomer(null);
                  setIsAddingJob(false);
                }} 
                className={`transition-colors p-2 rounded-lg ${isDark ? 'text-zinc-500 hover:text-zinc-350 hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Customer Info Card */}
              <div className={`rounded-2xl p-4 border grid grid-cols-1 md:grid-cols-2 gap-4 ${
                isDark ? 'bg-zinc-800/40 border-zinc-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <div>
                  <p className={`text-[10px] uppercase font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Email Address</p>
                  <p className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{selectedCustomer.email || 'N/A'}</p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Phone Number</p>
                  <p className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{selectedCustomer.phone || 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className={`text-[10px] uppercase font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Site Address</p>
                  <p className={`text-sm font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{selectedCustomer.address || 'N/A'}</p>
                </div>
              </div>

              {/* Jobs Section */}
              {!isAddingJob ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Associated Jobs</h4>
                    <button
                      onClick={() => {
                        setIsAddingJob(true);
                        fetchTechnicians();
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold shadow-sm transition-all"
                    >
                      <i className="fa-solid fa-calendar-plus"></i>
                      Schedule Job
                    </button>
                  </div>

                  {loadingJobs ? (
                    <div className="text-center py-6"><i className="fa-solid fa-spinner fa-spin text-blue-600 text-2xl"></i></div>
                  ) : customerJobs.length === 0 ? (
                    <div className={`text-center py-8 rounded-xl border border-dashed ${
                      isDark ? 'bg-zinc-800/20 border-zinc-850' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <i className={`fa-solid fa-clipboard-list text-2xl mb-2 ${isDark ? 'text-zinc-700' : 'text-slate-300'}`}></i>
                      <p className={`text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>No jobs scheduled for this customer.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customerJobs.map(job => {
                        const isCompleted = job.status === 'Completed';
                        return (
                          <div key={job.id} className={`rounded-xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                            isDark ? 'bg-[#18181b] border-zinc-800 hover:border-zinc-700' : 'bg-white border-slate-200 hover:border-blue-200'
                          }`}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  job.jobType === 'Service' 
                                    ? isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                                    : isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {job.jobType}
                                </span>
                                <span className={`text-xs font-mono font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>#{job.id}</span>
                              </div>
                              <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Technician: <span className={`font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>{job.technician}</span></p>
                              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Date: {new Date(job.startDate).toLocaleDateString()}</p>
                            </div>

                            <div className={`flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-none ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                <i className={`fa-solid ${isCompleted ? 'fa-circle-check text-emerald-500' : 'fa-spinner fa-spin text-amber-500'} text-[8px]`}></i>
                                {isCompleted ? 'Completed' : (job.currentPhase || 'Ongoing')}
                              </span>
                              <Link 
                                to={`/jobs/${job.id}`} 
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                View Details
                                <i className="fa-solid fa-arrow-right text-[10px]"></i>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Add Job Inline Form */
                <form onSubmit={handleScheduleJob} className={`space-y-4 border-t pt-4 ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
                  <div className="flex justify-between items-center">
                    <h4 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>Schedule New Job</h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingJob(false)}
                      className={`text-xs font-semibold ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Back to Jobs List
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Job Type</label>
                      <CustomSelect
                        value={newJobFormData.jobType}
                        onChange={val => {
                          const type = val as 'Installation' | 'Service';
                          setNewJobFormData({
                            ...newJobFormData,
                            jobType: type,
                            copperPipingCost: type === 'Service' ? 0 : newJobFormData.copperPipingCost,
                            outdoorFittingCost: type === 'Service' ? 0 : newJobFormData.outdoorFittingCost
                          });
                        }}
                        options={[
                          { value: 'Installation', label: 'New Installation' },
                          { value: 'Service', label: 'Standard Service' }
                        ]}
                        isDark={isDark}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Service Date</label>
                      <CustomDatePicker
                        value={newJobFormData.startDate}
                        onChange={val => setNewJobFormData({ ...newJobFormData, startDate: val })}
                        isDark={isDark}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Technician</label>
                      <CustomSelect
                        value={newJobFormData.technician}
                        onChange={val => setNewJobFormData({ ...newJobFormData, technician: val })}
                        options={[
                          { value: '', label: 'Select Technician' },
                          ...technicians.map(tech => ({ value: tech.email, label: tech.email }))
                        ]}
                        isDark={isDark}
                        placeholder="Select Technician"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Equipment Amount</label>
                      <input
                        type="number"
                        className={`w-full p-2.5 border rounded-xl outline-none text-sm font-medium ${
                          isDark 
                            ? 'bg-[#18181b] border-zinc-800 text-white focus:ring-blue-500/20' 
                            : 'bg-slate-50 border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
                        }`}
                        value={newJobFormData.equipmentCost}
                        onChange={e => setNewJobFormData({ ...newJobFormData, equipmentCost: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className={`space-y-4 p-4 rounded-xl border ${
                    isDark ? 'bg-zinc-800/40 border-zinc-800' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Cost Breakdown</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className={`text-[8px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Copper Piping</label>
                        <input
                          type="number"
                          disabled={newJobFormData.jobType === 'Service'}
                          className={`w-full p-2 border rounded-lg outline-none text-xs ${
                            newJobFormData.jobType === 'Service' 
                              ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-zinc-800' 
                              : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-zinc-700'
                          }`}
                          value={newJobFormData.copperPipingCost}
                          onChange={e => setNewJobFormData({ ...newJobFormData, copperPipingCost: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={`text-[8px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Outdoor Fitting</label>
                        <input
                          type="number"
                          disabled={newJobFormData.jobType === 'Service'}
                          className={`w-full p-2 border rounded-lg outline-none text-xs ${
                            newJobFormData.jobType === 'Service' 
                              ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-zinc-800' 
                              : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-zinc-700'
                          }`}
                          value={newJobFormData.outdoorFittingCost}
                          onChange={e => setNewJobFormData({ ...newJobFormData, outdoorFittingCost: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={`text-[8px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Commissioning</label>
                        <input
                          type="number"
                          className={`w-full p-2 border rounded-lg outline-none text-xs bg-white dark:bg-[#18181b] border-slate-200 dark:border-zinc-700`}
                          value={newJobFormData.commissioningCost}
                          onChange={e => setNewJobFormData({ ...newJobFormData, commissioningCost: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className={`pt-2 border-t flex justify-between items-center ${isDark ? 'border-zinc-700' : 'border-slate-200'}`}>
                      <span className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Estimated Total:</span>
                      <span className={`text-sm font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>₹{(newJobFormData.copperPipingCost + newJobFormData.outdoorFittingCost + newJobFormData.commissioningCost).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setIsAddingJob(false)} className={`flex-1 py-2.5 font-bold rounded-xl transition-colors text-xs ${
                      isDark ? 'bg-zinc-800 text-zinc-350 hover:bg-zinc-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>Cancel</button>
                    <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-xs shadow-md shadow-blue-500/10">
                      Create Job
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className={`mt-6 pt-4 border-t flex justify-end shrink-0 ${isDark ? 'border-zinc-800' : 'border-slate-100'}`}>
              <button 
                onClick={() => {
                  setSelectedCustomer(null);
                  setIsAddingJob(false);
                }} 
                className={`px-4 py-2.5 font-bold rounded-xl transition-colors text-xs ${
                  isDark ? 'bg-zinc-800 text-zinc-350 hover:bg-zinc-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default CustomerList;
