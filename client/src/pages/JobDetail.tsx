
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Job, Customer, JobPhase, Payment } from '../types';
import { APP_NAME, SUPPORT_EMAIL, API_BASE_URL } from '../constants';
import Pagination from '../components/Pagination';
import FileViewerModal from '../components/FileViewerModal';
import { useRealtimeListener } from '../components/RealtimeProvider';
import CustomSelect from '../components/CustomSelect';


import { useAuth, useSettings } from '../context/AppContext';
import { GoogleGenAI } from '@google/genai';

const JobDetail: React.FC = () => {
  const { id } = useParams();
  const { isDark = false } = useOutletContext<{ isDark?: boolean }>() || {};
  const { token, user } = useAuth();
  const { requireEmailPreview } = useSettings();
  const [job, setJob] = useState<any>(null);
  const [phases, setPhases] = useState<JobPhase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [phaseEmailStatus, setPhaseEmailStatus] = useState<Record<number, 'sent' | 'failed' | 'skipped'>>({});
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFile, setActiveFile] = useState<{ url: string, name: string } | null>(null);
  const itemsPerPage = 10;


  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentCategory, setNewPaymentCategory] = useState<'Low-Side' | 'Equipment'>('Low-Side');
  const [newPaymentMethod, setNewPaymentMethod] = useState('Transfer');
  const [newPaymentNotes, setNewPaymentNotes] = useState('');

  // Cost editing state
  const [isEditingCosts, setIsEditingCosts] = useState(false);
  const [editedCosts, setEditedCosts] = useState({
    copperPipingCost: 0,
    outdoorFittingCost: 0,
    commissioningCost: 0,
    equipmentCost: 0
  });
  const [isSavingCosts, setIsSavingCosts] = useState(false);

  // Email preview modal state
  const [emailModal, setEmailModal] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    isRetry: boolean;
    phaseId: number | null;
    to: string;
    customerName: string;
    subject: string;
    greeting: string;
    message: string;
    phaseName: string;
    jobId: number | null;
    technician: string;
    isFinal: boolean;
    isPaymentPhase: boolean;
    paymentAmount: number | string;
    paymentStatus: string;
  }>({
    isOpen: false,
    isLoading: false,
    isRetry: false,
    phaseId: null,
    to: '',
    customerName: '',
    subject: '',
    greeting: '',
    message: '',
    phaseName: '',
    jobId: null,
    technician: '',
    isFinal: false,
    isPaymentPhase: false,
    paymentAmount: '',
    paymentStatus: ''
  });

  // Material tracking state
  const [activeMaterialTab, setActiveMaterialTab] = useState<'copper' | 'drain' | 'remote' | 'ac' | 'others'>('copper');
  const [copperLogs, setCopperLogs] = useState<any[]>([]);
  const [drainLogs, setDrainLogs] = useState<any[]>([]);
  const [remoteLogs, setRemoteLogs] = useState<any[]>([]);
  const [acLogs, setAcLogs] = useState<any[]>([]);
  const [otherLogs, setOtherLogs] = useState<any[]>([]);
  const [availableAcModels, setAvailableAcModels] = useState<any[]>([]);
  const [selectedAcModelId, setSelectedAcModelId] = useState<string>('');
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [isLoggingMaterial, setIsLoggingMaterial] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const [expandedSizes, setExpandedSizes] = useState<Record<string, boolean>>({});
  const toggleSizeExpand = (size: string) => {
    setExpandedSizes(prev => ({ ...prev, [size]: !prev[size] }));
  };

  const [isQuotedBreakdownOpen, setIsQuotedBreakdownOpen] = useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Material form state
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [materialDate, setMaterialDate] = useState(getTodayString());
  const [copperSize, setCopperSize] = useState('1/4');
  const [copperSentQty, setCopperSentQty] = useState('');
  const [copperReturnQty, setCopperReturnQty] = useState('');
  const [drainUsedQty, setDrainUsedQty] = useState('');
  const [remoteUsedQty, setRemoteUsedQty] = useState('');
  const [remoteType, setRemoteType] = useState<'wired' | 'wireless' | 'sensor'>('wired');
  const [otherDescription, setOtherDescription] = useState('');
  const [otherQty, setOtherQty] = useState('');
  const [availableCopperSizes, setAvailableCopperSizes] = useState<{ size: string; groupName: string }[]>([]);
  const [selectedCopperGroup, setSelectedCopperGroup] = useState<string>('');

  const fetchMaterialLogs = useCallback(async () => {
    setLoadingMaterials(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [copperRes, drainRes, remoteRes, othersRes, copperStockRes, acRes, availableAcRes] = await Promise.all([
        fetch(`${API_BASE_URL}/material/copper?jobId=${id}`, { headers }),
        fetch(`${API_BASE_URL}/material/drain?jobId=${id}`, { headers }),
        fetch(`${API_BASE_URL}/material/remote?jobId=${id}`, { headers }),
        fetch(`${API_BASE_URL}/material/others?jobId=${id}`, { headers }),
        fetch(`${API_BASE_URL}/inventory/copper`, { headers }),
        fetch(`${API_BASE_URL}/material/ac-model?jobId=${id}`, { headers }),
        fetch(`${API_BASE_URL}/inventory/available-models`, { headers })
      ]);

      const [copperData, drainData, remoteData, othersData, copperStockData, acData, availableAcData] = await Promise.all([
        copperRes.ok ? copperRes.json() : [],
        drainRes.ok ? drainRes.json() : [],
        remoteRes.ok ? remoteRes.json() : [],
        othersRes.ok ? othersRes.json() : [],
        copperStockRes.ok ? copperStockRes.json() : [],
        acRes.ok ? acRes.json() : [],
        availableAcRes.ok ? availableAcRes.json() : []
      ]);

      setCopperLogs(Array.isArray(copperData) ? copperData : []);
      setDrainLogs(Array.isArray(drainData) ? drainData : []);
      setRemoteLogs(Array.isArray(remoteData) ? remoteData : []);
      setOtherLogs(Array.isArray(othersData) ? othersData : []);
      setAcLogs(Array.isArray(acData) ? acData : []);
      
      const availableModels = Array.isArray(availableAcData) ? availableAcData : [];
      setAvailableAcModels(availableModels);
      setSelectedAcModelId('');

      const sizes = Array.isArray(copperStockData) ? copperStockData.map((item: any) => ({ size: item.size, groupName: item.groupName })) : [];
      setAvailableCopperSizes(sizes);
      if (sizes.length > 0) {
        setSelectedCopperGroup(prev => {
          const exists = sizes.some(item => item.groupName === prev);
          return exists ? prev : sizes[0].groupName;
        });
        setCopperSize(prev => {
          const exists = sizes.some(item => item.size === prev);
          return exists ? prev : sizes[0].size;
        });
      } else {
        setSelectedCopperGroup('');
        setCopperSize('');
      }
    } catch (err) {
      console.error("Failed to fetch material logs", err);
    } finally {
      setLoadingMaterials(false);
    }
  }, [id, token]);
  const handleGroupChange = (group: string) => {
    setSelectedCopperGroup(group);
    const firstSizeInGroup = availableCopperSizes.find(item => item.groupName === group);
    if (firstSizeInGroup) {
      setCopperSize(firstSizeInGroup.size);
    } else {
      setCopperSize('');
    }
  };
  const handleLogMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingMaterial(true);
    try {
      let body: any = { jobId: id, date: materialDate };
      let endpoint = '';

      if (activeMaterialTab === 'copper') {
        if (!copperSize || !copperSentQty) return;
        body = { ...body, size: copperSize, sentQty: Number(copperSentQty), returnQty: Number(copperReturnQty || 0) };
        endpoint = '/material/copper';
      } else if (activeMaterialTab === 'drain') {
        if (!drainUsedQty) return;
        body = { ...body, usedQty: Number(drainUsedQty) };
        endpoint = '/material/drain';
      } else if (activeMaterialTab === 'remote') {
        if (!remoteUsedQty || !remoteType) return;
        body = { ...body, usedQty: Number(remoteUsedQty), type: remoteType };
        endpoint = '/material/remote';
      } else if (activeMaterialTab === 'ac') {
        if (!selectedAcModelId) {
          setNotification({ message: 'Please select an AC model', type: 'error' });
          setIsLoggingMaterial(false);
          return;
        }
        body = { ...body, inventoryId: Number(selectedAcModelId) };
        endpoint = '/material/ac-model';
      } else if (activeMaterialTab === 'others') {
        if (!otherDescription || !otherQty) return;
        body = { ...body, description: otherDescription, qty: Number(otherQty) };
        endpoint = '/material/others';
      }

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setNotification({ message: 'Material logged successfully', type: 'success' });
        // Reset specific form fields
        setCopperSentQty('');
        setCopperReturnQty('');
        setDrainUsedQty('');
        setRemoteUsedQty('');
        setRemoteType('wired');
        setOtherDescription('');
        setOtherQty('');
        setMaterialDate(getTodayString());
        // Refresh material list
        fetchMaterialLogs();
      } else {
        const data = await res.json();
        setNotification({ message: data.error || 'Failed to log material', type: 'error' });
      }
    } catch (err) {
      setNotification({ message: 'Network error logging material', type: 'error' });
    } finally {
      setIsLoggingMaterial(false);
    }
  };

  const handleDeleteMaterialLog = async (type: 'copper' | 'drain' | 'remote' | 'ac-model' | 'others', logId: number) => {
    if (!window.confirm('Are you sure you want to delete this material log?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/material/${type}/${logId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotification({ message: 'Log deleted successfully', type: 'success' });
        fetchMaterialLogs();
      } else {
        const data = await res.json();
        setNotification({ message: data.error || 'Failed to delete log', type: 'error' });
      }
    } catch (err) {
      setNotification({ message: 'Network error deleting log', type: 'error' });
    }
  };

  const handleDeleteCopperGroup = async (ids: number[]) => {
    if (!window.confirm('Are you sure you want to delete this copper tracking entry? This will delete all logged entries for this size.')) return;
    try {
      for (const logId of ids) {
        await fetch(`${API_BASE_URL}/material/copper/${logId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      setNotification({ message: 'Log deleted successfully', type: 'success' });
      fetchMaterialLogs();
    } catch (err) {
      setNotification({ message: 'Network error deleting log', type: 'error' });
    }
  };

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
        const phaseList = Array.isArray(data.phases) ? data.phases : [];
        setPhases(phaseList);
        
        // Initialize email status map from database
        const emailStatusMap: Record<number, 'sent' | 'failed' | 'skipped'> = {};
        phaseList.forEach((p: any) => {
          if (p.emailStatus) {
            emailStatusMap[p.id] = p.emailStatus;
          }
        });
        setPhaseEmailStatus(emailStatusMap);

        setPayments(Array.isArray(paymentsData) ? paymentsData : []);
        fetchMaterialLogs();
      } else {
        setError(data.error || "Failed to load job details");
      }
    } catch (err) {
      console.error("Failed to fetch job", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id, token, fetchMaterialLogs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeListener('jobs', fetchData);

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
          category: newPaymentCategory,
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

  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setNotification({ message: 'Payment deleted successfully', type: 'success' });
        fetchData(); // Refresh the job and payments data
      } else {
        const data = await res.json();
        setNotification({ message: data.error || 'Failed to delete payment', type: 'error' });
      }
    } catch (err) {
      setNotification({ message: "Network error deleting payment", type: 'error' });
    }
  };

  const handleStartEditingCosts = () => {
    setEditedCosts({
      copperPipingCost: job.copperPipingCost || 0,
      outdoorFittingCost: job.outdoorFittingCost || 0,
      commissioningCost: job.commissioningCost || 0,
      equipmentCost: job.equipmentCost || 0
    });
    setIsEditingCosts(true);
    setIsQuotedBreakdownOpen(true);
  };

  const handleSaveCosts = async () => {
    setIsSavingCosts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${id}/costs`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editedCosts),
      });
      if (res.ok) {
        const data = await res.json();
        setJob({ 
          ...job, 
          copperPipingCost: data.copperPipingCost, 
          outdoorFittingCost: data.outdoorFittingCost, 
          commissioningCost: data.commissioningCost,
          equipmentCost: data.equipmentCost,
          totalCost: data.totalCost 
        });
        setNotification({ message: 'Financial details updated successfully', type: 'success' });
        setIsEditingCosts(false);
      } else {
        const data = await res.json();
        setNotification({ message: data.error || 'Failed to update financial details', type: 'error' });
      }
    } catch (err) {
      setNotification({ message: "Network error updating costs", type: 'error' });
    } finally {
      setIsSavingCosts(false);
    }
  };

  // Opens the email preview modal, or directly completes if preview is disabled
  const handleMarkComplete = async (phaseId: number, directSkipEmail = false) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase || !job) return;

    const forceSkipEmail = directSkipEmail || user?.role === 'technician';

    if (!requireEmailPreview || user?.role === 'technician') {
      setIsProcessing(phaseId);
      setNotification(null);
      try {
        const response = await fetch(`${API_BASE_URL}/phases/${phaseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ isCompleted: true, skipEmail: forceSkipEmail }),
        });
        const data = await response.json();
        if (response.ok) {
          setPhases(prev => prev.map(p =>
            p.id === phaseId ? { ...p, isCompleted: true, completedAt: new Date().toISOString() } : p
          ));
          setJob((prev: any) => ({
            ...prev,
            status: data.jobStatus || prev.status,
            currentPhase: data.currentPhase
          }));
          if (forceSkipEmail) {
            setPhaseEmailStatus(prev => ({ ...prev, [phaseId]: 'skipped' }));
          } else {
            setPhaseEmailStatus(prev => ({ ...prev, [phaseId]: data.emailSent ? 'sent' : 'failed' }));
            if (!data.emailSent) {
              setNotification({ message: 'Phase completed, but the email failed to send. Please retry or skip.', type: 'error' });
            } else {
              setNotification({ message: 'Phase completed and email sent successfully.', type: 'success' });
            }
          }
          setSelectedPhaseId(null);
        } else {
          setNotification({ message: data.error || 'Failed to update phase', type: 'error' });
        }
      } catch (err) {
        setNotification({ message: 'Network connection error', type: 'error' });
      } finally {
        setIsProcessing(null);
      }
      return;
    }

    setEmailModal(prev => ({ ...prev, isOpen: true, isLoading: true, phaseId, isRetry: false }));
    setNotification(null);

    try {
      const res = await fetch(`${API_BASE_URL}/phases/${phaseId}/email-preview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const preview = await res.json();
      if (res.ok) {
        setEmailModal(prev => ({
          ...prev,
          isLoading: false,
          to: preview.to,
          customerName: preview.customerName,
          subject: preview.subject,
          greeting: `Hello ${preview.customerName},`,
          message: preview.message,
          phaseName: preview.phaseName,
          jobId: preview.jobId,
          technician: preview.technician,
          isFinal: preview.isFinal,
          isPaymentPhase: preview.isPaymentPhase,
          paymentAmount: preview.paymentAmount,
          paymentStatus: preview.paymentStatus
        }));
      } else {
        setEmailModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        setNotification({ message: preview.error || 'Failed to load email preview', type: 'error' });
      }
    } catch (err) {
      setEmailModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      setNotification({ message: 'Network error loading preview', type: 'error' });
    }
  };

  // Completes the phase and sends the (possibly edited) email
  const handleConfirmComplete = async (skipEmail = false) => {
    if (!emailModal.phaseId || !job) return;

    setIsProcessing(emailModal.phaseId);
    setEmailModal(prev => ({ ...prev, isOpen: false }));

    try {
      const bodyPayload: any = { isCompleted: true };
      if (skipEmail) {
        bodyPayload.skipEmail = true;
      } else {
        bodyPayload.customSubject = emailModal.subject;
        bodyPayload.customGreeting = emailModal.greeting;
        bodyPayload.customMessage = emailModal.message;
        if (Number(emailModal.paymentAmount) > 0) {
          bodyPayload.customPaymentAmount = Number(emailModal.paymentAmount);
        }
      }

      const response = await fetch(`${API_BASE_URL}/phases/${emailModal.phaseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (response.ok) {
        setPhases(prev => prev.map(p =>
          p.id === emailModal.phaseId ? { ...p, isCompleted: true, completedAt: new Date().toISOString() } : p
        ));
        setJob((prev: any) => ({
          ...prev,
          status: data.jobStatus || prev.status,
          currentPhase: data.currentPhase
        }));

        if (skipEmail) {
          setPhaseEmailStatus(prev => ({ ...prev, [emailModal.phaseId!]: 'skipped' }));
        } else {
          setPhaseEmailStatus(prev => ({ ...prev, [emailModal.phaseId!]: data.emailSent ? 'sent' : 'failed' }));
          if (!data.emailSent) {
            const errorDetail = data.emailError ? ` (Reason: ${data.emailError})` : '';
            setNotification({ message: `Phase completed, but the email failed to send${errorDetail}. Please retry or skip.`, type: 'error' });
          } else {
            setNotification({ message: 'Phase completed and email sent successfully.', type: 'success' });
          }
        }
      } else {
        setNotification({ message: data.error || 'Failed to update phase', type: 'error' });
      }
    } catch (err) {
      setNotification({ message: 'Network connection error', type: 'error' });
    } finally {
      setIsProcessing(null);
    }
  };

  // Retry sending email for a completed phase
  const handleRetryEmail = async (phaseId: number) => {
    if (!requireEmailPreview) {
      setNotification(null);
      setPhaseEmailStatus(prev => ({ ...prev, [phaseId]: 'failed' })); // keeps it showing failed while we process, though ideally we'd have a 'retrying' state. We will just use the same logic as the modal for simplicity, but skip UI.

      try {
        const response = await fetch(`${API_BASE_URL}/phases/${phaseId}/resend-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({}), // uses default template on backend
        });

        const data = await response.json();
        setPhaseEmailStatus(prev => ({ ...prev, [phaseId]: data.emailSent ? 'sent' : 'failed' }));
        if (!data.emailSent) {
          const errorDetail = data.emailError ? ` (Reason: ${data.emailError})` : '';
          setNotification({ message: `Email failed to send again${errorDetail}. Please check your settings or skip.`, type: 'error' });
        } else {
          setNotification({ message: 'Email sent successfully!', type: 'success' });
        }
      } catch (err) {
        setPhaseEmailStatus(prev => ({ ...prev, [phaseId]: 'failed' }));
        setNotification({ message: 'Network error while retrying email.', type: 'error' });
      }
      return;
    }

    setEmailModal(prev => ({ ...prev, isOpen: true, isLoading: true, phaseId, isRetry: true }));
    setNotification(null);

    try {
      const res = await fetch(`${API_BASE_URL}/phases/${phaseId}/email-preview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const preview = await res.json();
      if (res.ok) {
        setEmailModal(prev => ({
          ...prev,
          isLoading: false,
          to: preview.to,
          customerName: preview.customerName,
          subject: preview.subject,
          greeting: `Hello ${preview.customerName},`,
          message: preview.message,
          phaseName: preview.phaseName,
          jobId: preview.jobId,
          technician: preview.technician,
          isFinal: preview.isFinal,
          isPaymentPhase: preview.isPaymentPhase,
          paymentAmount: preview.paymentAmount,
          paymentStatus: preview.paymentStatus
        }));
      } else {
        setEmailModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        setNotification({ message: preview.error || 'Failed to load email preview', type: 'error' });
      }
    } catch (err) {
      setEmailModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      setNotification({ message: 'Network error loading preview', type: 'error' });
    }
  };

  // Resend email (for already completed phases)
  const handleResendEmail = async () => {
    if (!emailModal.phaseId || !job) return;

    setEmailModal(prev => ({ ...prev, isOpen: false }));
    setPhaseEmailStatus(prev => ({ ...prev, [emailModal.phaseId!]: undefined as any }));

    try {
      const bodyPayload: any = {
        customSubject: emailModal.subject,
        customGreeting: emailModal.greeting,
        customMessage: emailModal.message,
      };
      if (Number(emailModal.paymentAmount) > 0) {
        bodyPayload.customPaymentAmount = Number(emailModal.paymentAmount);
      }

      const response = await fetch(`${API_BASE_URL}/phases/${emailModal.phaseId}/resend-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();
      setPhaseEmailStatus(prev => ({ ...prev, [emailModal.phaseId!]: data.emailSent ? 'sent' : 'failed' }));
      if (!data.emailSent) {
        const errorDetail = data.emailError ? ` (Reason: ${data.emailError})` : '';
        setNotification({ message: `Email failed to send again${errorDetail}. Please check your settings or skip.`, type: 'error' });
      } else {
        setNotification({ message: 'Email sent successfully!', type: 'success' });
      }
    } catch (err) {
      setPhaseEmailStatus(prev => ({ ...prev, [emailModal.phaseId!]: 'failed' }));
      setNotification({ message: 'Network error while retrying email.', type: 'error' });
    }
  };

  // Skip email formally (hides retry buttons)
  const handleSkipEmail = async (phaseId: number) => {
    // In our simplified system, we simply mark it skipped on frontend 
    // without hitting the backend, so the retry UI disappears.
    setPhaseEmailStatus(prev => ({ ...prev, [phaseId]: 'skipped' }));
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
  const totalPages = Math.ceil(phases.length / itemsPerPage);
  const paginatedPhases = phases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const groupedCopperLogs = copperLogs.reduce((acc: any[], log: any) => {
    const existing = acc.find(item => item.size === log.size);
    if (existing) {
      existing.sentQty += Number(log.sentQty || 0);
      existing.returnQty += Number(log.returnQty || 0);
      existing.usedQty += Number(log.usedQty || 0);
      existing.ids.push(log.id);
      existing.entries.push(log);
      if (new Date(log.date) > new Date(existing.date)) {
        existing.date = log.date;
      }
    } else {
      acc.push({
        id: log.id,
        ids: [log.id],
        size: log.size,
        sentQty: Number(log.sentQty || 0),
        returnQty: Number(log.returnQty || 0),
        usedQty: Number(log.usedQty || 0),
        date: log.date,
        entries: [log]
      });
    }
    return acc;
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full">
        {/* Left Column: Title area and Site Address Card */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-4">
          {/* Title block */}
          <div className="flex items-center gap-4">
            <Link to="/jobs" className="w-10 h-10 border border-slate-200 dark:border-border-dark bg-white dark:bg-background-dark hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-350 rounded-xl transition-all flex items-center justify-center shrink-0 shadow-sm">
              <i className="ph ph-arrow-left text-lg"></i>
            </Link>
            <div>
              <span className="text-[10px] font-extrabold bg-blue-50 dark:bg-background-dark/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded uppercase tracking-wide">
                Job Details
              </span>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">Job {job.id}</h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Started: {new Date(job.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
          
          {/* Card 1: Site Details (Site Address, Technician, Customer Contact) */}
          <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl p-[18px] px-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-center shadow-sm flex-grow">
            {/* Address */}
            <div className="flex gap-3 items-center min-w-0">
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center text-lg shrink-0">
                <i className="ph ph-map-pin"></i>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Site Address</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={job.customerAddress}>{job.customerAddress}</span>
              </div>
            </div>

            {/* Technician */}
            <div className="flex gap-3 items-center min-w-0 md:border-l border-slate-200 dark:border-border-dark md:pl-6">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shrink-0">
                <i className="ph ph-user-gear"></i>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Technician</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" title={job.technician}>{job.technician}</span>
              </div>
            </div>

            {/* Customer Contact */}
            <div className="flex gap-3 items-center min-w-0 md:border-l border-slate-200 dark:border-border-dark md:pl-6">
              <div className="w-10 h-10 rounded-full bg-stone-500/10 text-stone-500 dark:text-stone-400 flex items-center justify-center text-lg shrink-0">
                <i className="ph ph-phone"></i>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Contact No.</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{job.customerPhone || 'Not Provided'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer Card + Workflow Progress Card */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
          {/* Card 2: Customer & Uploaded Files */}
          <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl p-[18px] px-6 flex flex-col gap-2.5 shadow-sm">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0">
                {job.customerName ? job.customerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'C'}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Customer</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{job.customerName}</span>
              </div>
            </div>
            <div className="border-t border-slate-200 dark:border-border-dark pt-3">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Uploaded Files</span>
                <i className="ph ph-paperclip text-slate-400 text-xs"></i>
              </div>
              <div className="flex flex-wrap gap-2">
                {job.drawingUrl ? (
                  <button
                    type="button"
                    onClick={() => setActiveFile({ url: `${API_BASE_URL}${job.drawingUrl}`, name: `${job.customerName}_Drawing.${job.drawingUrl.split('.').pop()}` })}
                    className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-500/20 transition-all cursor-pointer"
                  >
                    <i className="ph ph-file-pdf"></i> Drawing
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No Drawing</span>
                )}
                {job.quotationUrl ? (
                  <button
                    type="button"
                    onClick={() => setActiveFile({ url: `${API_BASE_URL}${job.quotationUrl}`, name: `${job.customerName}_Quotation.${job.quotationUrl.split('.').pop()}` })}
                    className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-500/20 transition-all cursor-pointer"
                  >
                    <i className="ph ph-file-text"></i> Quote
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No Quote</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Workflow Progress */}
          <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl p-[18px] px-6 flex flex-col gap-2.5 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><i className="ph ph-chart-line"></i> Workflow Progress</span>
              <span className="text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 px-2 py-0.5 rounded-full">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-background-dark h-1.5 rounded-full overflow-hidden my-1">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</span>
              {job.status === 'Completed' ? (
                <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase">Completed</span>
              ) : (
                <span className="px-2.5 py-0.5 bg-blue-50/80 text-blue-600 dark:bg-background-dark/40 dark:text-blue-400 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                  • {job.currentPhase || 'Ongoing'}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Job Type</span>
              <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase">{job.jobType}</span>
            </div>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${notification.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/50' : 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 border border-red-100 dark:border-red-950/50'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <p className="text-sm font-medium">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="ml-auto opacity-50 hover:opacity-100 transition-opacity"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      {/* Two-column layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Material Tracking */}
        <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl p-6 shadow-sm lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-border-dark">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <i className="ph ph-package text-lg"></i>
                </div>
                Material Tracking
              </h3>
              <button 
                type="button" 
                onClick={() => setIsSummaryOpen(true)}
                className="px-3 py-1.5 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-border-dark text-[11px] font-bold text-slate-705 dark:text-slate-200 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-[#2b2e33] transition-all flex items-center gap-1.5"
              >
                <i className="ph ph-file-text"></i> View Summary
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex gap-1 bg-slate-100 dark:bg-background-dark/80 p-1 rounded-xl mb-4 text-xs font-bold">
              {(['copper', 'drain', 'remote', 'ac', 'others'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveMaterialTab(tab)}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all capitalize ${
                    activeMaterialTab === tab
                      ? 'bg-white dark:bg-card-dark text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {tab === 'copper' ? 'Copper' : tab === 'drain' ? 'Drain Pipe' : tab === 'remote' ? 'Remote' : tab === 'ac' ? 'AC Model' : 'Others'}
                </button>
              ))}
            </div>

            {/* Input Form controls */}
            <form onSubmit={handleLogMaterial} className="space-y-4 mb-6">
              {activeMaterialTab === 'copper' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Pipe Group</label>
                    <CustomSelect
                      value={selectedCopperGroup}
                      onChange={val => handleGroupChange(val)}
                      options={Array.from(new Set(availableCopperSizes.map(item => item.groupName))).map(group => {
                        const cleanGroup = group.replace(/\b(sizes?)\b/gi, '').trim() || group;
                        return { value: group, label: cleanGroup };
                      })}
                      isDark={isDark}
                      placeholder="No groups available"
                      disabled={availableCopperSizes.length === 0}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Pipe Size</label>
                    <CustomSelect
                      value={copperSize}
                      onChange={val => setCopperSize(val)}
                      options={availableCopperSizes
                        .filter(item => item.groupName === selectedCopperGroup)
                        .map(item => ({ value: item.size, label: `${item.size}"` }))}
                      isDark={isDark}
                      placeholder="No sizes available"
                      disabled={!selectedCopperGroup}
                      searchable={true}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Sent Quantity (FT)</label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.1"
                      placeholder="0.0"
                      value={copperSentQty}
                      onChange={(e) => setCopperSentQty(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Return Quantity (FT)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0.0"
                      value={copperReturnQty}
                      onChange={(e) => setCopperReturnQty(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
              )}

              {activeMaterialTab === 'drain' && (
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Used Quantity (FT)</label>
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    placeholder="0.0"
                    value={drainUsedQty}
                    onChange={(e) => setDrainUsedQty(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              )}

              {activeMaterialTab === 'remote' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Type</label>
                    <CustomSelect
                      value={remoteType}
                      onChange={val => setRemoteType(val)}
                      options={[
                        { value: 'wired', label: 'Wired' },
                        { value: 'wireless', label: 'Wireless' },
                        { value: 'sensor', label: 'Sensor' }
                      ]}
                      isDark={isDark}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Used Quantity (PCS)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      placeholder="0"
                      value={remoteUsedQty}
                      onChange={(e) => setRemoteUsedQty(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
              )}

              {activeMaterialTab === 'ac' && (
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Select Model</label>
                  <CustomSelect
                    value={selectedAcModelId}
                    onChange={val => setSelectedAcModelId(val)}
                    options={availableAcModels.map(model => ({
                      value: String(model.id),
                      label: `${model.brand} ${model.modelName} (${model.tonnage || ''} Ton, ${model.starRating || ''} Star) - Available Qty: ${model.availableQty}`
                    }))}
                    isDark={isDark}
                    placeholder={availableAcModels.length === 0 ? "No available models in stock" : "Select AC Model"}
                    disabled={availableAcModels.length === 0}
                  />
                </div>
              )}

              {activeMaterialTab === 'others' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Description</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wrap tape, PVC clamps"
                      value={otherDescription}
                      onChange={(e) => setOtherDescription(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.1"
                      placeholder="0.0"
                      value={otherQty}
                      onChange={(e) => setOtherQty(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingMaterial}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-sm"
              >
                {isLoggingMaterial ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="ph ph-plus font-bold"></i> Log Material</>}
              </button>
            </form>
          </div>

          {/* Logged History / Records */}
          <div className="border-t border-slate-100 dark:border-border-dark pt-4 mt-2 flex-grow">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><i className="ph ph-clock-counter-clockwise"></i> Logged History</h4>
            {loadingMaterials ? (
              <div className="flex items-center justify-center py-8">
                <i className="fa-solid fa-spinner fa-spin text-xl text-blue-500"></i>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {activeMaterialTab === 'copper' && (
                  groupedCopperLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">No copper piping logged yet.</p>
                  ) : (
                    groupedCopperLogs.map(log => {
                      const isExpanded = !!expandedSizes[log.size];
                      return (
                        <div key={log.size} className="bg-slate-50 dark:bg-background-dark/40 border border-slate-200/50 dark:border-border-dark/60 rounded-xl overflow-hidden flex flex-col">
                          <div 
                            onClick={() => toggleSizeExpand(log.size)}
                            className="p-3 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-colors flex flex-col gap-1 cursor-pointer select-none"
                          >
                            <div className="flex justify-between items-center text-sm font-semibold text-slate-800 dark:text-slate-200">
                              <span className="flex items-center gap-1.5">
                                <i className={`fa-solid fa-chevron-right text-[10px] text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}></i>
                                Size: {log.size}"
                              </span>
                              <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/15 border border-blue-500/10 px-2 py-0.5 rounded-md font-bold">Total Used: {Number(log.usedQty).toFixed(2)} ft</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium pl-4">
                              <span>Sent: {Number(log.sentQty).toFixed(2)} ft | Return: {Number(log.returnQty).toFixed(2)} ft</span>
                              <span>Latest: {log.date}</span>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-slate-200/50 dark:border-border-dark bg-white/50 dark:bg-background-dark/30 p-2.5 space-y-2 divide-y divide-slate-100 dark:divide-border-dark">
                              {log.entries.map((entry: any, idx: number) => {
                                const entryUsed = Number(entry.sentQty || 0) - Number(entry.returnQty || 0);
                                return (
                                  <div key={entry.id} className={`flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 group relative ${idx > 0 ? 'pt-2' : ''}`}>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">Used: {entryUsed.toFixed(2)} ft</span>
                                        <span className="text-[9px] text-slate-400 dark:text-slate-500">({entry.date})</span>
                                      </div>
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500">Sent: {Number(entry.sentQty).toFixed(2)} ft | Returned: {Number(entry.returnQty).toFixed(2)} ft</span>
                                    </div>
                                    {(user?.role === 'superadmin' || user?.role === 'admin') && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteMaterialLog('copper', entry.id);
                                        }}
                                        className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                                        title="Delete Entry"
                                      >
                                        <i className="fa-solid fa-trash-can text-[10px]"></i>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )
                )}

                {activeMaterialTab === 'drain' && (
                  drainLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">No drain pipe logged yet.</p>
                  ) : (
                    drainLogs.map(log => (
                      <div key={log.id} className="bg-slate-50 dark:bg-background-dark/40 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-colors p-3 rounded-xl border border-slate-200/50 dark:border-border-dark flex justify-between items-center group relative">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Used: {log.usedQty} ft</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500"><i className="ph ph-calendar-blank mr-1"></i>{log.date}</span>
                        </div>
                        {(user?.role === 'superadmin' || user?.role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterialLog('drain', log.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                            title="Delete Log"
                          >
                            <i className="fa-solid fa-trash-can text-[10px]"></i>
                          </button>
                        )}
                      </div>
                    ))
                  )
                )}

                {activeMaterialTab === 'remote' && (
                  remoteLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">No remote logs found.</p>
                  ) : (
                    remoteLogs.map(log => (
                      <div key={log.id} className="bg-slate-50 dark:bg-background-dark/40 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-colors p-3 rounded-xl border border-slate-200/50 dark:border-border-dark flex justify-between items-center group relative">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Used: {log.usedQty} pcs</span>
                            <span className="text-[9px] font-black px-2 py-0.5 bg-blue-500/5 dark:bg-blue-500/15 border border-blue-500/10 text-blue-600 dark:text-blue-400 uppercase tracking-wider rounded-md capitalize">{log.type || 'wired'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500"><i className="ph ph-calendar-blank mr-1"></i>{log.date}</span>
                        </div>
                        {(user?.role === 'superadmin' || user?.role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterialLog('remote', log.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                            title="Delete Log"
                          >
                            <i className="fa-solid fa-trash-can text-[10px]"></i>
                          </button>
                        )}
                      </div>
                    ))
                  )
                )}

                {activeMaterialTab === 'ac' && (
                  acLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">No AC models logged.</p>
                  ) : (
                    acLogs.map(log => (
                      <div key={log.id} className="bg-slate-50 dark:bg-background-dark/40 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-colors p-3 rounded-xl border border-slate-200/50 dark:border-border-dark flex justify-between items-center group relative">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-slate-850 dark:text-slate-200">{log.description}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500"><i className="ph ph-calendar-blank mr-1"></i>{log.date}</span>
                        </div>
                        {(user?.role === 'superadmin' || user?.role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterialLog('ac-model', log.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                            title="Delete Log"
                          >
                            <i className="fa-solid fa-trash-can text-[10px]"></i>
                          </button>
                        )}
                      </div>
                    ))
                  )
                )}

                {activeMaterialTab === 'others' && (
                  otherLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">No custom materials logged.</p>
                  ) : (
                    otherLogs.map(log => (
                      <div key={log.id} className="bg-slate-50 dark:bg-background-dark/40 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-colors p-3 rounded-xl border border-slate-200/50 dark:border-border-dark flex flex-col gap-1 group relative">
                        {(user?.role === 'superadmin' || user?.role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterialLog('others', log.id)}
                            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0"
                            title="Delete Log"
                          >
                            <i className="fa-solid fa-trash-can text-[10px]"></i>
                          </button>
                        )}
                        <div className="flex justify-between items-start text-sm font-semibold text-slate-800 dark:text-slate-200 pr-6">
                          <span className="line-clamp-2">{log.description}</span>
                          <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/15 border border-blue-500/10 px-2 py-0.5 rounded-md shrink-0">Qty: {log.qty}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          <span><i className="ph ph-calendar-blank mr-1"></i>{log.date}</span>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Finances & Payments */}
        <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl p-6 shadow-sm lg:col-span-5 flex flex-col justify-start gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-border-dark">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><i className="ph ph-wallet text-emerald-600"></i> Finances & Payments</h3>
            {user?.role === 'superadmin' && !isEditingCosts && (
              <button 
                onClick={handleStartEditingCosts}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#242427] dark:hover:bg-[#2b2e33] text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                title="Edit Quotation Costs"
              >
                <i className="ph ph-pencil-simple"></i> Edit Quotation
              </button>
            )}
          </div>

          {/* Accordion breakdown */}
          <div className="border border-slate-200 dark:border-border-dark rounded-xl overflow-hidden">
            <div 
              onClick={() => setIsQuotedBreakdownOpen(!isQuotedBreakdownOpen)}
              className="flex justify-between items-center p-3 bg-slate-50 dark:bg-background-dark/40 cursor-pointer font-bold text-xs text-slate-700 dark:text-slate-200"
            >
              <span className="flex items-center gap-1.5"><i className="ph ph-receipt text-blue-600"></i> Quoted Cost Breakdown</span>
              <i className={`fa-solid fa-chevron-right text-[10px] transition-transform ${isQuotedBreakdownOpen ? 'rotate-90' : ''}`}></i>
            </div>
            {isQuotedBreakdownOpen && (
              <div className="p-3 border-t border-slate-200 dark:border-border-dark space-y-3 bg-white dark:bg-transparent text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Copper Piping</span>
                  {isEditingCosts ? (
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₹</span>
                      <input 
                        type="number" 
                        value={editedCosts.copperPipingCost} 
                        onChange={e => setEditedCosts({...editedCosts, copperPipingCost: Number(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-lg pl-5 pr-2 py-1 text-xs font-bold text-slate-805 dark:text-slate-200 outline-none"
                      />
                    </div>
                  ) : (
                    <span className="font-semibold text-slate-800 dark:text-slate-200">₹{Number(job.copperPipingCost || 0).toLocaleString()}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Outdoor Fitting</span>
                  {isEditingCosts ? (
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₹</span>
                      <input 
                        type="number" 
                        value={editedCosts.outdoorFittingCost} 
                        onChange={e => setEditedCosts({...editedCosts, outdoorFittingCost: Number(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-lg pl-5 pr-2 py-1 text-xs font-bold text-slate-805 dark:text-slate-200 outline-none"
                      />
                    </div>
                  ) : (
                    <span className="font-semibold text-slate-800 dark:text-slate-200">₹{Number(job.outdoorFittingCost || 0).toLocaleString()}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Commissioning</span>
                  {isEditingCosts ? (
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₹</span>
                      <input 
                        type="number" 
                        value={editedCosts.commissioningCost} 
                        onChange={e => setEditedCosts({...editedCosts, commissioningCost: Number(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-lg pl-5 pr-2 py-1 text-xs font-bold text-slate-805 dark:text-slate-200 outline-none"
                      />
                    </div>
                  ) : (
                    <span className="font-semibold text-slate-800 dark:text-slate-200">₹{Number(job.commissioningCost || 0).toLocaleString()}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Equipment</span>
                  {isEditingCosts ? (
                    <div className="relative w-28">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">₹</span>
                      <input 
                        type="number" 
                        value={editedCosts.equipmentCost} 
                        onChange={e => setEditedCosts({...editedCosts, equipmentCost: Number(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-lg pl-5 pr-2 py-1 text-xs font-bold text-slate-805 dark:text-slate-200 outline-none"
                      />
                    </div>
                  ) : (
                    <span className="font-semibold text-slate-800 dark:text-slate-200">₹{Number(job.equipmentCost || 0).toLocaleString()}</span>
                  )}
                </div>
                {isEditingCosts && (
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={handleSaveCosts} 
                      disabled={isSavingCosts}
                      className="flex-1 bg-emerald-600 text-white rounded-lg py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {isSavingCosts ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Save'}
                    </button>
                    <button 
                      onClick={() => setIsEditingCosts(false)} 
                      disabled={isSavingCosts}
                      className="flex-1 bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-slate-300 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-[#2b2e33] transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Cost details indicator boxes */}
          {(() => {
            const totalPaid = payments.filter(p => !p.category || p.category === 'Low-Side').reduce((sum, p) => sum + Number(p.amount), 0);
            const balance = Math.max(0, Number(job.totalCost || 0) - totalPaid);
            const equipReceived = payments.filter(p => p.category === 'Equipment').reduce((sum, p) => sum + Number(p.amount), 0);
            const equipBalance = Math.max(0, Number(job.equipmentCost || 0) - equipReceived);
            const isUnpaid = balance === Number(job.totalCost || 0);
            const isEquipUnpaid = equipBalance === Number(job.equipmentCost || 0);

            return (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-border-dark pb-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center">
                    Total Cost
                    {isUnpaid && (
                      <span className="text-[10px] font-bold bg-red-105 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/50 uppercase ml-2 tracking-normal">Unpaid</span>
                    )}
                  </span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">₹{Number(job.totalCost || 0).toLocaleString()}</span>
                </div>
                {!isUnpaid && (
                  <>
                    <div className="flex justify-between items-center bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Paid</span>
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">₹{totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Balance</span>
                      <span className="text-lg font-extrabold text-red-600 dark:text-red-400">₹{balance.toLocaleString()}</span>
                    </div>
                  </>
                )}
                {(job.equipmentCost > 0 || payments.some(p => p.category === 'Equipment')) && (
                  <>
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-border-dark pb-2 mt-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center">
                        Total Equipment
                        {isEquipUnpaid && (
                          <span className="text-[10px] font-bold bg-red-105 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/50 uppercase ml-2 tracking-normal">Unpaid</span>
                        )}
                      </span>
                      <span className="text-base font-bold text-slate-850 dark:text-slate-100">₹{Number(job.equipmentCost || 0).toLocaleString()}</span>
                    </div>
                    {!isEquipUnpaid && (
                      <>
                        <div className="flex justify-between items-center bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Equip Received</span>
                          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">₹{equipReceived.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 p-2.5 rounded-xl">
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Equip Balance</span>
                          <span className="text-base font-bold text-orange-600 dark:text-orange-400">₹{equipBalance.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* Add Payment Action / Inline form */}
          {user?.role === 'superadmin' && (
            <div className="flex flex-col gap-3">
              {!showPaymentForm ? (
                <button 
                  onClick={() => setShowPaymentForm(true)}
                  className="w-full py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500/50 dark:hover:border-blue-500/50 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <i className="ph ph-plus"></i> Add Payment
                </button>
              ) : (
                <form onSubmit={handleRecordPayment} className="border border-slate-200 dark:border-border-dark rounded-xl p-4 bg-slate-50/50 dark:bg-background-dark/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-850 dark:text-white">Record Payment</span>
                    <button type="button" onClick={() => setShowPaymentForm(false)} className="text-slate-400 hover:text-slate-605"><i className="ph ph-x text-sm"></i></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1">Amount</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                        <input type="number" required min="0.01" step="0.01" value={newPaymentAmount} onChange={e => setNewPaymentAmount(e.target.value)} className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-lg pl-6 pr-2 py-1 text-xs font-semibold text-slate-805 dark:text-white" placeholder="0.00" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1">Category</label>
                      <CustomSelect
                        value={newPaymentCategory}
                        onChange={val => setNewPaymentCategory(val)}
                        options={[
                          { value: 'Low-Side', label: 'Low-Side' },
                          { value: 'Equipment', label: 'Equipment' }
                        ]}
                        isDark={isDark}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1">Method</label>
                      <CustomSelect
                        value={newPaymentMethod}
                        onChange={val => setNewPaymentMethod(val)}
                        options={[
                          { value: 'Transfer', label: 'Transfer' },
                          { value: 'Cash', label: 'Cash' },
                          { value: 'Card', label: 'Card' },
                          { value: 'Other', label: 'Other' }
                        ]}
                        isDark={isDark}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1">Notes (Optional)</label>
                    <input type="text" value={newPaymentNotes} onChange={e => setNewPaymentNotes(e.target.value)} className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-lg px-2 py-1 text-xs font-semibold text-slate-805 dark:text-white" placeholder="e.g. Check #123" />
                  </div>
                  <button type="submit" disabled={isRecordingPayment} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                    {isRecordingPayment ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="ph ph-plus-circle font-bold"></i> Record</>}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Payment History Accordion */}
          {payments.length > 0 && (
            <div className="border border-slate-200 dark:border-border-dark rounded-xl overflow-hidden">
              <div 
                onClick={() => setIsPaymentHistoryOpen(!isPaymentHistoryOpen)}
                className="flex justify-between items-center p-3 bg-slate-50 dark:bg-background-dark/40 cursor-pointer font-bold text-xs text-slate-500 dark:text-slate-400"
              >
                <span className="flex items-center gap-1.5"><i className="ph ph-clock-counter-clockwise"></i> History</span>
                <i className={`fa-solid fa-chevron-right text-[10px] transition-transform ${isPaymentHistoryOpen ? 'rotate-90' : ''}`}></i>
              </div>
              {isPaymentHistoryOpen && (
                <div className="p-3 border-t border-slate-200 dark:border-border-dark space-y-2.5 max-h-36 overflow-y-auto bg-white dark:bg-transparent">
                  {payments.map(p => (
                    <div key={p.id} className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-105 dark:border-slate-800 flex justify-between items-center text-xs group relative">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800 dark:text-slate-100">₹{Number(p.amount).toLocaleString()}</span>
                        <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                          <span>{p.category || 'Low-Side'} | {p.paymentMethod || 'Transfer'}</span>
                          <span>•</span>
                          <span>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Invalid Date'}</span>
                        </div>
                        {p.notes && <span className="text-[9px] text-slate-500 italic mt-0.5">"{p.notes}"</span>}
                      </div>
                      {user?.role === 'superadmin' && (
                        <button 
                          onClick={() => handleDeletePayment(p.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-355 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete Payment"
                        >
                          <i className="fa-solid fa-trash-can text-xs"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Workflow Progression Checklist */}
      <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-border-dark">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><i className="ph ph-circle-wavy-check text-blue-600"></i> Workflow Progression</h3>
          <button onClick={fetchData} className="text-slate-400 hover:text-blue-600 transition-colors">
            <i className="ph ph-arrow-counter-clockwise text-base"></i>
          </button>
        </div>

        <div className="border border-slate-200 dark:border-border-dark rounded-xl overflow-hidden bg-slate-50/20 dark:bg-transparent flex flex-col divide-y divide-slate-100 dark:divide-border-dark">
          {paginatedPhases.map((phase, idx) => (
            <div key={phase.id} className={`p-4 flex items-center justify-between gap-4 transition-all ${phase.isCompleted ? 'bg-emerald-50/5 dark:bg-emerald-950/5' : 'hover:bg-slate-50 dark:hover:bg-background-dark/40 group'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all shrink-0 border ${phase.isCompleted
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-[#18181b] border-slate-200 dark:border-border-dark text-slate-400 dark:text-slate-500'
                  }`}>
                  {phase.isCompleted ? <i className="ph ph-check font-bold"></i> : (currentPage - 1) * itemsPerPage + idx + 1}
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-semibold ${phase.isCompleted ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'}`}>{phase.phaseName}</span>
                  {phase.completedAt && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <i className="ph ph-circle-wavy-check"></i> Finished {new Date(phase.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div>
                {!phase.isCompleted ? (
                  requireEmailPreview ? (
                    <button
                      onClick={() => handleMarkComplete(phase.id)}
                      disabled={isProcessing === phase.id}
                      className="px-3 py-1.5 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-border-dark text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-all disabled:opacity-50 shrink-0"
                    >
                      {isProcessing === phase.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Complete'}
                    </button>
                  ) : selectedPhaseId === phase.id ? (
                    <div className="flex gap-2 shrink-0 animate-in fade-in slide-in-from-right-2 duration-300">
                      <button
                        onClick={() => handleMarkComplete(phase.id, false)}
                        disabled={isProcessing === phase.id}
                        className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg transition-all disabled:opacity-50 shrink-0"
                        title="Complete phase and send default email"
                      >
                        {isProcessing === phase.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <><i className="ph ph-paper-plane mr-1 font-bold"></i> Mail</>}
                      </button>
                      <button
                        onClick={() => handleMarkComplete(phase.id, true)}
                        disabled={isProcessing === phase.id}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50 shrink-0"
                        title="Complete phase without sending email"
                      >
                        {isProcessing === phase.id ? <i className="ph ph-fast-forward mr-1 font-bold"></i> : <><i className="ph ph-fast-forward mr-1 font-bold"></i> Skip</>}
                      </button>
                      <button
                        onClick={() => setSelectedPhaseId(null)}
                        disabled={isProcessing === phase.id}
                        className="px-2 border border-transparent text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <i className="ph ph-x font-bold"></i>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedPhaseId(phase.id)}
                      className="px-3 py-1.5 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-border-dark text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-all shrink-0"
                    >
                      Complete
                    </button>
                  )
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    {phaseEmailStatus[phase.id] === 'failed' ? (
                      <div className="flex gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
                        <button
                          onClick={() => handleRetryEmail(phase.id)}
                          className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg transition-all shrink-0"
                          title="Retry sending the email notification"
                        >
                          <i className="fa-solid fa-rotate-right mr-1"></i> Retry
                        </button>
                        <button
                          onClick={() => handleSkipEmail(phase.id)}
                          className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 rounded-lg transition-all shrink-0"
                          title="Skip sending for now"
                        >
                          <i className="ph ph-fast-forward mr-1 font-bold"></i> Skip
                        </button>
                      </div>
                    ) : phaseEmailStatus[phase.id] === 'skipped' ? (
                      <span className="text-[9px] bg-slate-50 dark:bg-[#18181b] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-border-dark px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                        <i className="ph ph-fast-forward"></i> Skipped
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRetryEmail(phase.id)}
                        className="w-8 h-8 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:shadow-inner rounded-full transition-all"
                        title="Resend Notification"
                      >
                        <i className="ph ph-paper-plane text-sm"></i>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Pagination
          isDark={isDark}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Email Preview Modal */}
      {emailModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151619]/60 backdrop-blur-sm p-4" onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}>
          <div
            className="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {emailModal.isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-4 text-slate-400">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-blue-500"></i>
                <p className="text-sm font-medium">Loading email preview…</p>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-background-dark/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                      <i className="fa-solid fa-envelope-open-text"></i>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Email Preview</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Review and edit before sending to {emailModal.customerName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-background-dark transition-all"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                {/* Side-by-side: Form + Live Preview */}
                <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto">
                  {/* Left: Email Form */}
                  <div className="flex-1 p-5 space-y-4 border-r border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        <i className="fa-solid fa-hashtag mr-1"></i> Job #{emailModal.jobId}
                      </span>
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 dark:bg-[#18181b] text-slate-605 dark:text-slate-300">
                        <i className="fa-solid fa-gear mr-1"></i> {emailModal.phaseName}
                      </span>
                      {emailModal.isFinal && (
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                          <i className="fa-solid fa-flag-checkered mr-1"></i> Final Phase
                        </span>
                      )}
                      {emailModal.isPaymentPhase && (
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-orange-50 dark:bg-orange-950/20 text-orange-605 dark:text-orange-400">
                          <i className="fa-solid fa-indian-rupee-sign mr-1"></i> Payment: ₹{emailModal.paymentAmount.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">To</label>
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-border-dark rounded-xl text-sm text-slate-700 dark:text-slate-300">
                        <i className="fa-solid fa-user text-slate-400 text-xs"></i>
                        {emailModal.customerName} &lt;{emailModal.to}&gt;
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-555 dark:text-slate-400 uppercase tracking-wider">Subject</label>
                      <input
                        type="text"
                        value={emailModal.subject}
                        onChange={e => setEmailModal(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-border-dark text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      />
                    </div>

                    {/* Greeting */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-555 dark:text-slate-400 uppercase tracking-wider">Greeting</label>
                      <input
                        type="text"
                        value={emailModal.greeting}
                        onChange={e => setEmailModal(prev => ({ ...prev, greeting: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-border-dark text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      />
                    </div>

                    {/* Message Body */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-555 dark:text-slate-400 uppercase tracking-wider">Message</label>
                      <textarea
                        value={emailModal.message}
                        onChange={e => setEmailModal(prev => ({ ...prev, message: e.target.value }))}
                        rows={6}
                        className="w-full px-4 py-3 bg-white dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-border-dark text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none leading-relaxed"
                      />
                    </div>

                    {/* Payment Amount */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-555 dark:text-slate-400 uppercase tracking-wider">Payment Amount (₹)</label>
                      <input
                        type="number"
                        value={emailModal.paymentAmount}
                        onChange={e => setEmailModal(prev => ({ ...prev, paymentAmount: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white dark:bg-[#18181b] rounded-xl border border-slate-200 dark:border-border-dark text-sm text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Right: Live Preview */}
                  <div className="flex-1 p-5 bg-slate-50 dark:bg-background-dark/20">
                    <label className="text-xs font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider block mb-2">Live Preview</label>
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-blue-600 text-white px-5 py-3 text-center">
                        <p className="font-bold text-sm">Satguru Engineers Service Update</p>
                      </div>
                      <div className="p-5 text-sm text-slate-700 space-y-3 bg-white">
                        <p className="whitespace-pre-wrap">{emailModal.greeting}</p>
                        <p className="whitespace-pre-wrap">{emailModal.message}</p>
                        <div className="bg-slate-50 border-l-4 border-blue-600 p-3 rounded-r-lg">
                          <p className="font-bold text-blue-600 text-xs">Phase: {emailModal.phaseName}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Technician: {emailModal.technician}</p>
                        </div>
                        {Number(emailModal.paymentAmount) > 0 && (
                          <div className="mt-3 p-3 bg-orange-50 border-2 border-dashed border-orange-400 rounded-lg text-center">
                            <p className="text-[10px] font-bold text-orange-850 uppercase">Payment Request</p>
                            <p className="text-lg font-bold text-orange-655 mt-1">₹{Number(emailModal.paymentAmount).toLocaleString()}</p>
                            <p className="text-[9px] text-slate-500">Payment Status: {emailModal.paymentStatus}</p>
                          </div>
                        )}
                        <p className="text-xs text-slate-400 pt-2">Thank you for choosing Satguru Engineers.</p>
                      </div>
                      <div className="bg-slate-55 px-5 py-2.5 text-center border-t border-slate-100">
                        <p className="text-[10px] text-slate-400">&copy; {new Date().getFullYear()} Satguru Engineers.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-5 border-t border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-card-dark rounded-b-2xl">
                  {emailModal.isRetry ? (
                    <div></div> // Empty div to keep the flex layout balanced
                  ) : (
                    <button
                      onClick={() => handleConfirmComplete(true)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-555 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-background-dark rounded-xl transition-all order-2 sm:order-1"
                    >
                      <i className="fa-solid fa-forward mr-1.5"></i> Complete Without Email
                    </button>
                  )}
                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <button
                      onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                      className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-background-dark rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => emailModal.isRetry ? handleResendEmail() : handleConfirmComplete(false)}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                      <i className="fa-solid fa-paper-plane"></i> {emailModal.isRetry ? 'Resend Email' : 'Send & Complete Phase'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {activeFile && (
        <FileViewerModal 
          url={activeFile.url} 
          filename={activeFile.name} 
          onClose={() => setActiveFile(null)} 
        />
      )}

      {isSummaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151619]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-border-dark">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-background-dark/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <i className="ph ph-file-text text-xl"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Material Tracking Summary</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Consolidated logs for Job #{job.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSummaryOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-background-dark transition-all"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto text-slate-800 dark:text-slate-200">
              <div className="grid grid-cols-2 gap-8">
                {/* Left Column: Piping & Controls */}
                <div className="space-y-6">
                  {/* Copper Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-circle text-[6px] text-blue-500"></i> Copper Piping
                    </h4>
                    {groupedCopperLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-3">No copper piping logs found.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3 pl-3">
                        {groupedCopperLogs.map((log: any) => (
                          <div key={log.size} className="bg-slate-50 dark:bg-background-dark/40 border border-slate-150 dark:border-slate-800/60 p-3 rounded-xl flex flex-col items-center">
                            <span className="text-[10px] font-bold text-slate-500 mb-1">{log.size}"</span>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{Number(log.usedQty).toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Drain Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-circle text-[6px] text-emerald-500"></i> Drain Pipe
                    </h4>
                    <div className="pl-3">
                      {drainLogs.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">No drain pipe logs found.</p>
                      ) : (
                        <div className="bg-slate-50 dark:bg-background-dark/40 border border-slate-150 dark:border-slate-800/60 p-3 rounded-xl flex justify-between items-center max-w-sm">
                          <span className="text-xs font-semibold">Total Used</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {drainLogs.reduce((sum, log) => sum + Number(log.usedQty || 0), 0).toFixed(2)} ft
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Remote Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-circle text-[6px] text-purple-500"></i> Remotes
                    </h4>
                    {remoteLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-3">No remote logs found.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-3">
                        {Object.entries(
                          remoteLogs.reduce((acc: Record<string, number>, log: any) => {
                            const type = log.type || 'wired';
                            acc[type] = (acc[type] || 0) + Number(log.usedQty || 0);
                            return acc;
                          }, {})
                        ).map(([type, qty]) => (
                          <div key={type} className="bg-slate-50 dark:bg-background-dark/40 border border-slate-150 dark:border-slate-800/60 p-3 rounded-xl flex justify-between items-center capitalize">
                            <span className="text-xs font-semibold">{type}</span>
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{(qty as number)} pcs</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Units & Custom Materials */}
                <div className="space-y-6">
                  {/* AC Models Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-circle text-[6px] text-amber-500"></i> AC Models
                    </h4>
                    {acLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-3">No AC models logged.</p>
                    ) : (
                      <div className="space-y-2 pl-3">
                        {acLogs.map((log: any) => (
                          <div key={log.id} className="bg-slate-50 dark:bg-background-dark/40 border border-slate-150 dark:border-slate-800/60 p-3 rounded-xl flex justify-between items-center">
                            <span className="text-xs font-semibold">{log.description}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{log.date}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Others Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-circle text-[6px] text-slate-500"></i> Other Materials
                    </h4>
                    {otherLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-3">No other materials logged.</p>
                    ) : (
                      <div className="space-y-2 pl-3">
                        {Object.values(
                          otherLogs.reduce((acc: Record<string, { description: string, qty: number }>, log: any) => {
                            const desc = log.description || '';
                            if (acc[desc]) {
                              acc[desc].qty += Number(log.qty || 0);
                            } else {
                              acc[desc] = { description: desc, qty: Number(log.qty || 0) };
                            }
                            return acc;
                          }, {})
                        ).map((item: any) => (
                          <div key={item.description} className="bg-slate-50 dark:bg-background-dark/40 border border-slate-150 dark:border-slate-800/60 p-3 rounded-xl flex justify-between items-center">
                            <span className="text-xs font-semibold">{item.description}</span>
                            <span className="text-xs font-bold text-slate-605 dark:text-slate-400 bg-slate-100 dark:bg-[#18181b] px-2 py-0.5 rounded-md font-bold">Qty: {item.qty}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end rounded-b-2xl">
              <button
                onClick={() => setIsSummaryOpen(false)}
                className="px-5 py-2 text-xs font-bold text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetail;
