
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Job, Customer, JobPhase, Payment } from '../types';
import { APP_NAME, SUPPORT_EMAIL, API_BASE_URL } from '../constants';
import Pagination from '../components/Pagination';
import FileViewerModal from '../components/FileViewerModal';
import { useRealtimeListener } from '../components/RealtimeProvider';
import CustomSelect from '../components/CustomSelect';
import { useAuth, useSettings } from '../context/AppContext';
import { api } from '../lib/api';
import { AnimatedNotificationButton } from '../components/AnimatedNotificationButton';

const JobDetail: React.FC = () => {
  const { id } = useParams();
  const { isDark = false } = useOutletContext<{ isDark?: boolean }>() || {};
  const { token, user } = useAuth();
  const { requireEmailPreview, whatsappEnabled } = useSettings();
  const [job, setJob] = useState<any>(null);
  const [phases, setPhases] = useState<JobPhase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [phaseEmailStatus, setPhaseEmailStatus] = useState<Record<number, 'sent' | 'failed' | 'skipped' | 'read' | 'delivered'>>({});
  const [phaseWhatsappStatus, setPhaseWhatsappStatus] = useState<Record<number, 'sent' | 'failed' | 'skipped' | 'read' | 'delivered'>>({});
  const [emailAnimStates, setEmailAnimStates] = useState<Record<number, 'idle' | 'filling' | 'rippling' | 'resolving' | 'completed'>>({});
  const [whatsappAnimStates, setWhatsappAnimStates] = useState<Record<number, 'idle' | 'filling' | 'rippling' | 'resolving' | 'completed'>>({});
  const [expandedCompletedPhases, setExpandedCompletedPhases] = useState<Record<number, boolean>>({});
  const [justCompletedPhases, setJustCompletedPhases] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const startEmailFilling = (phaseId: number) => {
    setEmailAnimStates(prev => ({ ...prev, [phaseId]: 'filling' }));
  };

  const resolveEmailSuccess = (phaseId: number) => {
    setEmailAnimStates(prev => ({ ...prev, [phaseId]: 'rippling' }));
    
    setTimeout(() => {
      setEmailAnimStates(prev => ({ ...prev, [phaseId]: 'resolving' }));
    }, 400);

    setTimeout(() => {
      setEmailAnimStates(prev => ({ ...prev, [phaseId]: 'completed' }));
      setTimeout(() => {
        setEmailAnimStates(prev => ({ ...prev, [phaseId]: 'idle' }));
      }, 1000);
    }, 600);
  };

  const cancelEmailAnimation = (phaseId: number) => {
    setEmailAnimStates(prev => ({ ...prev, [phaseId]: 'idle' }));
  };

  const startWhatsappFilling = (phaseId: number) => {
    setWhatsappAnimStates(prev => ({ ...prev, [phaseId]: 'filling' }));
  };

  const resolveWhatsappSuccess = (phaseId: number) => {
    setWhatsappAnimStates(prev => ({ ...prev, [phaseId]: 'rippling' }));
    
    setTimeout(() => {
      setWhatsappAnimStates(prev => ({ ...prev, [phaseId]: 'resolving' }));
    }, 400);

    setTimeout(() => {
      setWhatsappAnimStates(prev => ({ ...prev, [phaseId]: 'completed' }));
      setTimeout(() => {
        setWhatsappAnimStates(prev => ({ ...prev, [phaseId]: 'idle' }));
      }, 1000);
    }, 600);
  };

  const cancelWhatsappAnimation = (phaseId: number) => {
    setWhatsappAnimStates(prev => ({ ...prev, [phaseId]: 'idle' }));
  };
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
    sendWhatsApp: boolean;
    sendEmail: boolean;
    mode: 'email' | 'whatsapp';
    whatsappTemplate: string;
    customDate: string;
    customTxt: string;
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
    paymentStatus: '',
    sendWhatsApp: true,
    sendEmail: true,
    mode: 'email',
    whatsappTemplate: 'Phase-Complete',
    customDate: '',
    customTxt: ''
  });

  const [previewTab, setPreviewTab] = useState<'email' | 'whatsapp'>('email');
  const [waTemplates, setWaTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (whatsappEnabled) {
      api.get('/whatsapp/templates')
        .then(data => setWaTemplates(data || []))
        .catch(err => console.error('Failed to fetch templates:', err));
    }
  }, [whatsappEnabled]);

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
      const [copperData, drainData, remoteData, othersData, copperStockData, acData, availableAcData] = await Promise.all([
        api.get(`/material/copper?jobId=${id}`).catch(() => []),
        api.get(`/material/drain?jobId=${id}`).catch(() => []),
        api.get(`/material/remote?jobId=${id}`).catch(() => []),
        api.get(`/material/others?jobId=${id}`).catch(() => []),
        api.get('/inventory/copper').catch(() => []),
        api.get(`/material/ac-model?jobId=${id}`).catch(() => []),
        api.get('/inventory/available-models').catch(() => [])
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
  }, [id]);
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

      await api.post(endpoint, body);

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
    } catch (err: any) {
      setNotification({ message: err.message || 'Network error logging material', type: 'error' });
    } finally {
      setIsLoggingMaterial(false);
    }
  };

  const handleDeleteMaterialLog = async (type: 'copper' | 'drain' | 'remote' | 'ac-model' | 'others', logId: number) => {
    if (!window.confirm('Are you sure you want to delete this material log?')) return;
    try {
      await api.delete(`/material/${type}/${logId}`);
      setNotification({ message: 'Log deleted successfully', type: 'success' });
      fetchMaterialLogs();
    } catch (err: any) {
      setNotification({ message: err.message || 'Network error deleting log', type: 'error' });
    }
  };

  const handleDeleteCopperGroup = async (ids: number[]) => {
    if (!window.confirm('Are you sure you want to delete this copper tracking entry? This will delete all logged entries for this size.')) return;
    try {
      for (const logId of ids) {
        await api.delete(`/material/copper/${logId}`);
      }
      setNotification({ message: 'Log deleted successfully', type: 'success' });
      fetchMaterialLogs();
    } catch (err: any) {
      setNotification({ message: err.message || 'Network error deleting log', type: 'error' });
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const data = await api.get(`/jobs/${id}`);
      const paymentsData = await api.get(`/jobs/${id}/payments`).catch(() => []);

      setJob(data.job);
      const phaseList = Array.isArray(data.phases) ? data.phases : [];
      setPhases(phaseList);
      
      // Initialize email & whatsapp status maps from database
      const emailStatusMap: Record<number, 'sent' | 'failed' | 'skipped' | 'read' | 'delivered'> = {};
      const whatsappStatusMap: Record<number, 'sent' | 'failed' | 'skipped' | 'read' | 'delivered'> = {};
      phaseList.forEach((p: any) => {
        if (p.emailStatus) {
          emailStatusMap[p.id] = p.emailStatus;
        }
        if (p.whatsappStatus) {
          whatsappStatusMap[p.id] = p.whatsappStatus;
        }
      });
      setPhaseEmailStatus(emailStatusMap);
      setPhaseWhatsappStatus(whatsappStatusMap);

      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      fetchMaterialLogs();
    } catch (err) {
      console.error("Failed to fetch job", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [id, fetchMaterialLogs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeListener('jobs', fetchData);

  const updatePaymentStatus = async (newStatus: string) => {
    if (!job) return;
    setIsUpdatingPayment(true);
    try {
      await api.patch(`/jobs/${id}/payment`, { paymentStatus: newStatus });
      setJob({ ...job, paymentStatus: newStatus });
      setNotification({ message: `Payment status updated to ${newStatus}`, type: 'success' });
    } catch (err: any) {
      setNotification({ message: err.message || "Failed to update payment status", type: 'error' });
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentAmount || isNaN(Number(newPaymentAmount))) return;
    setIsRecordingPayment(true);
    try {
      await api.post(`/jobs/${id}/payments`, {
        amount: Number(newPaymentAmount),
        category: newPaymentCategory,
        paymentMethod: newPaymentMethod,
        notes: newPaymentNotes
      });
      setNotification({ message: 'Payment recorded successfully', type: 'success' });
      setNewPaymentAmount('');
      setNewPaymentNotes('');
      fetchData();
    } catch (err: any) {
      setNotification({ message: err.message || "Network error recording payment", type: 'error' });
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/payments/${paymentId}`);
      setNotification({ message: 'Payment deleted successfully', type: 'success' });
      fetchData(); // Refresh the job and payments data
    } catch (err: any) {
      setNotification({ message: err.message || "Network error deleting payment", type: 'error' });
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
      const data = await api.patch(`/jobs/${id}/costs`, editedCosts);
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
    } catch (err: any) {
      setNotification({ message: err.message || "Network error updating costs", type: 'error' });
    } finally {
      setIsSavingCosts(false);
    }
  };

  // Opens the email preview modal to let user choose notifications to send
  const handleMarkComplete = async (phaseId: number, directSkipEmail = false) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase || !job) return;

    setEmailModal(prev => ({ 
      ...prev, 
      isOpen: true, 
      isLoading: true, 
      phaseId, 
      isRetry: false,
      sendEmail: true,
      sendWhatsApp: false,
      mode: 'email'
    }));
    setPreviewTab('email');
    setNotification(null);

    try {
      const [preview, templatesData] = await Promise.all([
        api.get(`/phases/${phaseId}/email-preview`),
        whatsappEnabled ? api.get('/whatsapp/templates') : Promise.resolve([])
      ]);
      if (templatesData) {
        setWaTemplates(templatesData);
      }
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
    } catch (err: any) {
      setEmailModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      setNotification({ message: err.message || 'Network error loading preview', type: 'error' });
    }
  };

  // Opens the WhatsApp preview modal
  const handleMarkCompleteWhatsApp = async (phaseId: number, isRetry = false) => {
    const phase = phases.find(p => p.id === phaseId);
    if (!phase || !job) return;

    setEmailModal(prev => ({ 
      ...prev, 
      isOpen: true, 
      isLoading: true, 
      phaseId, 
      isRetry,
      sendEmail: false,
      sendWhatsApp: true,
      mode: 'whatsapp'
    }));
    setPreviewTab('whatsapp');
    setNotification(null);

    try {
      const [preview, templatesData] = await Promise.all([
        api.get(`/phases/${phaseId}/email-preview`),
        whatsappEnabled ? api.get('/whatsapp/templates') : Promise.resolve([])
      ]);
      if (templatesData) {
        setWaTemplates(templatesData);
      }
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
        paymentStatus: preview.paymentStatus,
        whatsappTemplate: preview.isPaymentPhase && Number(preview.paymentAmount) > 0 ? 'Phase-Complete-Payment' : 'Phase-Complete'
      }));
    } catch (err: any) {
      setEmailModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      setNotification({ message: err.message || 'Network error loading preview', type: 'error' });
    }
  };

  const handleDirectComplete = async (phaseId: number, options: { sendWhatsApp: boolean; skipEmail: boolean; silentComplete?: boolean }) => {
    setIsProcessing(phaseId);
    setNotification(null);
    setEmailModal(prev => ({ ...prev, isOpen: false }));
    try {
      const payload: any = { 
        isCompleted: true, 
        skipEmail: options.skipEmail, 
        sendWhatsApp: options.sendWhatsApp,
        silentComplete: options.silentComplete
      };
      if (options.sendWhatsApp) {
        payload.whatsappTemplate = emailModal.whatsappTemplate;
        payload.customDate = emailModal.customDate;
        payload.customTxt = emailModal.customTxt;
        if (emailModal.whatsappTemplate === 'Phase-Complete-Payment') {
          payload.customPaymentAmount = emailModal.paymentAmount ? Number(emailModal.paymentAmount) : 0;
        }
      }
      const data = await api.patch(`/phases/${phaseId}`, payload);
      setPhases(prev => prev.map(p =>
        p.id === phaseId ? { ...p, isCompleted: true, completedAt: new Date().toISOString() } : p
      ));
      setJustCompletedPhases(prev => new Set(prev).add(phaseId));
      setJob((prev: any) => ({
        ...prev,
        status: data.jobStatus || prev.status,
        currentPhase: data.currentPhase
      }));
      setPhaseEmailStatus(prev => ({ 
        ...prev, 
        [phaseId]: options.silentComplete ? undefined : (options.skipEmail ? 'skipped' : (data.emailSent ? 'sent' : 'failed')) 
      }));
      setPhaseWhatsappStatus(prev => ({ 
        ...prev, 
        [phaseId]: options.silentComplete ? undefined : (options.sendWhatsApp ? (data.whatsappSent ? 'sent' : 'failed') : 'skipped') 
      }));
      
      const waMessage = options.sendWhatsApp 
        ? (data.whatsappSent ? ' and WhatsApp notification sent successfully.' : ' (WhatsApp failed to send).') 
        : '';
      setNotification({ 
        message: `Phase completed successfully${waMessage}`, 
        type: 'success' 
      });
      setSelectedPhaseId(null);
    } catch (err: any) {
      setNotification({ message: err.message || 'Network connection error', type: 'error' });
    } finally {
      setIsProcessing(null);
    }
  };

  // Completes the phase and sends the (possibly edited) email
  const handleConfirmComplete = async (skipEmail = false) => {
    if (!emailModal.phaseId || !job) return;

    setIsProcessing(emailModal.phaseId);
    setEmailModal(prev => ({ ...prev, isOpen: false }));

    try {
      const bodyPayload: any = { 
        isCompleted: true,
        sendWhatsApp: emailModal.sendWhatsApp
      };
      if (emailModal.sendWhatsApp) {
        bodyPayload.whatsappTemplate = emailModal.whatsappTemplate;
        bodyPayload.customDate = emailModal.customDate;
        bodyPayload.customTxt = emailModal.customTxt;
      }
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

      const data = await api.patch(`/phases/${emailModal.phaseId}`, bodyPayload);

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
      setPhaseWhatsappStatus(prev => ({ ...prev, [emailModal.phaseId!]: emailModal.sendWhatsApp ? (data.whatsappSent ? 'sent' : 'failed') : 'skipped' }));
    } catch (err: any) {
      setNotification({ message: err.message || 'Network connection error', type: 'error' });
    } finally {
      setIsProcessing(null);
    }
  };

  // Retry sending email for a completed phase
  const handleRetryEmail = async (phaseId: number) => {
    if (!requireEmailPreview) {
      setNotification(null);
      setPhaseEmailStatus(prev => ({ ...prev, [phaseId]: 'failed' })); // keeps it showing failed while we process, though ideally we'd have a 'retrying' state. We will just use the same logic as the modal for simplicity, but skip UI.
      startEmailFilling(phaseId);

      try {
        const data = await api.post(`/phases/${phaseId}/resend-email`, {});
        setPhaseEmailStatus(prev => ({ ...prev, [phaseId]: data.emailSent ? 'sent' : 'failed' }));
        if (!data.emailSent) {
          cancelEmailAnimation(phaseId);
          const errorDetail = data.emailError ? ` (Reason: ${data.emailError})` : '';
          setNotification({ message: `Email failed to send again${errorDetail}. Please check your settings or skip.`, type: 'error' });
        } else {
          resolveEmailSuccess(phaseId);
          setNotification({ message: 'Email sent successfully!', type: 'success' });
        }
      } catch (err: any) {
        cancelEmailAnimation(phaseId);
        setPhaseEmailStatus(prev => ({ ...prev, [phaseId]: 'failed' }));
        setNotification({ message: err.message || 'Network error while retrying email.', type: 'error' });
      }
      return;
    }

    setEmailModal(prev => ({ ...prev, isOpen: true, isLoading: true, phaseId, isRetry: true, mode: 'email', sendEmail: true, sendWhatsApp: false }));
    setNotification(null);

    try {
      const preview = await api.get(`/phases/${phaseId}/email-preview`);
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
    } catch (err: any) {
      setEmailModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
      setNotification({ message: err.message || 'Network error loading preview', type: 'error' });
    }
  };

  // Resend email (for already completed phases)
  const handleResendEmail = async () => {
    if (!emailModal.phaseId || !job) return;

    const phaseId = emailModal.phaseId;
    setEmailModal(prev => ({ ...prev, isOpen: false }));
    setPhaseEmailStatus(prev => ({ ...prev, [phaseId]: undefined as any }));
    startEmailFilling(phaseId);

    try {
      const bodyPayload: any = {
        customSubject: emailModal.subject,
        customGreeting: emailModal.greeting,
        customMessage: emailModal.message,
      };
      if (Number(emailModal.paymentAmount) > 0) {
        bodyPayload.customPaymentAmount = Number(emailModal.paymentAmount);
      }

      const data = await api.post(`/phases/${emailModal.phaseId}/resend-email`, bodyPayload);
      setPhaseEmailStatus(prev => ({ ...prev, [emailModal.phaseId!]: data.emailSent ? 'sent' : 'failed' }));
      if (!data.emailSent) {
        cancelEmailAnimation(phaseId);
        const errorDetail = data.emailError ? ` (Reason: ${data.emailError})` : '';
        setNotification({ message: `Email failed to send again${errorDetail}. Please check your settings or skip.`, type: 'error' });
      } else {
        resolveEmailSuccess(phaseId);
        setNotification({ message: 'Email sent successfully!', type: 'success' });
      }
    } catch (err: any) {
      cancelEmailAnimation(phaseId);
      setPhaseEmailStatus(prev => ({ ...prev, [emailModal.phaseId!]: 'failed' }));
      setNotification({ message: err.message || 'Network error while retrying email.', type: 'error' });
    }
  };

  // Skip notifications for a completed phase (calls backend and updates status to skipped)
  const handleSkipNotificationsForPhase = async (phaseId: number) => {
    setIsProcessing(phaseId);
    try {
      await api.patch(`/phases/${phaseId}`, { isCompleted: true, skipEmail: true });
      setPhaseEmailStatus(prev => ({ ...prev, [phaseId]: 'skipped' }));
      setPhaseWhatsappStatus(prev => ({ ...prev, [phaseId]: 'skipped' }));
      setNotification({ message: 'Notifications skipped for this phase.', type: 'success' });
    } catch (err: any) {
      setNotification({ message: err.message || 'Error skipping notifications', type: 'error' });
    } finally {
      setIsProcessing(null);
    }
  };

  // Send WhatsApp for an already-completed phase (with customized template/payment from modal)
  const handleSendWhatsAppCompleted = async () => {
    if (!emailModal.phaseId || !job) return;

    const phaseId = emailModal.phaseId;
    setIsProcessing(phaseId);
    setEmailModal(prev => ({ ...prev, isOpen: false }));
    setNotification(null);
    startWhatsappFilling(phaseId);

    try {
      const payload: any = {
        isCompleted: true,
        whatsappTemplate: emailModal.whatsappTemplate,
        customDate: emailModal.customDate,
        customTxt: emailModal.customTxt
      };
      if (emailModal.whatsappTemplate === 'Phase-Complete-Payment') {
        payload.customPaymentAmount = emailModal.paymentAmount ? Number(emailModal.paymentAmount) : 0;
      }
      const data = await api.post(`/phases/${emailModal.phaseId}/send-whatsapp`, payload);
      setPhaseWhatsappStatus(prev => ({ ...prev, [emailModal.phaseId!]: data.whatsappSent ? 'sent' : 'failed' }));
      if (data.whatsappSent) {
        resolveWhatsappSuccess(phaseId);
        setNotification({ message: 'WhatsApp message sent successfully!', type: 'success' });
      } else {
        cancelWhatsappAnimation(phaseId);
        const errorDetail = data.whatsappError ? ` (Reason: ${data.whatsappError})` : '';
        setNotification({ message: `WhatsApp failed to send${errorDetail}. Please check connection or retry.`, type: 'error' });
      }
    } catch (err: any) {
      cancelWhatsappAnimation(phaseId);
      setPhaseWhatsappStatus(prev => ({ ...prev, [emailModal.phaseId!]: 'failed' }));
      setNotification({ message: err.message || 'Network error while sending WhatsApp.', type: 'error' });
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

  const getWhatsAppPreviewText = () => {
    const customer = emailModal.customerName || 'Customer';
    const address = job?.customerAddress || 'Customer Address';
    const phase = emailModal.phaseName || 'Current Phase';
    const technician = emailModal.technician ? emailModal.technician.split('@')[0] : 'Assigned Technician';
    const outstanding = String(emailModal.paymentAmount || '0');
    const customDate = emailModal.customDate || '';
    const customTxt = emailModal.customTxt || '';

    // Find the template from waTemplates
    const template = waTemplates.find(t => t.name === emailModal.whatsappTemplate);
    
    let header = `Hello ${customer},`;
    let footer = `Thank you for choosing Satguru Engineers. 🙏`;
    let body = '';

    if (template) {
      header = template.header || '';
      body = template.body || '';
      footer = template.footer || '';

      // Helper to replace variables case-insensitively
      const replaceVar = (text: string, varName: string, value: string) => {
        const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'gi');
        return text.replace(regex, value);
      };

      // Perform replacements
      header = replaceVar(header, 'customer', customer);
      header = replaceVar(header, 'Customer', customer);

      body = replaceVar(body, 'customer', customer);
      body = replaceVar(body, 'Customer', customer);
      body = replaceVar(body, 'Adress', address);
      body = replaceVar(body, 'Address', address);
      body = replaceVar(body, 'phase', phase);
      body = replaceVar(body, 'technician', technician);
      body = replaceVar(body, 'outstanding', outstanding);
      body = replaceVar(body, 'date', customDate);
      body = replaceVar(body, 'txt', customTxt);

      footer = replaceVar(footer, 'customer', customer);
      footer = replaceVar(footer, 'Customer', customer);
    } else {
      // Fallback
      const isPayment = emailModal.whatsappTemplate === 'Phase-Complete-Payment';
      body = isPayment 
        ? `Your installation for ${address} has been updated.\n\n✅ Phase Completed: ${phase}\n👷 Technician: ${technician}\n\nThis phase has been completed successfully by our team.\n\n💰 Payment Due: ₹${outstanding}\n\nIf you have any questions or notice anything pending, simply reply to this message. We'll be happy to assist you.`
        : `Your installation for ${address} has been updated.\n\n✅ Phase Completed: ${phase}\n👷 Technician: ${technician}\n\nThis phase has been completed successfully by our team.\n\nIf you have any questions or notice anything pending, simply reply to this message. We'll be happy to assist you.`;
    }

    return { header, body, footer };
  };

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
                      <span className="text-[10px] font-bold bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/50 uppercase ml-2 tracking-normal">Unpaid</span>
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
                          <span className="text-[10px] font-bold bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/50 uppercase ml-2 tracking-normal">Unpaid</span>
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
                    <div key={p.id} className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs group relative">
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
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
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

        <div className="mt-2">
          {(() => {
            const groups = job?.jobType === 'Service' 
              ? [
                  { title: "Inspection", items: ["Initial System Inspection"] },
                  { title: "Cleaning", items: ["Filter & Coil Cleaning"] },
                  { title: "Check", items: ["Gas Level & Pressure Check"] },
                  { title: "Repair", items: ["Component Repair/Replacement"] },
                  { title: "Final & Payment", items: ["Final Testing & Payment"] }
                ]
              : [
                  {
                    title: "Prep & Piping",
                    items: [
                      "Drain pipe",
                      "Remote pipe",
                      "Wall opening",
                      "Supporting",
                      "Copper piping (payment)"
                    ]
                  },
                  {
                    title: "Wiring & Ducting",
                    items: [
                      "Leak testing",
                      "Dressing",
                      "Communication wiring",
                      "Ducting"
                    ]
                  },
                  {
                    title: "Unit Installation",
                    items: [
                      "Indoor Unit Installation",
                      "Grill fitting",
                      "Outdoor fittings (payment)"
                    ]
                  },
                  {
                    title: "Testing & Commissioning",
                    items: [
                      "Pressure stand",
                      "Vacuum",
                      "Gas charging",
                      "Remote fitting",
                      "Commissioning (payment)"
                    ]
                  }
                ];

            const matchedPhaseIds = new Set<number>();
            const mappedGroups = groups.map((g) => {
              const groupPhases = phases.filter(p => {
                const match = g.items.some(item => item.toLowerCase() === p.phaseName.toLowerCase());
                if (match) matchedPhaseIds.add(p.id);
                return match;
              });
              return { ...g, phases: groupPhases };
            });

            const unmatchedPhases = phases.filter(p => !matchedPhaseIds.has(p.id));
            if (unmatchedPhases.length > 0) {
              mappedGroups.push({
                title: "Other Tasks",
                items: unmatchedPhases.map(p => p.phaseName),
                phases: unmatchedPhases
              });
            }

            let foundActive = false;
            const groupsWithStatus = mappedGroups.map((g) => {
              const total = g.phases.length;
              const completed = g.phases.filter(p => p.isCompleted).length;
              
              let status: 'Complete' | 'In progress' | 'Not started' = 'Not started';
              if (total === 0) {
                status = 'Not started';
              } else if (completed === total) {
                status = 'Complete';
              } else if (completed > 0) {
                status = 'In progress';
                foundActive = true;
              } else if (!foundActive) {
                status = 'In progress';
                foundActive = true;
              } else {
                status = 'Not started';
              }

              return {
                ...g,
                total,
                completed,
                status
              };
            });

            const isGroupExpanded = (groupTitle: string, status: string) => {
              if (expandedGroups[groupTitle] !== undefined) {
                return expandedGroups[groupTitle];
              }
              return status === 'In progress';
            };

            const toggleGroup = (groupTitle: string, status: string) => {
              setExpandedGroups(prev => ({
                ...prev,
                [groupTitle]: !isGroupExpanded(groupTitle, status)
              }));
            };

            const renderGroupCard = (group: any) => {
              const isExpanded = isGroupExpanded(group.title, group.status);
              let ringColor = '';
              let statusLabel = '';

              if (group.status === 'Complete') {
                ringColor = 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5';
                statusLabel = 'Complete';
              } else if (group.status === 'In progress') {
                ringColor = 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5';
                statusLabel = 'In progress';
              } else {
                ringColor = 'border-slate-200 dark:border-border-dark text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-background-dark/50';
                statusLabel = 'Not started';
              }

              return (
                <div 
                  key={group.title} 
                  className={`border rounded-xl overflow-hidden transition-all duration-350 ${
                    isExpanded 
                      ? 'shadow-md border-slate-300 dark:border-slate-700 bg-white dark:bg-card-dark' 
                      : 'border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark/25 hover:border-slate-350 dark:hover:border-slate-800'
                  }`}
                >
                  <button
                    onClick={() => toggleGroup(group.title, group.status)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 border ${ringColor}`}>
                        {group.completed}/{group.total}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-slate-805 dark:text-slate-200 truncate">{group.title}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{statusLabel}</span>
                      </div>
                    </div>
                    <i className={`ph ph-caret-down text-slate-400 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}></i>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-border-dark/50 bg-slate-50/20 dark:bg-background-dark/10 p-3 flex flex-col gap-2 animate-in fade-in duration-200">
                      {group.phases.map((phase: any) => {
                        const originalIdx = phases.findIndex(p => p.id === phase.id);
                        const isJustCompleted = justCompletedPhases.has(phase.id);
                        return (
                          <div 
                            key={phase.id} 
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 transition-all ${
                              phase.isCompleted 
                                ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/10' 
                                : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-border-dark hover:border-slate-350 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {phase.isCompleted ? (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                                  <i className="ph ph-check text-[10px] font-bold"></i>
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0 flex items-center justify-center text-[9px] text-slate-400 font-medium">
                                  {originalIdx + 1}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className={`font-semibold truncate ${
                                  phase.isCompleted 
                                    ? 'text-slate-450 dark:text-slate-400 line-through' 
                                    : 'text-slate-700 dark:text-slate-200'
                                }`}>
                                  {phase.phaseName}
                                </span>
                                {phase.completedAt && (
                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-450 font-bold flex items-center gap-1 mt-0.5">
                                    <i className="ph ph-circle-wavy-check"></i> {new Date(phase.completedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {phase.isCompleted ? (
                                <>
                                  {phaseEmailStatus[phase.id] !== 'skipped' && (
                                    <AnimatedNotificationButton
                                      channel="email"
                                      status={phaseEmailStatus[phase.id]}
                                      onClick={() => handleRetryEmail(phase.id)}
                                      isProcessing={isProcessing === phase.id}
                                      animState={emailAnimStates[phase.id] || 'idle'}
                                    />
                                  )}
                                  {whatsappEnabled && phaseWhatsappStatus[phase.id] !== 'skipped' && (
                                    <AnimatedNotificationButton
                                      channel="whatsapp"
                                      status={phaseWhatsappStatus[phase.id]}
                                      onClick={() => handleMarkCompleteWhatsApp(phase.id, true)}
                                      isProcessing={isProcessing === phase.id}
                                      animState={whatsappAnimStates[phase.id] || 'idle'}
                                    />
                                  )}
                                  {((!phaseEmailStatus[phase.id] || phaseEmailStatus[phase.id] === 'failed') && 
                                    (!whatsappEnabled || !phaseWhatsappStatus[phase.id] || phaseWhatsappStatus[phase.id] === 'failed')) && (
                                    <button
                                      onClick={() => handleSkipNotificationsForPhase(phase.id)}
                                      disabled={isProcessing === phase.id}
                                      className="px-2 py-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-border-dark text-[9px] font-bold text-slate-500 dark:text-slate-450 hover:border-red-400 hover:text-red-500 rounded-lg transition-all cursor-pointer"
                                      title="Skip notifications"
                                    >
                                      SKIP
                                    </button>
                                  )}
                                  {phaseEmailStatus[phase.id] === 'skipped' && (!whatsappEnabled || phaseWhatsappStatus[phase.id] === 'skipped') && (
                                    <span className="text-[9px] text-slate-405 dark:text-slate-500 italic font-medium">Skipped</span>
                                  )}
                                </>
                              ) : (
                                <button
                                  onClick={() => handleDirectComplete(phase.id, { sendWhatsApp: false, skipEmail: true, silentComplete: true })}
                                  disabled={isProcessing === phase.id}
                                  className="px-2.5 py-1 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-border-dark text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-350 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                                  title="Complete phase"
                                >
                                  {isProcessing === phase.id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'COMPLETE'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Not Started Column */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-border-dark">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 flex items-center gap-1.5">
                      <i className="ph ph-circle text-slate-400 text-xs"></i> Not Started
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {groupsWithStatus.filter(g => g.status === 'Not started').length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {groupsWithStatus.filter(g => g.status === 'Not started').length === 0 ? (
                      <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        No phases in this status
                      </div>
                    ) : (
                      groupsWithStatus.filter(g => g.status === 'Not started').map(g => renderGroupCard(g))
                    )}
                  </div>
                </div>

                {/* In Progress Column */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-border-dark">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                      <i className="ph ph-spinner-gap fa-spin text-blue-500 text-xs"></i> In Progress
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {groupsWithStatus.filter(g => g.status === 'In progress').length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {groupsWithStatus.filter(g => g.status === 'In progress').length === 0 ? (
                      <div className="border border-dashed border-blue-500/10 dark:border-blue-500/5 rounded-xl p-6 text-center text-xs text-slate-450 dark:text-slate-500">
                        No active phases
                      </div>
                    ) : (
                      groupsWithStatus.filter(g => g.status === 'In progress').map(g => renderGroupCard(g))
                    )}
                  </div>
                </div>

                {/* Complete Column */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-border-dark">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                      <i className="ph ph-check-circle text-emerald-500 text-xs"></i> Complete
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {groupsWithStatus.filter(g => g.status === 'Complete').length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {groupsWithStatus.filter(g => g.status === 'Complete').length === 0 ? (
                      <div className="border border-dashed border-emerald-500/10 dark:border-emerald-500/5 rounded-xl p-6 text-center text-xs text-slate-450 dark:text-slate-500">
                        No completed phases
                      </div>
                    ) : (
                      groupsWithStatus.filter(g => g.status === 'Complete').map(g => renderGroupCard(g))
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Email Preview Modal */}
      {emailModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151619]/60 backdrop-blur-sm p-4" onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}>
          <div
            className={`bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
              emailModal.mode === 'whatsapp' ? 'max-w-4xl' : 'max-w-5xl'
            }`}
            onClick={e => e.stopPropagation()}
          >
            {emailModal.isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-4 text-slate-400">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-blue-500"></i>
                <p className="text-sm font-medium">Loading preview…</p>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-border-dark bg-white dark:bg-card-dark">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      emailModal.mode === 'whatsapp' 
                        ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-605 dark:text-emerald-400'
                        : 'bg-blue-100 dark:bg-background-dark/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      <i className={emailModal.mode === 'whatsapp' ? 'fa-brands fa-whatsapp text-lg' : 'fa-solid fa-envelope-open-text'}></i>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {emailModal.mode === 'whatsapp' ? 'WhatsApp Notification Preview' : 'Email Preview'}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {emailModal.mode === 'whatsapp' 
                          ? `Review WhatsApp message details for ${emailModal.customerName}`
                          : `Review and edit before sending to ${emailModal.customerName}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-background-dark transition-all"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                {emailModal.mode === 'whatsapp' ? (
                  /* WhatsApp Only Preview Layout */
                  <div className="p-6 flex flex-col md:flex-row gap-6 overflow-y-auto max-h-[75vh]">
                    {/* Left Column - Controls */}
                    <div className="w-full md:w-[320px] flex flex-col gap-4 shrink-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
                          <i className="fa-brands fa-whatsapp mr-1"></i> Job #{emailModal.jobId}
                        </span>
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 dark:bg-[#18181b] text-slate-600 dark:text-slate-300">
                          <i className="fa-solid fa-gear mr-1"></i> {emailModal.phaseName}
                        </span>
                      </div>

                      <div className="flex flex-col gap-4 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#18181b]/50">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                            Notification Template
                          </label>
                          <select
                            value={emailModal.whatsappTemplate}
                            onChange={(e) => setEmailModal(prev => ({ 
                              ...prev, 
                              whatsappTemplate: e.target.value as any
                            }))}
                            className="w-full px-3 py-2 rounded-lg border text-xs outline-none transition-all bg-white dark:bg-[#18181b] border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                          >
                            {waTemplates.length > 0 ? (
                              waTemplates.map((t: any) => (
                                <option key={t.id || t.name} value={t.name}>
                                  {t.name}
                                </option>
                              ))
                            ) : (
                              <>
                                <option value="Phase-Complete">Phase-Complete (Standard)</option>
                                <option value="Phase-Complete-Payment">Phase-Complete-Payment (Payment)</option>
                              </>
                            )}
                          </select>
                        </div>

                        {(() => {
                          const selectedTemplateObj = waTemplates.find(t => t.name === emailModal.whatsappTemplate);
                          const templateTextCombined = selectedTemplateObj 
                            ? `${selectedTemplateObj.header || ''} ${selectedTemplateObj.body || ''} ${selectedTemplateObj.footer || ''}`.toLowerCase()
                            : '';
                          const hasOutstandingVar = templateTextCombined.includes('{{outstanding}}') || emailModal.whatsappTemplate === 'Phase-Complete-Payment';
                          const hasDateVar = templateTextCombined.includes('{{date}}');
                          const hasTxtVar = templateTextCombined.includes('{{txt}}');
                          return (
                            <>
                              {hasOutstandingVar && (
                                <div className="flex flex-col gap-1.5 animate-in fade-in duration-200">
                                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                    Payment Amount (₹)
                                  </label>
                                  <input
                                    type="number"
                                    value={emailModal.paymentAmount}
                                    onChange={(e) => setEmailModal(prev => ({ ...prev, paymentAmount: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border text-xs outline-none transition-all bg-white dark:bg-[#18181b] border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                                    placeholder="Enter payment amount"
                                  />
                                </div>
                              )}
                              {hasDateVar && (
                                <div className="flex flex-col gap-1.5 animate-in fade-in duration-200">
                                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                    Date (date)
                                  </label>
                                  <input
                                    type="text"
                                    value={emailModal.customDate}
                                    onChange={(e) => setEmailModal(prev => ({ ...prev, customDate: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border text-xs outline-none transition-all bg-white dark:bg-[#18181b] border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                                    placeholder="e.g. 05-07-2026 or Friday"
                                  />
                                </div>
                              )}
                              {hasTxtVar && (
                                <div className="flex flex-col gap-1.5 animate-in fade-in duration-200">
                                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                                    Custom Text (txt)
                                  </label>
                                  <input
                                    type="text"
                                    value={emailModal.customTxt}
                                    onChange={(e) => setEmailModal(prev => ({ ...prev, customTxt: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border text-xs outline-none transition-all bg-white dark:bg-[#18181b] border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                                    placeholder="Enter custom text for template"
                                  />
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Right Column - Chat Preview & Actions */}
                    <div className="flex-1 flex flex-col gap-5 justify-between min-h-[380px] md:min-h-0">
                      <div className={`rounded-xl shadow-sm border p-4 flex flex-col gap-3 ${
                        isDark ? 'bg-zinc-950/40 border-zinc-800' : 'bg-slate-100 border-slate-200'
                      }`} style={{
                        backgroundImage: isDark 
                          ? 'radial-gradient(circle, rgba(16,185,129,0.03) 1px, transparent 1px)' 
                          : 'radial-gradient(circle, rgba(16,185,129,0.08) 1px, transparent 1px)',
                        backgroundSize: '16px 16px'
                      }}>
                        {/* Simulated WhatsApp chat header */}
                        <div className="flex items-center gap-2 pb-3 mb-1 border-b border-slate-200 dark:border-zinc-800/80">
                          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 text-xs font-bold">
                            SE
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-zinc-100 m-0">Satguru Engineers</p>
                            <p className="text-[9px] text-emerald-500 font-semibold uppercase tracking-wider m-0">Official Business Account</p>
                          </div>
                        </div>

                        {/* Chat bubble */}
                        <div className="flex items-start">
                          {(() => {
                            const waMsg = getWhatsAppPreviewText();
                            return (
                              <div className={`p-3.5 rounded-2xl max-w-[88%] text-xs shadow-sm relative leading-relaxed whitespace-pre-wrap ${
                                isDark 
                                  ? 'bg-[#054735] text-zinc-100 border border-[#0d5c47] rounded-tl-none' 
                                  : 'bg-[#d9fdd3] text-slate-800 rounded-tl-none'
                              }`}>
                                <p className="font-extrabold text-emerald-600 dark:text-emerald-350 mb-1">{waMsg.header}</p>
                                <p className="font-medium">{waMsg.body}</p>
                                <p className="text-[10px] text-slate-400 dark:text-emerald-450/60 mt-2 italic pt-1.5 border-t border-emerald-500/10">{waMsg.footer}</p>
                                <div className="text-[8px] text-slate-450 dark:text-emerald-450/45 absolute bottom-1 right-2 flex items-center gap-0.5 select-none font-bold">
                                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  <i className="fa-solid fa-check-double text-sky-400"></i>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-border-dark mt-auto">
                        <button
                          type="button"
                          onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                          className="px-5 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-background-dark rounded-xl transition-all cursor-pointer border-0 bg-transparent"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => emailModal.isRetry ? handleSendWhatsAppCompleted() : handleDirectComplete(emailModal.phaseId!, { sendWhatsApp: true, skipEmail: true })}
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer border-0"
                        >
                          <i className="fa-brands fa-whatsapp text-sm"></i> {emailModal.isRetry ? 'Send WhatsApp' : 'Send WhatsApp & Complete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
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
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject</label>
                      <input
                        type="text"
                        value={emailModal.subject}
                        onChange={e => setEmailModal(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all bg-white dark:bg-[#18181b] border-slate-200 dark:border-border-dark text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    {/* Greeting */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Greeting</label>
                      <input
                        type="text"
                        value={emailModal.greeting}
                        onChange={e => setEmailModal(prev => ({ ...prev, greeting: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all bg-white dark:bg-[#18181b] border-slate-200 dark:border-border-dark text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    {/* Message Body */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Message</label>
                      <textarea
                        value={emailModal.message}
                        onChange={e => setEmailModal(prev => ({ ...prev, message: e.target.value }))}
                        rows={6}
                        className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all resize-none leading-relaxed bg-white dark:bg-[#18181b] border-slate-200 dark:border-border-dark text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    {/* Payment Amount */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment Amount (₹)</label>
                      <input
                        type="number"
                        value={emailModal.paymentAmount}
                        onChange={e => setEmailModal(prev => ({ ...prev, paymentAmount: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all bg-white dark:bg-[#18181b] border-slate-200 dark:border-border-dark text-slate-800 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>

                  {/* Right: Live Preview */}
                  <div className="flex-1 p-5 bg-slate-50 dark:bg-background-dark/20 animate-in fade-in duration-200 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live Preview</label>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 bg-white">
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
                      <div className="bg-slate-50 px-5 py-2.5 text-center border-t border-slate-100">
                        <p className="text-[10px] text-slate-400">&copy; {new Date().getFullYear()} Satguru Engineers.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-card-dark rounded-b-2xl">
                  <button
                    type="button"
                    onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                    className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-background-dark rounded-xl transition-all cursor-pointer border-0 bg-transparent font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => emailModal.isRetry ? handleResendEmail() : handleConfirmComplete(false)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer border-0 font-bold"
                  >
                    {emailModal.isRetry ? (
                      <><i className="fa-solid fa-paper-plane"></i> Resend Notification</>
                    ) : (
                      <><i className="fa-solid fa-circle-check"></i> Send Email & Complete</>
                    )}
                  </button>
                </div>
              </>
            )}
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
                          <div key={log.size} className="bg-slate-50 dark:bg-background-dark/40 border border-slate-100 dark:border-slate-800/60 p-3 rounded-xl flex flex-col items-center">
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
                        <div className="bg-slate-50 dark:bg-background-dark/40 border border-slate-100 dark:border-slate-800/60 p-3 rounded-xl flex justify-between items-center max-w-sm">
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
                          <div key={type} className="bg-slate-50 dark:bg-background-dark/40 border border-slate-100 dark:border-slate-800/60 p-3 rounded-xl flex justify-between items-center capitalize">
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
                          <div key={log.id} className="bg-slate-50 dark:bg-background-dark/40 border border-slate-100 dark:border-slate-800/60 p-3 rounded-xl flex justify-between items-center">
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
                          <div key={item.description} className="bg-slate-50 dark:bg-background-dark/40 border border-slate-100 dark:border-slate-800/60 p-3 rounded-xl flex justify-between items-center">
                            <span className="text-xs font-semibold">{item.description}</span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#18181b] px-2 py-0.5 rounded-md font-bold">Qty: {item.qty}</span>
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
                className="px-5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
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
