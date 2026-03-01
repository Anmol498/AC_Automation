import React, { useState } from 'react';
import axios from 'axios';
import { useAuth, useSettings } from '../App';
import { UserRole } from '../types';
import UserManagement from './UserManagement';

const Settings: React.FC = () => {
    const { token, user } = useAuth();
    const { enableLowStockAlert, lowStockThreshold, setEnableLowStockAlert, setLowStockThreshold } = useSettings();

    // Inventory Settings State
    const [tempThreshold, setTempThreshold] = useState(lowStockThreshold);
    const [tempEnable, setTempEnable] = useState(enableLowStockAlert);
    const [inventoryMessage, setInventoryMessage] = useState({ text: '', type: '' });

    // Password Settings State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });

    const handleSaveInventorySettings = () => {
        setLowStockThreshold(tempThreshold);
        setEnableLowStockAlert(tempEnable);
        setInventoryMessage({ text: 'Inventory settings saved successfully.', type: 'success' });
        setTimeout(() => setInventoryMessage({ text: '', type: '' }), 3000);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage({ text: '', type: '' });

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ text: 'New passwords do not match.', type: 'error' });
            return;
        }

        if (newPassword.length < 6) {
            setPasswordMessage({ text: 'New password must be at least 6 characters.', type: 'error' });
            return;
        }

        setIsSubmittingPassword(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            await axios.put(
                `${apiUrl}/auth/change-password`,
                { currentPassword, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setPasswordMessage({ text: 'Password changed successfully.', type: 'success' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setPasswordMessage({ text: err.response?.data?.error || 'Failed to change password.', type: 'error' });
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage your account and application preferences</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile & Security Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                        <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-shield-halved text-lg"></i>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Security</h2>
                    </div>
                    <div className="p-6">
                        <div className="mb-6 pb-6 border-b border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Account Profile</h3>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-2xl font-bold text-slate-500">
                                    {user?.email[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-lg">{user?.email}</p>
                                    <p className="text-sm text-slate-500 capitalize">{user?.role} Account</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Change Password</h3>

                            {passwordMessage.text && (
                                <div className={`p-3 rounded-xl text-sm font-medium ${passwordMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                    <i className={`fa-solid ${passwordMessage.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'} mr-2`}></i>
                                    {passwordMessage.text}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmittingPassword}
                                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {isSubmittingPassword ? (
                                        <><i className="fa-solid fa-spinner fa-spin"></i> Updating...</>
                                    ) : (
                                        <><i className="fa-solid fa-key"></i> Update Password</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Inventory / App Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                        <div className="bg-emerald-100 text-emerald-600 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                            <i className="fa-solid fa-boxes-stacked text-lg"></i>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Inventory Preferences</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        {inventoryMessage.text && (
                            <div className={`p-3 rounded-xl text-sm font-medium ${inventoryMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                <i className={`fa-solid ${inventoryMessage.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'} mr-2`}></i>
                                {inventoryMessage.text}
                            </div>
                        )}

                        <div>
                            <label className="flex items-center justify-between cursor-pointer mb-2">
                                <span className="text-sm font-bold text-slate-700">Enable Low Stock Alerts</span>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={tempEnable}
                                        onChange={(e) => setTempEnable(e.target.checked)}
                                    />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${tempEnable ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${tempEnable ? 'transform translate-x-4' : ''}`}></div>
                                </div>
                            </label>
                            <p className="text-xs text-slate-500">Show notification badges and alerts when products drop below the threshold.</p>
                        </div>

                        <div className={`transition-opacity ${tempEnable ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Low Stock Threshold</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full max-w-[200px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                                value={tempThreshold}
                                onChange={(e) => setTempThreshold(parseInt(e.target.value) || 0)}
                                disabled={!tempEnable}
                            />
                            <p className="text-xs text-slate-500 mt-2">Trigger alerts when available stock drops to or below this quantity.</p>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <button
                                onClick={handleSaveInventorySettings}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shadow-emerald-500/20"
                            >
                                Save Preferences
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin User Management */}
            {user?.role === UserRole.SUPER_ADMIN && (
                <div className="mt-8 pt-8 border-t border-slate-200">
                    <UserManagement inSettingsView={true} />
                </div>
            )}
        </div>
    );
};

export default Settings;
