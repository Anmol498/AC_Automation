import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useSettings } from '../context/AppContext';
import { UserRole } from '../types';
import UserManagement from './UserManagement';
import { useOutletContext } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { toast } from 'sonner';
import { api } from '../lib/api';

const Settings: React.FC = () => {
    const { token, user } = useAuth();
    const { isDark = false, toggleTheme } = useOutletContext<{ isDark?: boolean; toggleTheme?: () => void }>() || {};
    const { 
        enableLowStockAlert, 
        lowStockThreshold, 
        copperPipeLowStockThreshold,
        enableCopperPipeLowStockAlert,
        requireEmailPreview, 
        mailTransport, 
        companyPhone, 
        companyEmail, 
        setEnableLowStockAlert, 
        setLowStockThreshold, 
        setCopperPipeLowStockThreshold,
        setEnableCopperPipeLowStockAlert,
        setRequireEmailPreview, 
        setMailTransport, 
        setCompanyPhone, 
        setCompanyEmail 
    } = useSettings();

    // Inventory & App Settings State
    const [tempThreshold, setTempThreshold] = useState(lowStockThreshold);
    const [tempEnable, setTempEnable] = useState(enableLowStockAlert);
    const [tempCopperThreshold, setTempCopperThreshold] = useState(copperPipeLowStockThreshold);
    const [tempCopperEnable, setTempCopperEnable] = useState(enableCopperPipeLowStockAlert);
    const [tempEmailPreview, setTempEmailPreview] = useState(requireEmailPreview || false);
    const [tempMailTransport, setTempMailTransport] = useState<'smtp' | 'google_oauth'>(mailTransport);
    const [tempCompanyPhone, setTempCompanyPhone] = useState(companyPhone);
    const [tempCompanyEmail, setTempCompanyEmail] = useState(companyEmail);
    const [appSettingsMessage, setAppSettingsMessage] = useState({ text: '', type: '' });

    // Synchronization on Load / Settings Update
    useEffect(() => {
        setTempThreshold(lowStockThreshold);
        setTempEnable(enableLowStockAlert);
        setTempCopperThreshold(copperPipeLowStockThreshold);
        setTempCopperEnable(enableCopperPipeLowStockAlert);
        setTempEmailPreview(requireEmailPreview);
        setTempMailTransport(mailTransport);
        setTempCompanyPhone(companyPhone);
        setTempCompanyEmail(companyEmail);
    }, [lowStockThreshold, enableLowStockAlert, copperPipeLowStockThreshold, enableCopperPipeLowStockAlert, requireEmailPreview, mailTransport, companyPhone, companyEmail]);

    // Password Settings State
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });

    // Audit Log Cleanup State
    const [cleanupDays, setCleanupDaysState] = useState(() => Number(localStorage.getItem('cleanupDays') || '30'));
    const setCleanupDays = (val: number) => {
        setCleanupDaysState(val);
        localStorage.setItem('cleanupDays', val.toString());
    };
    const [isCleaningLogs, setIsCleaningLogs] = useState(false);
    
    // Hold to Clear Logs mechanism
    const [isHolding, setIsHolding] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const holdIntervalRef = useRef<number | null>(null);

    const startHold = () => {
        if (isCleaningLogs) return;
        setIsHolding(true);
        setHoldProgress(0);
        const startTime = Date.now();
        const duration = 1500; // 1.5s hold time

        holdIntervalRef.current = window.setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / duration) * 100, 100);
            setHoldProgress(progress);
            if (progress >= 100) {
                // Trigger action and stop holding
                if (holdIntervalRef.current) {
                    clearInterval(holdIntervalRef.current);
                    holdIntervalRef.current = null;
                }
                setIsHolding(false);
                setHoldProgress(0);
                handleClearLogs();
            }
        }, 30);
    };

    const endHold = () => {
        if (holdIntervalRef.current) {
            clearInterval(holdIntervalRef.current);
            holdIntervalRef.current = null;
        }
        setIsHolding(false);
        setHoldProgress(0);
    };

    // Clean up interval on unmount
    useEffect(() => {
        return () => {
            if (holdIntervalRef.current) {
                clearInterval(holdIntervalRef.current);
            }
        };
    }, []);

    const saveSingleSetting = async (key: string, value: any) => {
        if (key === 'enableLowStockAlert') {
            setEnableLowStockAlert(value);
        } else if (key === 'lowStockThreshold') {
            setLowStockThreshold(value);
        } else if (key === 'enableCopperPipeLowStockAlert') {
            setEnableCopperPipeLowStockAlert(value);
        } else if (key === 'copperPipeLowStockThreshold') {
            setCopperPipeLowStockThreshold(value);
        }

        if (user?.role === UserRole.SUPER_ADMIN) {
            try {
                await api.put('/settings', { [key]: value });
                toast.success('Preference updated and synced with server.');
            } catch (err) {
                console.error(`Failed to save setting ${key} to backend:`, err);
                toast.error('Failed to sync setting to server.');
            }
        } else {
            toast.success('Preference updated locally.');
        }
    };

    const handleSaveAppSettings = async () => {
        setLowStockThreshold(tempThreshold);
        setEnableLowStockAlert(tempEnable);
        setCopperPipeLowStockThreshold(tempCopperThreshold);
        setEnableCopperPipeLowStockAlert(tempCopperEnable);
        if (user?.role === UserRole.SUPER_ADMIN) {
            setRequireEmailPreview(tempEmailPreview);
            setMailTransport(tempMailTransport);
            setCompanyPhone(tempCompanyPhone);
            setCompanyEmail(tempCompanyEmail);
            
            // Persist to backend
            try {
                await api.put('/settings', { 
                    mail_transport: tempMailTransport,
                    company_phone: tempCompanyPhone,
                    company_email: tempCompanyEmail,
                    copperPipeLowStockThreshold: tempCopperThreshold,
                    enableCopperPipeLowStockAlert: tempCopperEnable,
                    lowStockThreshold: tempThreshold,
                    enableLowStockAlert: tempEnable,
                    requireEmailPreview: tempEmailPreview
                });
            } catch (err) {
                console.error("Failed to save settings to backend:", err);
            }
        }
        setAppSettingsMessage({ text: 'Application settings saved successfully.', type: 'success' });
        setTimeout(() => setAppSettingsMessage({ text: '', type: '' }), 3000);
    };

    const handleClearLogs = async () => {
        setIsCleaningLogs(true);
        try {
            await api.delete(`/settings/cleanup-audit-logs?days=${cleanupDays}`);
            toast.success(`Successfully cleared older logs, keeping only the last ${cleanupDays} days.`);
        } catch (err: any) {
            console.error("Failed to clear audit logs:", err);
            toast.error(err.message || "Failed to clear audit logs.");
        } finally {
            setIsCleaningLogs(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage({ text: '', type: '' });

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ text: 'New passwords do not match.', type: 'error' });
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            setPasswordMessage({ 
                text: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#).', 
                type: 'error' 
            });
            return;
        }

        setIsSubmittingPassword(true);
        try {
            await api.put('/auth/change-password', { currentPassword, newPassword });
            setPasswordMessage({ text: 'Password changed successfully.', type: 'success' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setPasswordMessage({ text: err.message || 'Failed to change password.', type: 'error' });
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-zinc-50' : 'text-slate-900'}`}>Settings</h1>
                        {user?.role && (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm flex-shrink-0 ${
                                user.role === UserRole.SUPER_ADMIN 
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800' 
                                    : user.role === UserRole.TECHNICIAN 
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' 
                                        : 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                            }`}>
                                {user.role}
                                {user.role === UserRole.TECHNICIAN && ` • ID: ${user.id}`}
                            </span>
                        )}
                    </div>
                    <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Manage your account, application preferences, and company info.</p>
                </div>
                <button
                    onClick={() => setIsSecurityModalOpen(true)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all ${
                        isDark 
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700' 
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                >
                    <i className="fa-solid fa-shield-halved text-xs"></i>
                    Security Settings
                </button>
            </div>

            {/* Admin Team Management */}
            {user?.role === UserRole.SUPER_ADMIN && (
                <div className="space-y-6">
                    <UserManagement inSettingsView={true} />
                </div>
            )}

            {/* App Preferences */}
            <div className="flex items-center gap-3 mb-6 pt-4">
                <div className="bg-emerald-150 text-emerald-600 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-gears text-lg"></i>
                </div>
                <h2 className={`text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-slate-850'}`}>App Preferences</h2>
            </div>

            {/* Preferences Grid */}
            <div className={`grid grid-cols-1 ${user?.role === UserRole.TECHNICIAN ? 'max-w-xl' : 'md:grid-cols-3'} gap-6`}>
                {user?.role !== UserRole.TECHNICIAN && (
                    <>
                        {/* General Stock Alerts */}
                        <div className={`p-6 rounded-3xl border shadow-sm ${
                            isDark ? 'bg-[var(--color-card-dark)] border-[var(--color-border-dark)]' : 'bg-white border-slate-200'
                        }`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2.5">
                                    <i className="fa-solid fa-boxes-stacked text-blue-500 text-base"></i>
                                    <h3 className={`font-bold text-sm ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>General Stock Alerts</h3>
                                </div>
                                <label className="relative flex items-center cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={tempEnable}
                                        onChange={(e) => {
                                            const val = e.target.checked;
                                            setTempEnable(val);
                                            saveSingleSetting('enableLowStockAlert', val);
                                        }}
                                    />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${tempEnable ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${tempEnable ? 'transform translate-x-4' : ''}`}></div>
                                </label>
                            </div>

                            <div className="space-y-4">
                                <div className={`transition-opacity ${tempEnable ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Low Stock Threshold</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className={`w-full max-w-[200px] rounded-xl px-4 py-2.5 text-sm font-bold outline-none border focus:ring-4 transition-all ${
                                            isDark 
                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-blue-500/10 focus:border-blue-500' 
                                                : 'bg-white border-slate-200 text-slate-800 focus:ring-blue-500/10 focus:border-blue-500'
                                        }`}
                                        value={tempThreshold}
                                        onChange={(e) => setTempThreshold(parseInt(e.target.value) || 0)}
                                        onBlur={(e) => saveSingleSetting('lowStockThreshold', parseInt(e.target.value) || 0)}
                                        disabled={!tempEnable}
                                    />
                                </div>
                                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Trigger alerts when available stock drops to or below this quantity.</p>
                            </div>
                        </div>

                        {/* Copper Pipe Alerts */}
                        <div className={`p-6 rounded-3xl border shadow-sm ${
                            isDark ? 'bg-[var(--color-card-dark)] border-[var(--color-border-dark)]' : 'bg-white border-slate-200'
                        }`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2.5">
                                    <i className="fa-solid fa-toolbox text-orange-500 text-base"></i>
                                    <h3 className={`font-bold text-sm ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>Copper Pipe Alerts</h3>
                                </div>
                                <label className="relative flex items-center cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={tempCopperEnable}
                                        onChange={(e) => {
                                            const val = e.target.checked;
                                            setTempCopperEnable(val);
                                            saveSingleSetting('enableCopperPipeLowStockAlert', val);
                                        }}
                                    />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${tempCopperEnable ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${tempCopperEnable ? 'transform translate-x-4' : ''}`}></div>
                                </label>
                            </div>

                            <div className="space-y-4">
                                <div className={`transition-opacity ${tempCopperEnable ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Low Stock Threshold</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className={`w-full max-w-[200px] rounded-xl px-4 py-2.5 text-sm font-bold outline-none border focus:ring-4 transition-all ${
                                            isDark 
                                                ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-blue-500/10 focus:border-blue-500' 
                                                : 'bg-white border-slate-200 text-slate-800 focus:ring-blue-500/10 focus:border-blue-500'
                                        }`}
                                        value={tempCopperThreshold}
                                        onChange={(e) => setTempCopperThreshold(parseInt(e.target.value) || 0)}
                                        onBlur={(e) => saveSingleSetting('copperPipeLowStockThreshold', parseInt(e.target.value) || 0)}
                                        disabled={!tempCopperEnable}
                                    />
                                </div>
                                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Trigger alerts when available copper pipe stock drops to or below this quantity.</p>
                            </div>
                        </div>
                    </>
                )}

                {/* Theme Customization */}
                <div className={`p-6 rounded-3xl border shadow-sm ${
                    isDark ? 'bg-[var(--color-card-dark)] border-[var(--color-border-dark)]' : 'bg-white border-slate-200'
                }`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2.5">
                            <i className={`fa-solid ${isDark ? 'fa-moon text-amber-400' : 'fa-sun text-amber-500'} text-base`}></i>
                            <h3 className={`font-bold text-sm ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>Interface Theme</h3>
                        </div>
                        <label className="relative flex items-center cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={isDark}
                                onChange={toggleTheme}
                            />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${isDark ? 'bg-blue-600' : 'bg-slate-300 dark:bg-zinc-700'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isDark ? 'transform translate-x-4' : ''}`}></div>
                        </label>
                    </div>

                    <div className="space-y-4">
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Switch the application interface to dark theme or light theme.</p>
                    </div>
                </div>
            </div>

            {/* Audit Log Cleanup */}
            {user?.role === UserRole.SUPER_ADMIN && (
                <div className={`p-6 rounded-3xl border shadow-sm ${
                    isDark ? 'bg-[var(--color-card-dark)] border-[var(--color-border-dark)]' : 'bg-white border-slate-200'
                }`}>
                    <div className="flex items-center gap-2.5 mb-2">
                        <i className="fa-solid fa-trash-can text-red-500 text-base"></i>
                        <h3 className={`font-bold text-sm ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>Audit Log Cleanup</h3>
                    </div>
                    <p className={`text-xs mb-5 ${isDark ? 'text-zinc-455' : 'text-slate-500'}`}>
                        Clear old stock corrections, additions, sales history, and copper pipe warehouse logs to free up storage space. This action cannot be undone.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 max-w-2xl">
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2.5">
                            <label className={`text-xs font-bold uppercase shrink-0 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Keep last</label>
                            <CustomSelect
                                value={cleanupDays}
                                onChange={val => setCleanupDays(Number(val))}
                                options={[
                                    { value: 30, label: '30 Days (1 Month)' },
                                    { value: 90, label: '90 Days (3 Months)' },
                                    { value: 180, label: '180 Days (6 Months)' },
                                    { value: 365, label: '365 Days (1 Year)' }
                                ]}
                                isDark={isDark}
                                className="w-full sm:w-60"
                            />
                            <span className={`text-xs font-bold uppercase shrink-0 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>logs and delete rest</span>
                        </div>
                        <button
                            onMouseDown={startHold}
                            onMouseUp={endHold}
                            onMouseLeave={endHold}
                            onTouchStart={startHold}
                            onTouchEnd={endHold}
                            disabled={isCleaningLogs}
                            style={{
                                background: isHolding
                                    ? `linear-gradient(90deg, rgba(239, 68, 68, 0.25) ${holdProgress}%, transparent ${holdProgress}%)`
                                    : isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.02)',
                                userSelect: 'none'
                            }}
                            className={`px-8 py-2.5 border border-dashed border-red-500 hover:border-red-600 disabled:opacity-50 text-red-500 hover:text-red-600 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 select-none outline-none`}
                        >
                            {isCleaningLogs ? (
                                <><i className="fa-solid fa-spinner fa-spin"></i> Cleaning...</>
                            ) : isHolding ? (
                                <><i className="fa-solid fa-trash-can text-xs animate-bounce"></i> Holding...</>
                            ) : (
                                <><i className="fa-solid fa-trash-can text-xs"></i> Clear Logs</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Contact Us Settings */}
            {user?.role === UserRole.SUPER_ADMIN && (
                <div className={`p-6 rounded-3xl border shadow-sm ${
                    isDark ? 'bg-[var(--color-card-dark)] border-[var(--color-border-dark)]' : 'bg-white border-slate-200'
                }`}>
                    <div className="flex items-center gap-2.5 mb-6">
                        <i className="fa-solid fa-address-book text-blue-500 text-base"></i>
                        <h3 className={`font-bold text-sm ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>Contact Us Settings</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className={`text-sm font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Require Email Preview</label>
                                <label className="relative flex items-center cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={tempEmailPreview}
                                        onChange={(e) => setTempEmailPreview(e.target.checked)}
                                    />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${tempEmailPreview ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${tempEmailPreview ? 'transform translate-x-4' : ''}`}></div>
                                </label>
                            </div>
                            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Always show the email preview modal before sending phase completion emails.</p>

                            <div className="pt-4">
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Email Transport Method</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setTempMailTransport('smtp')}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                                            tempMailTransport === 'smtp' 
                                                ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/20 dark:text-blue-400' 
                                                : isDark 
                                                    ? 'border-zinc-800 bg-zinc-900/60 text-zinc-500' 
                                                    : 'border-slate-100 bg-slate-50 text-slate-500'
                                        }`}
                                    >
                                        <i className="fa-solid fa-server text-xs"></i>
                                        SMTP
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTempMailTransport('google_oauth')}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer ${
                                            tempMailTransport === 'google_oauth' 
                                                ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/20 dark:text-blue-400' 
                                                : isDark 
                                                    ? 'border-zinc-800 bg-zinc-900/60 text-zinc-500' 
                                                    : 'border-slate-100 bg-slate-50 text-slate-500'
                                        }`}
                                    >
                                        <i className="fa-brands fa-google text-xs"></i>
                                        Gmail OAuth
                                    </button>
                                </div>
                                <p className={`text-xs mt-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Choose the primary method for sending automated emails.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Company Phone Number</label>
                                <input
                                    type="text"
                                    className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none border focus:ring-4 transition-all ${
                                        isDark 
                                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-blue-500/10 focus:border-blue-500' 
                                            : 'bg-white border-slate-200 text-slate-800 focus:ring-blue-500/10 focus:border-blue-500'
                                    }`}
                                    value={tempCompanyPhone}
                                    onChange={(e) => setTempCompanyPhone(e.target.value)}
                                    placeholder="e.g. 95922 92292"
                                />
                            </div>

                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Company Email Address</label>
                                <input
                                    type="email"
                                    className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none border focus:ring-4 transition-all ${
                                        isDark 
                                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-blue-500/10 focus:border-blue-500' 
                                            : 'bg-white border-slate-200 text-slate-800 focus:ring-blue-500/10 focus:border-blue-500'
                                    }`}
                                    value={tempCompanyEmail}
                                    onChange={(e) => setTempCompanyEmail(e.target.value)}
                                    placeholder="e.g. contact@example.com"
                                />
                            </div>
                            <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>These details will be displayed publicly on the Home Page, Products Page, and Contact Us page.</p>
                        </div>
                    </div>

                    {/* Messages & Actions Inside Contact Card */}
                    <div className={`pt-6 border-t flex flex-col sm:flex-row items-center gap-4 ${
                        isDark ? 'border-zinc-850' : 'border-slate-100'
                    }`}>
                        <button
                            onClick={handleSaveAppSettings}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                        >
                            Save Settings
                        </button>
                        {appSettingsMessage.text && (
                            <span className={`text-sm font-semibold ${
                                appSettingsMessage.type === 'success' ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                                <i className={`fa-solid ${appSettingsMessage.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} mr-1.5`}></i>
                                {appSettingsMessage.text}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Security modal */}
            {isSecurityModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className={`rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border animate-in fade-in zoom-in duration-300 ${
                        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'
                    }`}>
                        <div className={`p-6 border-b flex items-center justify-between ${
                            isDark ? 'border-zinc-800 bg-zinc-950/20' : 'border-slate-100 bg-slate-50/50'
                        }`}>
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                                    <i className="fa-solid fa-shield-halved text-lg"></i>
                                </div>
                                <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>Security Settings</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setIsSecurityModalOpen(false);
                                    setPasswordMessage({ text: '', type: '' });
                                }}
                                className={`transition-colors rounded-lg p-2 ${isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'}`}
                            >
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        
                        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                            {passwordMessage.text && (
                                <div className={`p-3 rounded-xl text-sm font-medium ${
                                    passwordMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                    <i className={`fa-solid ${passwordMessage.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'} mr-2`}></i>
                                    {passwordMessage.text}
                                </div>
                            )}

                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Current Password</label>
                                <input
                                    type="password"
                                    required
                                    className={`w-full rounded-xl px-4 py-3 text-sm outline-none border focus:ring-4 transition-all ${
                                        isDark 
                                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-blue-500/10 focus:border-blue-500' 
                                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/10 focus:border-blue-500'
                                    }`}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>New Password</label>
                                <input
                                    type="password"
                                    required
                                    className={`w-full rounded-xl px-4 py-3 text-sm outline-none border focus:ring-4 transition-all ${
                                        isDark 
                                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-blue-500/10 focus:border-blue-500' 
                                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/10 focus:border-blue-500'
                                    }`}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    className={`w-full rounded-xl px-4 py-3 text-sm outline-none border focus:ring-4 transition-all ${
                                        isDark 
                                            ? 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:ring-blue-500/10 focus:border-blue-500' 
                                            : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500/10 focus:border-blue-500'
                                    }`}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setIsSecurityModalOpen(false);
                                        setPasswordMessage({ text: '', type: '' });
                                    }} 
                                    className={`flex-1 py-3.5 px-4 font-bold rounded-2xl transition-all ${
                                        isDark ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-650'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmittingPassword}
                                    className="flex-[1.5] py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    {isSubmittingPassword ? (
                                        <><i className="fa-solid fa-spinner fa-spin"></i> Updating...</>
                                    ) : (
                                        <><i className="fa-solid fa-key text-xs"></i> Update Password</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
