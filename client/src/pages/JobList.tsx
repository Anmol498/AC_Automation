
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Job, Customer } from '../types';
import { useAuth } from '../context/AppContext';
import { useRealtimeListener } from '../components/RealtimeProvider';
import { API_BASE_URL } from '../constants';
import Pagination from '../components/Pagination';
import CustomDatePicker from '../components/CustomDatePicker';
import CustomSelect from '../components/CustomSelect';
import { toast } from 'sonner';


const JobList: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { isDark = false } = useOutletContext<{ isDark?: boolean }>() || {};
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<{ email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const itemsPerPage = 10;

  const isTech = user?.role === 'technician';
  const [formData, setFormData] = useState({
    customerId: '',
    jobType: 'Installation' as 'Installation' | 'Service',
    technician: '',
    startDate: new Date().toISOString().split('T')[0],
    copperPipingCost: 0,
    outdoorFittingCost: 0,
    commissioningCost: 0,
    equipmentCost: 0
  });

  const handleRowClick = (e: React.MouseEvent, jobId: number) => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    navigate(`/jobs/${jobId}`);
  };

  const fetchJobs = (search = '') => {
    setLoading(true);
    const url = search
      ? `${API_BASE_URL}/jobs?search=${encodeURIComponent(search)}`
      : `${API_BASE_URL}/jobs`;

    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setJobs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch jobs error:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchJobs(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  useRealtimeListener('jobs', () => {
    fetchJobs(searchQuery);
  });

  // Filter jobs by current phase/status
  const filteredJobs = jobs.filter(job => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Completed') return job.status === 'Completed';
    return job.status !== 'Completed' && job.currentPhase === statusFilter;
  });

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Get unique status/phase options from the actual jobs list
  const statusOptions = ['All', 'Completed', ...Array.from(
    new Set(
      jobs
        .filter(job => job.status !== 'Completed')
        .map(job => job.currentPhase)
        .filter((phase): phase is string => !!phase)
    )
  ).sort()];


  useEffect(() => {
    fetch(`${API_BASE_URL}/customers`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCustomers(Array.isArray(data) ? data : []));

    fetch(`${API_BASE_URL}/technicians`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setTechnicians(Array.isArray(data) ? data : []));
  }, [token]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error("Please select a customer");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success("Job workflow scheduled successfully");
        setIsModalOpen(false);
        setFormData({
          customerId: '',
          jobType: 'Installation',
          technician: '',
          startDate: new Date().toISOString().split('T')[0],
          copperPipingCost: 0,
          outdoorFittingCost: 0,
          commissioningCost: 0,
          equipmentCost: 0
        });
        fetchJobs();
      } else {
        toast.error("Failed to schedule job workflow");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to schedule job workflow");
    }
  };

  const handleDelete = (id: number) => {
    toast.error("Delete job workflow?", {
      description: "Are you sure you want to delete this job and all its phases? This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/jobs/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              toast.success("Job workflow deleted successfully");
              fetchJobs();
            } else {
              toast.error("Failed to delete job workflow");
            }
          } catch (err) {
            console.error(err);
            toast.error("Failed to delete job workflow");
          }
        }
      }
    });
  };

  const exportToExcel = async () => {
    try {
      // First fetch all payments to calculate due balance
      const allPaymentsRes = await Promise.all(
        jobs.map(job => fetch(`${API_BASE_URL}/jobs/${job.id}/payments`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()))
      );

      const exportData = jobs.map((job, index) => {
        const jobPayments = Array.isArray(allPaymentsRes[index]) ? allPaymentsRes[index] : [];
        const totalPaid = jobPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const dueBalance = Math.max(0, Number(job.totalCost || 0) - totalPaid);

        return {
          'Job ID': job.id,
          'Customer Name': job.customerName,
          'Job Type': job.jobType,
          'Start Date': new Date(job.startDate).toLocaleDateString(),
          'Technician': job.technician,
          'Status': job.status,
          'Current Phase': job.currentPhase || 'N/A',
          'Payment Status': job.paymentStatus,
          'Copper Piping Cost': Number(job.copperPipingCost),
          'Outdoor Fitting Cost': Number(job.outdoorFittingCost),
          'Total Payment': Number(job.commissioningCost),
          'Total Cost': Number(job.totalCost),
          'Total Paid': totalPaid,
          'Due Balance': dueBalance
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Jobs");

      // Auto-size columns based on header length
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `Job_Details_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Job details exported to Excel successfully");
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export to Excel.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>{isTech ? 'My Assigned Jobs' : 'Jobs & Phases'}</h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{isTech ? 'Track progress on your allotted service workflows.' : 'Track real-time progress across all service workflows.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            {!isSearchExpanded && !searchQuery ? (
              <button
                onClick={() => { setIsSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
                className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-all shadow-sm ${
                  isDark 
                    ? 'bg-[var(--color-card-dark)] border-[var(--color-border-dark)] text-zinc-400 hover:text-[var(--color-primary)]' 
                    : 'bg-[var(--color-card-light)] border-[var(--color-border-light)] text-slate-400 hover:text-[var(--color-primary)]'
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
                  placeholder="Search client, tech, address or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => { if (!searchQuery) setIsSearchExpanded(false); }}
                  className={`pl-10 pr-9 py-2.5 border rounded-xl outline-none focus:ring-4 transition-all w-full md:w-64 text-sm font-medium shadow-sm ${
                    isDark 
                      ? 'bg-[var(--color-card-dark)] border-[var(--color-border-dark)] text-white placeholder-zinc-500 focus:ring-blue-500/20 focus:border-blue-500/30' 
                      : 'bg-[var(--color-card-light)] border-[var(--color-border-light)] text-slate-800 placeholder-slate-400 focus:ring-blue-500/10 focus:border-blue-500'
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
            <CustomSelect
              value={statusFilter}
              onChange={val => setStatusFilter(val)}
              options={statusOptions.map(option => ({
                value: option,
                label: option === 'All' ? 'All Statuses' : option
              }))}
              isDark={isDark}
              className="w-36 sm:w-40 md:w-48"
            />
          {!isTech && (
            <div className="flex gap-2">
              <button
                onClick={exportToExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 md:px-4 md:py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all font-medium shrink-0"
                title="Export Jobs to Excel"
              >
                <i className="fa-solid fa-file-excel"></i>
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 md:px-4 md:py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all font-medium shrink-0 aspect-square md:aspect-auto"
              >
                <i className="fa-solid fa-plus md:fa-calendar-plus"></i>
                <span className="hidden sm:inline">Schedule Job</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center p-10"><i className="fa-solid fa-spinner fa-spin text-blue-600 text-2xl"></i></div>
      ) : (
        <>
          {/* Mobile Card View (< md) */}
          <div className="md:hidden space-y-4">
            {paginatedJobs.map((job) => {
              const dueBalance = Math.max(0, Number(job.totalCost) - Number(job.totalPaid || 0));
              const isPaid = dueBalance <= 0;
              const isCompleted = job.status === 'Completed';
              return (
                <div key={job.id} className={`rounded-2xl p-5 shadow-sm border flex flex-col ${
                  isDark ? 'bg-[var(--color-card-dark)] border-[var(--color-border-dark)]' : 'bg-[var(--color-card-light)] border-[var(--color-border-light)]'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        job.jobType === 'Service' 
                          ? isDark ? 'bg-purple-950/40 text-purple-400' : 'bg-purple-50 text-purple-600' 
                          : isDark ? 'bg-blue-950/40 text-blue-400' : 'bg-blue-50 text-blue-600'
                      }`}>
                        <i className={`fa-solid ${job.jobType === 'Service' ? 'fa-screwdriver-wrench' : 'fa-hammer'} text-lg`}></i>
                      </div>
                      <div>
                        <h3 className={`font-bold border-none m-0 leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{job.customerName}</h3>
                        <p className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Scheduled: {new Date(job.startDate).toLocaleDateString()} • #{job.id}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase shrink-0 ml-2 ${
                      job.jobType === 'Service' 
                        ? isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700' 
                        : isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {job.jobType}
                    </div>
                  </div>

                  {user?.role === 'superadmin' && (
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div>
                        <p className={`text-[10px] uppercase font-medium ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Total Cost</p>
                        <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>₹{Number(job.totalCost).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] uppercase font-medium ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Remaining</p>
                        <div className={`flex items-center justify-end gap-1 font-bold ${isPaid ? 'text-emerald-500' : 'text-red-500'}`}>
                          {!isPaid && <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>}
                          <span className="text-lg">₹{dueBalance.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 mt-auto mb-4">
                    <div className="flex justify-between items-center">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                        isCompleted 
                          ? isDark ? 'bg-emerald-950/20 border-emerald-900/35' : 'bg-emerald-50 border-emerald-100' 
                          : 'bg-[var(--color-primary-light)] border-[var(--color-primary)]/20'
                      }`}>
                        <i className={`fa-solid ${isCompleted ? 'fa-circle-check text-emerald-500' : 'fa-spinner fa-spin text-[var(--color-primary)]'} text-xs`}></i>
                        <span className={`text-[10px] font-bold uppercase tracking-tight ${
                          isCompleted ? 'text-emerald-500' : 'text-[var(--color-primary)]'
                        }`}>
                          {isCompleted ? 'COMPLETED' : (job.currentPhase || 'Ongoing')}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold ${isCompleted ? 'text-emerald-500' : isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        {isCompleted ? '100%' : 'In Progress'}
                      </span>
                    </div>
                  </div>

                  <div className={`pt-4 border-t flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-slate-50'}`}>
                    <div className="flex -space-x-2">
                      <div className={`w-7 h-7 rounded-full border-2 bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shadow-sm ${
                        isDark ? 'border-zinc-800 bg-zinc-800 text-zinc-300' : 'border-white bg-slate-200 text-slate-600'
                      }`} title={job.customerName}>
                        {job.customerName.substring(0, 2).toUpperCase()}
                      </div>
                      {job.technician && (
                        <div className={`w-7 h-7 rounded-full border-2 bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold shadow-sm ${
                          isDark ? 'border-zinc-800' : 'border-white'
                        }`} title={job.technician}>
                          {job.technician.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!isTech && (
                        <button
                          onClick={() => handleDelete(job.id)}
                          className={`p-2 transition-colors ${isDark ? 'text-zinc-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}
                          title="Delete Job"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      )}
                      <Link
                        to={`/jobs/${job.id}`}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                          isDark 
                            ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white' 
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Details <i className="fa-solid fa-chevron-right text-[10px]"></i>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="mt-4">
              <Pagination isDark={isDark}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
            {jobs.length === 0 && (
              <div className={`p-12 text-center rounded-2xl border ${
                isDark ? 'bg-[var(--color-card-dark)] border-[var(--color-border-dark)]' : 'bg-white border-slate-200'
              }`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl mb-3 ${
                  isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-slate-50 text-slate-300'
                }`}>
                  <i className="fa-solid fa-clipboard-list"></i>
                </div>
                <p className={`text-sm font-medium ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>No active jobs found. Start by scheduling a new one.</p>
              </div>
            )}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className={`hidden md:block rounded-2xl border shadow-sm overflow-hidden ${
            isDark ? 'bg-[var(--color-card-dark)] border-[var(--color-border-dark)]' : 'bg-[var(--color-card-light)] border-[var(--color-border-light)]'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className={`text-[10px] font-bold uppercase tracking-widest ${
                  isDark ? 'bg-[#1e1e21] text-zinc-400' : 'bg-slate-50 text-slate-500'
                }`}>
                  <tr>
                    <th className={`${user?.role === 'superadmin' ? 'w-[8%]' : 'w-[10%]'} px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>ID</th>
                    <th className={`${user?.role === 'superadmin' ? 'w-[22%]' : 'w-[36%]'} px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Customer</th>
                    <th className={`${user?.role === 'superadmin' ? 'w-[12%]' : 'w-[16%]'} px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Job Type</th>
                    {user?.role === 'superadmin' && <th className={`w-[12%] px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Total Cost</th>}
                    {user?.role === 'superadmin' && <th className={`w-[18%] px-6 py-4 border-b text-center ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Remaining</th>}
                    <th className={`${user?.role === 'superadmin' ? 'w-[22%]' : 'w-[30%]'} px-6 py-4 border-b ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Current Phase / Status</th>
                    <th className={`${user?.role === 'superadmin' ? 'w-[6%]' : 'w-[8%]'} px-6 py-4 border-b text-right ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-slate-100'}`}>
                  {paginatedJobs.map((job) => (
                    <tr
                      key={job.id}
                      className={`transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-50'}`}
                      onClick={(e) => handleRowClick(e, job.id)}
                    >
                      <td className={`px-6 py-4 font-mono text-xs font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>#{job.id}</td>
                      <td className="px-6 py-4 overflow-hidden">
                        <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`} title={job.customerName}>{job.customerName}</p>
                        <p className={`text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Scheduled: {new Date(job.startDate).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          job.jobType === 'Service' 
                            ? isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700' 
                            : isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {job.jobType}
                        </span>
                      </td>
                      {user?.role === 'superadmin' && (
                        <td className="px-6 py-4">
                          <p className={`font-bold ${isDark ? 'text-zinc-350' : 'text-slate-700'}`}>₹{Number(job.totalCost).toLocaleString()}</p>
                        </td>
                      )}
                      {user?.role === 'superadmin' && (
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm border ${(Number(job.totalCost) - Number(job.totalPaid || 0)) <= 0 ? (isDark ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' : 'bg-emerald-100 text-emerald-700 border-emerald-500/20') : (isDark ? 'bg-red-950/40 text-red-400 border-red-900/50' : 'bg-red-100 text-red-700 border-red-500/20')}`}>
                            {(Number(job.totalCost) - Number(job.totalPaid || 0)) <= 0 ? (
                              <>
                                <i className="fa-solid fa-circle-check"></i>
                                Fully Paid
                              </>
                            ) : (
                              <>
                                <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                                ₹{Math.max(0, Number(job.totalCost) - Number(job.totalPaid || 0)).toLocaleString()}
                              </>
                            )}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        {job.status === 'Completed' ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border ${isDark ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' : 'bg-emerald-100 text-emerald-700 border-emerald-500/20'}`}>
                            <i className="fa-solid fa-circle-check"></i>
                            Completed
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm border bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary)]/20`}>
                            <i className="fa-solid fa-spinner fa-spin text-[8px] text-[var(--color-primary)]"></i>
                            {job.currentPhase || 'Ongoing'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {!isTech && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(job.id);
                              }}
                              className={`p-2 transition-colors ${isDark ? 'text-zinc-500 hover:text-red-400' : 'text-slate-300 hover:text-red-500'}`}
                              title="Delete Job"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {jobs.length === 0 && (
                    <tr>
                      <td colSpan={user?.role === 'superadmin' ? 7 : 5} className="p-12 text-center">
                        <div className="max-w-xs mx-auto space-y-3">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl ${
                            isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-slate-50 text-slate-300'
                          }`}>
                            <i className="fa-solid fa-clipboard-list"></i>
                          </div>
                          <p className={`text-sm font-medium ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>No active jobs found. Start by scheduling a new one.</p>
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

        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in duration-200 my-auto ${
            isDark ? 'bg-[var(--color-card-dark)] border border-[var(--color-border-dark)] text-zinc-100' : 'bg-[var(--color-card-light)] border border-[var(--color-border-light)] text-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Schedule New Job</h3>
              <button onClick={() => setIsModalOpen(false)} className={`transition-colors ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'}`}>
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSchedule} className="space-y-6">
              <div className="space-y-2">
                <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Assign Customer</label>
                <CustomSelect
                  value={formData.customerId}
                  onChange={val => setFormData({ ...formData, customerId: val })}
                  options={[
                    { value: '', label: 'Select site/customer...' },
                    ...customers.map(c => ({
                      value: c.id,
                      label: c.name ? `${c.name} - ${c.address}` : c.address
                    }))
                  ]}
                  isDark={isDark}
                  placeholder="Select site/customer..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Job Category</label>
                  <CustomSelect
                    value={formData.jobType}
                    onChange={val => {
                      const type = val as 'Installation' | 'Service';
                      setFormData({
                        ...formData,
                        jobType: type,
                        copperPipingCost: type === 'Service' ? 0 : formData.copperPipingCost,
                        outdoorFittingCost: type === 'Service' ? 0 : formData.outdoorFittingCost
                      });
                    }}
                    options={[
                      { value: 'Installation', label: 'New Installation' },
                      { value: 'Service', label: 'Standard Service' }
                    ]}
                    isDark={isDark}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Service Date</label>
                  <CustomDatePicker
                    value={formData.startDate}
                    onChange={val => setFormData({ ...formData, startDate: val })}
                    isDark={isDark}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Technician</label>
                  <CustomSelect
                    value={formData.technician}
                    onChange={val => setFormData({ ...formData, technician: val })}
                    options={[
                      { value: '', label: 'Select Technician' },
                      ...technicians.map(tech => ({ value: tech.email, label: tech.email }))
                    ]}
                    isDark={isDark}
                    placeholder="Select Technician"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Equipment Amount <span className={`text-[9px] font-normal normal-case ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>(Separate from installation costs)</span></label>
                  <input
                    type="number"
                    className={`w-full p-3.5 border rounded-xl outline-none focus:ring-4 transition-all font-medium ${
                      isDark 
                        ? 'bg-[#18181b] border-zinc-800 text-white focus:ring-blue-500/20' 
                        : 'bg-slate-50 border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
                    }`}
                    value={formData.equipmentCost}
                    onChange={e => setFormData({ ...formData, equipmentCost: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className={`space-y-4 p-4 rounded-2xl border ${
                isDark ? 'bg-zinc-800/40 border-zinc-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Cost Breakdown</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className={`text-[9px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Copper Piping</label>
                    <input
                      type="number"
                      disabled={formData.jobType === 'Service'}
                      className={`w-full p-2 border rounded-lg outline-none text-sm ${
                        formData.jobType === 'Service' 
                          ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-zinc-800' 
                          : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-zinc-700'
                      }`}
                      value={formData.copperPipingCost}
                      onChange={e => setFormData({ ...formData, copperPipingCost: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Outdoor Fitting</label>
                    <input
                      type="number"
                      disabled={formData.jobType === 'Service'}
                      className={`w-full p-2 border rounded-lg outline-none text-sm ${
                        formData.jobType === 'Service' 
                          ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-zinc-800' 
                          : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-zinc-700'
                      }`}
                      value={formData.outdoorFittingCost}
                      onChange={e => setFormData({ ...formData, outdoorFittingCost: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-bold uppercase ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Commissioning</label>
                    <input
                      type="number"
                      className={`w-full p-2 border rounded-lg outline-none text-sm bg-white dark:bg-[#18181b] border-slate-200 dark:border-zinc-700`}
                      value={formData.commissioningCost}
                      onChange={e => setFormData({ ...formData, commissioningCost: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className={`pt-4 mt-2 border-t flex justify-between items-center ${isDark ? 'border-zinc-700' : 'border-slate-200'}`}>
                  <span className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Estimated Total:</span>
                  <span className={`text-lg font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>₹{(formData.copperPipingCost + formData.outdoorFittingCost + formData.commissioningCost).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 p-4 font-bold rounded-xl transition-colors ${
                  isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>Cancel</button>
                <button type="submit" className="flex-1 p-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all">
                  Create Job Workflow
                </button>
              </div>
            </form>
          </div>
        </div >
      )}
    </div >
  );
};

export default JobList;