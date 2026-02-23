
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Job, Customer, JobPhase, Payment } from '../types';
import { APP_NAME, SUPPORT_EMAIL, API_BASE_URL } from '../constants';
import { useAuth } from '../App';
import { GoogleGenAI } from '@google/genai';

const JobDetail: React.FC = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [phases, setPhases] = useState<JobPhase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('Transfer');
  const [newPaymentNotes, setNewPaymentNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      const paymentsRes = await fetch(`${API_BASE_URL}/jobs/${id}/payments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const paymentsData = paymentsRes.ok ? await paymentsRes.json() : [];

      if (res.ok) {
        setJob(data.job);
        setPhases(Array.isArray(data.phases) ? data.phases : []);
        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      } else {
        setError(data.error || "Failed to load job details");
      }
    } catch (err) {
      console.error("Failed to fetch job", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updatePaymentStatus = async (newStatus: string) => {
    if (!job) return;
    setIsUpdatingPayment(true);
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });
      if (res.ok) {
        setJob({ ...job, paymentStatus: newStatus });
        setNotification({ message: `Payment status updated to ${newStatus}`, type: 'success' });
      }
    } catch (err) {
      setNotification({ message: "Failed to update payment status", type: 'error' });
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentAmount || isNaN(Number(newPaymentAmount))) return;
    setIsRecordingPayment(true);
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: Number(newPaymentAmount),
          paymentMethod: newPaymentMethod,
          notes: newPaymentNotes
        }),
      });
      if (res.ok) {
        setNotification({ message: 'Payment recorded successfully', type: 'success' });
        setNewPaymentAmount('');
        setNewPaymentNotes('');
        fetchData();
      } else {
        const data = await res.json();
        setNotification({ message: data.error || 'Failed to record payment', type: 'error' });
      }
    } catch (err) {
      setNotification({ message: "Network error recording payment", type: 'error' });
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleMarkComplete = async (phaseId: number) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase || !job) return;

    setIsProcessing(phaseId);
    setNotification(null);

    try {
      const response = await fetch(`${API_BASE_URL}/phases/${phaseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isCompleted: true }),
      });

      const data = await response.json();

      if (response.ok) {
        // AI Enhancement
        let personalizedNote = "Great progress!";
        try {
          if (process.env.API_KEY) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const aiRes = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Generate a 1-sentence friendly update for "${phase.phaseName}" for ${job.customerName}.`,
            });
            personalizedNote = aiRes.text || personalizedNote;
          }
        } catch (e) { }

        // Update local state immediately for snappy UI
        setPhases(prev => prev.map(p =>
          p.id === phaseId ? { ...p, isCompleted: true, completedAt: new Date().toISOString() } : p
        ));

        // Update job status and current phase if returned by backend
        setJob((prev: any) => ({
          ...prev,
          status: data.jobStatus || prev.status,
          currentPhase: data.currentPhase
        }));

        setNotification({
          message: data.jobStatus === 'Completed'
            ? `Job fully completed! Automated summary sent to ${job.customerEmail}.`
            : `Phase completed. Automated notification sent to ${job.customerEmail}.`,
          type: 'success'
        });
      } else {
        setNotification({ message: data.error || "Failed to update phase", type: 'error' });
      }
    } catch (err) {
      setNotification({ message: "Network connection error", type: 'error' });
    } finally {
      setIsProcessing(null);
    }
  };

  if (loading) return <div className="p-10 text-center"><i className="fa-solid fa-spinner fa-spin text-2xl text-blue-600"></i></div>;
  if (error || !job) return (
    <div className="p-10 text-center space-y-4">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <i className="fa-solid fa-circle-exclamation text-2xl"></i>
      </div>
      <h3 className="text-xl font-bold text-slate-800">{error || "Job not found"}</h3>
      <p className="text-slate-500">The job you are looking for might have been deleted or you don't have permission to view it.</p>
      <Link to="/jobs" className="inline-block bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-black transition-all">
        Return to Jobs List
      </Link>
    </div>
  );

  const completedCount = phases.filter(p => p.isCompleted).length;
  const progressPercent = phases.length > 0 ? Math.round((completedCount / phases.length) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/jobs" className="text-blue-600 text-sm font-semibold flex items-center gap-1 mb-2 hover:underline">
            <i className="fa-solid fa-arrow-left"></i> Back to Jobs
          </Link>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Job #{job.id}</h2>
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">
              {job.jobType}
            </span>
            <span className="text-slate-500 text-sm font-medium flex items-center gap-1.5">
              <i className="fa-solid fa-user-circle text-slate-300 text-lg"></i> {job.customerName}
            </span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 w-full md:w-64 shadow-sm">
          <div className="flex justify-between mb-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Workflow Progress</span>
            <span className="text-blue-600">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(37,99,235,0.3)] ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <p className="text-sm font-medium">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="ml-auto opacity-50 hover:opacity-100 transition-opacity"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      {/* Cards row — horizontally aligned */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Quick Stats */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-700/50 flex flex-col justify-between relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>

          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                <i className="fa-solid fa-chart-line text-blue-400"></i>
              </div>
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Quick Stats</h4>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-medium">Technician</span>
                <span className="text-sm font-bold bg-white/10 px-2 py-1 rounded-md">{job.technician}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-medium">Started</span>
                <span className="text-sm font-bold">{new Date(job.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-xs font-medium">Progress</span>
                {job.status === 'Completed' ? (
                  <span className="text-[10px] px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black uppercase tracking-wider">
                    Completed
                  </span>
                ) : (
                  <span className="text-[10px] px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 font-black uppercase tracking-wider animate-pulse">
                    {job.currentPhase || 'Ongoing'}
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Contact Details */}
        <div className="bg-white rounded-2xl border-t-4 border-t-blue-500 border-x border-b border-slate-200 p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_25px_rgb(0,0,0,0.06)] transition-shadow flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <i className="fa-solid fa-address-card text-lg"></i>
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Contact</h3>
          </div>

          <div className="space-y-5 flex-1">
            <div className="group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <i className="fa-solid fa-envelope text-slate-300 group-hover:text-blue-500 transition-colors"></i> Email
              </p>
              <p className="text-sm font-semibold text-slate-800 break-all bg-slate-50 p-2.5 rounded-lg border border-slate-100">{job.customerEmail}</p>
            </div>
            <div className="group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <i className="fa-solid fa-phone text-slate-300 group-hover:text-blue-500 transition-colors"></i> Phone
              </p>
              <p className="text-sm font-semibold text-slate-800">{job.customerPhone || 'N/A'}</p>
            </div>
            <div className="group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <i className="fa-solid fa-location-dot text-slate-300 group-hover:text-blue-500 transition-colors"></i> Location
              </p>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">{job.customerAddress}</p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        {user?.role !== 'technician' && (
          <div className="bg-white rounded-2xl border-t-4 border-t-emerald-500 border-x border-b border-slate-200 p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_25px_rgb(0,0,0,0.06)] transition-shadow flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <i className="fa-solid fa-chart-pie text-lg"></i>
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Finances</h3>
            </div>

            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Copper</span>
                  <span className="font-semibold text-slate-800">₹{Number(job.copperPipingCost || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Outdoor</span>
                  <span className="font-semibold text-slate-800">₹{Number(job.outdoorFittingCost || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Commission</span>
                  <span className="font-semibold text-slate-800">₹{Number(job.commissioningCost || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Cost</span>
                  <span className="text-lg font-black text-slate-800">₹{Number(job.totalCost || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50 p-2.5 rounded-xl border border-emerald-100/50">
                  <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Total Paid</span>
                  <span className="text-lg font-black text-emerald-600">₹{payments.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-red-50 p-2.5 rounded-xl border border-red-100/50">
                  <span className="text-xs font-black text-red-600 uppercase tracking-widest">Balance</span>
                  <span className="text-xl font-black text-red-600">₹{Math.max(0, Number(job.totalCost || 0) - payments.reduce((sum, p) => sum + Number(p.amount), 0)).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Record Payment */}
        {user?.role !== 'technician' && (
          <div className="bg-white rounded-2xl border-t-4 border-t-indigo-500 border-x border-b border-slate-200 p-6 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_25px_rgb(0,0,0,0.06)] transition-shadow flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <i className="fa-solid fa-money-bill-wave text-lg"></i>
              </div>
              <h3 className="font-bold text-slate-800 text-lg">Payment</h3>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input type="number" required min="0.01" step="0.01" value={newPaymentAmount} onChange={e => setNewPaymentAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="0.00" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Method</label>
                  <select value={newPaymentMethod} onChange={e => setNewPaymentMethod(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                    <option value="Transfer">Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notes (Optional)</label>
                <input type="text" value={newPaymentNotes} onChange={e => setNewPaymentNotes(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400" placeholder="e.g. Check #123" />
              </div>

              <button type="submit" disabled={isRecordingPayment} className="w-full bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                {isRecordingPayment ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-plus"></i> Record</>}
              </button>
            </form>

            {payments.length > 0 && (
              <div className="pt-4 mt-5 border-t border-slate-100 flex-1 flex flex-col">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left"></i> History
                </h4>
                <div className="space-y-2.5 max-h-32 overflow-y-auto pr-1 flex-1">
                  {payments.map(p => (
                    <div key={p.id} className="bg-slate-50 hover:bg-indigo-50/30 transition-colors p-3 rounded-xl border border-slate-100 flex flex-col gap-1.5 group">
                      <div className="flex justify-between items-center whitespace-nowrap">
                        <span className="font-bold text-slate-800 text-sm">₹{Number(p.amount).toLocaleString()}</span>
                        <span className="text-[9px] font-black px-2 py-0.5 bg-white border border-slate-200 text-slate-500 uppercase tracking-widest rounded-md">{p.payment_method}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-medium"><i className="fa-regular fa-calendar mr-1"></i>{new Date(p.created_at).toLocaleDateString()}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[80px]" title={p.recorded_by}><i className="fa-solid fa-user-pen mr-1"></i>{p.recorded_by.split('@')[0]}</span>
                      </div>
                      {p.notes && <p className="text-[10px] text-slate-500 italic mt-0.5 pt-1.5 border-t border-slate-200/50">"{p.notes}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workflow Phases — full width below cards */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Workflow Progression</p>
          <button onClick={fetchData} className="text-slate-400 hover:text-blue-600 transition-colors">
            <i className="fa-solid fa-rotate-right text-xs"></i>
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {phases.map((phase, idx) => (
            <div key={phase.id} className={`p-4 flex items-center gap-4 transition-all ${phase.isCompleted ? 'bg-emerald-50/20' : 'hover:bg-slate-50 group'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all shrink-0 ${phase.isCompleted
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                }`}>
                {phase.isCompleted ? <i className="fa-solid fa-check text-base"></i> : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${phase.isCompleted ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`}>{phase.phaseName}</p>
                {phase.completedAt && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[9px] text-emerald-600 font-black uppercase tracking-wider">
                      <i className="fa-solid fa-clock mr-1"></i>
                      Finished {new Date(phase.completedAt).toLocaleDateString()}
                    </p>
                    <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold uppercase">
                      <i className="fa-solid fa-envelope mr-0.5"></i> Email Sent
                    </span>
                  </div>
                )}
              </div>
              {!phase.isCompleted ? (
                <button
                  onClick={() => handleMarkComplete(phase.id)}
                  disabled={isProcessing === phase.id}
                  className="px-4 py-1.5 bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:shadow-md hover:shadow-blue-500/10 rounded-lg transition-all disabled:opacity-50 shrink-0"
                >
                  {isProcessing === phase.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Complete Phase'}
                </button>
              ) : (
                <div className="w-8 h-8 flex items-center justify-center text-emerald-500 bg-emerald-100 rounded-full" title="Automated notification sent to customer email">
                  <i className="fa-solid fa-paper-plane text-xs"></i>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;