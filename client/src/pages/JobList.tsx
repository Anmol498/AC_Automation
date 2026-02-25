
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Job, Customer } from '../types';
import { useAuth } from '../App';
import { API_BASE_URL } from '../constants';

const JobList: React.FC = () => {
  const { token, user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<{ email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isTech = user?.role === 'technician';
  const [formData, setFormData] = useState({
    customerId: '',
    jobType: 'Installation' as 'Installation' | 'Service',
    technician: '',
    startDate: new Date().toISOString().split('T')[0],
    copperPipingCost: 0,
    outdoorFittingCost: 0,
    commissioningCost: 0
  });

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
    fetch(`${API_BASE_URL}/customers`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCustomers(Array.isArray(data) ? data : []));

    fetch(`${API_BASE_URL}/technicians`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setTechnicians(Array.isArray(data) ? data : []));
  }, [token]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) return alert("Please select a customer");

    try {
      const res = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          customerId: '',
          jobType: 'Installation',
          technician: '',
          startDate: new Date().toISOString().split('T')[0],
          copperPipingCost: 0,
          outdoorFittingCost: 0,
          commissioningCost: 0
        });
        fetchJobs();
      }
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this job and all its phases?")) return;
    try {
      await fetch(`${API_BASE_URL}/jobs/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchJobs();
    } catch (err) { console.error(err); }
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
          'Commissioning Cost': Number(job.commissioningCost),
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
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export to Excel.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">{isTech ? 'My Assigned Jobs' : 'Jobs & Phases'}</h2>
          <p className="text-slate-500 text-xs mt-1">{isTech ? 'Track progress on your allotted service workflows.' : 'Track real-time progress across all service workflows.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 group">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
            <input
              type="text"
              placeholder="Search client, tech, or type..."
              className="pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full md:w-64 text-sm font-medium shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
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
            {jobs.map((job) => {
              const dueBalance = Math.max(0, Number(job.totalCost) - Number(job.totalPaid || 0));
              const isPaid = dueBalance <= 0;
              const isCompleted = job.status === 'Completed';
              return (
                <div key={job.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${job.jobType === 'Service' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                        <i className={`fa-solid ${job.jobType === 'Service' ? 'fa-screwdriver-wrench' : 'fa-hammer'} text-lg`}></i>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 border-none m-0 leading-tight">{job.customerName}</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Scheduled: {new Date(job.startDate).toLocaleDateString()} • #{job.id}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase shrink-0 ml-2 ${job.jobType === 'Service' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                      {job.jobType}
                    </div>
                  </div>

                  {!isTech && (
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-medium">Total Cost</p>
                        <p className="text-lg font-bold text-slate-800">₹{Number(job.totalCost).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-medium">Remaining</p>
                        <div className={`flex items-center justify-end gap-1 font-bold ${isPaid ? 'text-emerald-500' : 'text-red-500'}`}>
                          {!isPaid && <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>}
                          <span className="text-lg">₹{dueBalance.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 mt-auto mb-4">
                    <div className="flex justify-between items-center">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isCompleted ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
                        }`}>
                        <i className={`fa-solid ${isCompleted ? 'fa-circle-check text-emerald-500' : 'fa-spinner fa-spin text-amber-500'} text-xs`}></i>
                        <span className={`text-[10px] font-bold uppercase tracking-tight ${isCompleted ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                          {isCompleted ? 'COMPLETED' : (job.currentPhase || 'Ongoing')}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold ${isCompleted ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {isCompleted ? '100%' : 'In Progress'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shadow-sm" title={job.customerName}>
                        {job.customerName.substring(0, 2).toUpperCase()}
                      </div>
                      {job.technician && (
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold shadow-sm" title={job.technician}>
                          {job.technician.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!isTech && (
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete Job"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      )}
                      <Link
                        to={`/jobs/${job.id}`}
                        className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-200 transition-colors"
                      >
                        Details <i className="fa-solid fa-chevron-right text-[10px]"></i>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
            {jobs.length === 0 && (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 text-2xl mb-3">
                  <i className="fa-solid fa-clipboard-list"></i>
                </div>
                <p className="text-slate-400 text-sm font-medium">No active jobs found. Start by scheduling a new one.</p>
              </div>
            )}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4 border-b border-slate-200">ID</th>
                    <th className="px-6 py-4 border-b border-slate-200">Customer</th>
                    <th className="px-6 py-4 border-b border-slate-200">Job Type</th>
                    {!isTech && <th className="px-6 py-4 border-b border-slate-200">Total Cost</th>}
                    <th className="px-6 py-4 border-b border-slate-200 text-center">Remaining</th>
                    <th className="px-6 py-4 border-b border-slate-200">Current Phase / Status</th>
                    <th className="px-6 py-4 border-b border-slate-200 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#{job.id}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{job.customerName}</p>
                        <p className="text-[10px] text-slate-400">Scheduled: {new Date(job.startDate).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${job.jobType === 'Service' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                          {job.jobType}
                        </span>
                      </td>
                      {!isTech && (
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-700">₹{Number(job.totalCost).toLocaleString()}</p>
                        </td>
                      )}
                      <td className="px-6 py-4 text-center">
                        {isTech ? (
                          <span className="text-slate-400 text-[10px] italic">Hidden</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider ${(Number(job.totalCost) - Number(job.totalPaid || 0)) <= 0 ? 'bg-emerald-100 text-emerald-700 shadow-sm border border-emerald-500/20' : 'bg-red-100 text-red-700 shadow-sm border border-red-500/20'}`}>
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
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {job.status === 'Completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <i className="fa-solid fa-circle-check"></i>
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <i className="fa-solid fa-spinner fa-spin text-[8px]"></i>
                            {job.currentPhase || 'Ongoing'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link to={`/jobs/${job.id}`} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="View Progress">
                            <i className="fa-solid fa-arrow-right"></i>
                          </Link>
                          {!isTech && (
                            <button
                              onClick={() => handleDelete(job.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
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
                      <td colSpan={6} className="p-12 text-center">
                        <div className="max-w-xs mx-auto space-y-3">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 text-2xl">
                            <i className="fa-solid fa-clipboard-list"></i>
                          </div>
                          <p className="text-slate-400 text-sm font-medium">No active jobs found. Start by scheduling a new one.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in duration-200 my-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-800">Schedule New Job</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSchedule} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assign Customer</label>
                <select
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                  value={formData.customerId}
                  onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                  required
                >
                  <option value="">Select a customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Job Category</label>
                  <select
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.jobType}
                    onChange={e => {
                      const type = e.target.value as 'Installation' | 'Service';
                      setFormData({
                        ...formData,
                        jobType: type,
                        copperPipingCost: type === 'Service' ? 0 : formData.copperPipingCost,
                        outdoorFittingCost: type === 'Service' ? 0 : formData.outdoorFittingCost
                      });
                    }}
                  >
                    <option value="Installation">New Installation</option>
                    <option value="Service">Standard Service</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Service Date</label>
                  <input
                    type="date"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Technician</label>
                  <select
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                    value={formData.technician}
                    onChange={e => setFormData({ ...formData, technician: e.target.value })}
                    required
                  >
                    <option value="">Select Technician</option>
                    {technicians.map(tech => (
                      <option key={tech.email} value={tech.email}>{tech.email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost Breakdown</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Copper Piping</label>
                    <input
                      type="number"
                      disabled={formData.jobType === 'Service'}
                      className={`w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm ${formData.jobType === 'Service' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                      value={formData.copperPipingCost}
                      onChange={e => setFormData({ ...formData, copperPipingCost: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Outdoor Fitting</label>
                    <input
                      type="number"
                      disabled={formData.jobType === 'Service'}
                      className={`w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm ${formData.jobType === 'Service' ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                      value={formData.outdoorFittingCost}
                      onChange={e => setFormData({ ...formData, outdoorFittingCost: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Commissioning</label>
                    <input
                      type="number"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm"
                      value={formData.commissioningCost}
                      onChange={e => setFormData({ ...formData, commissioningCost: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="pt-4 mt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Estimated Total:</span>
                  <span className="text-lg font-black text-blue-600">₹{(formData.copperPipingCost + formData.outdoorFittingCost + formData.commissioningCost).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
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