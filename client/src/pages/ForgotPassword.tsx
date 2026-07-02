import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { APP_NAME } from '../constants';
import { toast } from 'sonner';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const isDark = (() => {
    const saved = localStorage.getItem('dashboard-theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  })();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState<'email' | 'whatsapp'>('email');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneEnding, setPhoneEnding] = useState<string | null>(null);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api.get('/config');
        if (data.whatsapp_enabled !== undefined) {
          setWhatsappEnabled(data.whatsapp_enabled === true || data.whatsapp_enabled === 'true');
        }
      } catch (err) {
        console.error("Failed to fetch public config:", err);
      }
    };
    fetchConfig();
  }, []);

  // Password complexity checks
  const hasMinLength = newPassword.length >= 1;
  const passwordsMatch = newPassword === confirmPassword && newPassword !== '';

  const isPasswordValid = hasMinLength;

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await api.post('/auth/forgot-password/request', {
        email: email.trim(),
        method
      });
      setPhoneEnding(data.phoneEnding || null);
      toast.success(`OTP code sent via ${method === 'email' ? 'Email' : 'WhatsApp'}!`);
      setStep(2);
    } catch (err: any) {
      console.error('Request OTP error:', err);
      setError(err.message || 'Failed to send OTP code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await api.post('/auth/forgot-password/verify', {
        email: email.trim(),
        otp: otp.trim()
      });
      setResetToken(data.resetToken);
      toast.success('OTP verified successfully!');
      setStep(3);
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password does not meet the complexity requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password/reset', {
        email: email.trim(),
        resetToken,
        newPassword
      });
      toast.success('Password updated successfully! Please log in with your new password.');
      navigate('/login');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to update password. Please restart the process.');
    } finally {
      setIsLoading(false);
    }
  };

  const shell = `min-h-screen flex items-center justify-center p-4 ${isDark ? 'dark bg-[#151619] text-white' : 'bg-slate-50 text-slate-900'}`;
  const card = isDark
    ? 'border border-[#2a2e36] bg-[#1a1c20] text-white'
    : 'border border-slate-100 bg-white text-slate-900';
  const labelTone = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputTone = isDark
    ? 'border-[#2b3038] bg-[#111318] text-slate-100 placeholder:text-slate-500 focus:border-[#246BFF] focus:ring-[#246BFF]/10'
    : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/10';
  const iconTone = isDark ? 'text-slate-500 group-focus-within:text-[#246BFF]' : 'text-slate-300 group-focus-within:text-blue-500';
  const headerBg = 'bg-[linear-gradient(180deg,#091328_0%,#11162c_100%)] text-white';

  return (
    <div className={shell} style={{ colorScheme: isDark ? 'dark' : 'light' }}>
      <div className={`relative z-10 w-full max-w-md overflow-hidden rounded-3xl shadow-2xl ${card}`}>
        
        {/* Header */}
        <div className={`relative p-8 text-center ${headerBg}`}>
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <i className="fa-solid fa-key text-6xl rotate-12"></i>
          </div>
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-white/20 bg-white p-2 shadow-xl shadow-black/10">
            <img src="/logo.png" alt={`${APP_NAME} Logo`} className="h-full w-full object-contain" />
          </div>
          <h2 className="text-xl font-normal uppercase tracking-tight" style={{ fontFamily: "'Open Sans', sans-serif" }}>{APP_NAME}</h2>
          <p className="mt-1.5 text-sm font-medium text-blue-100/80">Account Recovery Portal</p>
        </div>

        {/* Step indicator */}
        <div className={`flex justify-between px-8 pt-6 ${isDark ? 'text-zinc-600' : 'text-slate-300'}`}>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${step >= 1 ? 'text-[#246BFF]' : ''}`}>
            <span>1. Method</span>
          </div>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${step >= 2 ? 'text-[#246BFF]' : ''}`}>
            <i className="fa-solid fa-chevron-right text-[10px]"></i>
            <span>2. Verify</span>
          </div>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${step >= 3 ? 'text-[#246BFF]' : ''}`}>
            <i className="fa-solid fa-chevron-right text-[10px]"></i>
            <span>3. Reset</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="px-8 pt-4">
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-red-500/20 bg-red-500/10 text-red-100' : 'border-red-100 bg-red-50 text-red-600'}`}>
              <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Step 1: Request OTP */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="space-y-6 p-8">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={`ml-1 block text-[10px] font-bold uppercase tracking-wider ${labelTone}`}>Registered Email</label>
                <div className="relative group">
                  <i className={`fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${iconTone}`}></i>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className={`w-full rounded-xl border py-3.5 pl-11 pr-4 outline-none transition-all focus:ring-4 ${inputTone}`}
                  />
                </div>
              </div>

              {whatsappEnabled && (
                <div className="space-y-3">
                  <label className={`ml-1 block text-[10px] font-bold uppercase tracking-wider ${labelTone}`}>OTP Delivery Channel</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label 
                      onClick={() => setMethod('email')}
                      className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                        method === 'email'
                          ? 'border-blue-500 bg-blue-500/5'
                          : isDark
                            ? 'border-[#2b3038] bg-[#111318] hover:border-zinc-700'
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="relative flex items-center justify-center shrink-0">
                        <input
                          type="radio"
                          name="deliveryMethod"
                          checked={method === 'email'}
                          onChange={() => setMethod('email')}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                          method === 'email' 
                            ? 'border-blue-500' 
                            : isDark ? 'border-zinc-600' : 'border-slate-300'
                        }`}>
                          {method === 'email' && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 scale-in duration-200"></div>
                          )}
                        </div>
                      </div>
                      <i className={`fa-solid fa-envelope text-base ${method === 'email' ? 'text-blue-500' : 'text-slate-400'}`}></i>
                      <span className={`text-xs font-semibold tracking-wide ${
                        method === 'email' 
                          ? (isDark ? 'text-white' : 'text-slate-800') 
                          : (isDark ? 'text-slate-400' : 'text-slate-600')
                      }`}>Email</span>
                    </label>

                    <label 
                      onClick={() => setMethod('whatsapp')}
                      className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                        method === 'whatsapp'
                          ? 'border-emerald-500 bg-emerald-500/5'
                          : isDark
                            ? 'border-[#2b3038] bg-[#111318] hover:border-zinc-700'
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="relative flex items-center justify-center shrink-0">
                        <input
                          type="radio"
                          name="deliveryMethod"
                          checked={method === 'whatsapp'}
                          onChange={() => setMethod('whatsapp')}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                          method === 'whatsapp' 
                            ? 'border-emerald-500' 
                            : isDark ? 'border-zinc-600' : 'border-slate-300'
                        }`}>
                          {method === 'whatsapp' && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 scale-in duration-200"></div>
                          )}
                        </div>
                      </div>
                      <i className={`fa-brands fa-whatsapp text-base ${method === 'whatsapp' ? 'text-emerald-500' : 'text-slate-400'}`}></i>
                      <span className={`text-xs font-semibold tracking-wide ${
                        method === 'whatsapp' 
                          ? (isDark ? 'text-white' : 'text-slate-800') 
                          : (isDark ? 'text-slate-400' : 'text-slate-600')
                      }`}>WhatsApp</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#246BFF] font-bold text-white shadow-lg shadow-[#246BFF]/20 transition-all hover:bg-[#1f5fe0] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Request Verification Code</span>
                  <i className="fa-solid fa-paper-plane text-xs opacity-50"></i>
                </>
              )}
            </button>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className="fa-solid fa-arrow-left"></i>
                <span>Back to Login</span>
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Verify OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-6 p-8">
            <div className="space-y-4">
              <p className={`text-xs font-medium text-center ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                A 6-digit One-Time Password has been sent to your{' '}
                {method === 'whatsapp' ? (
                  <>
                    WhatsApp number {phoneEnding ? <span>ending in <strong className="text-emerald-500">****{phoneEnding}</strong></span> : <strong>registered with this account</strong>}
                  </>
                ) : (
                  <>
                    email address <strong className="text-[#246BFF]">{email}</strong>
                  </>
                )}
                . Enter it below.
              </p>
              
              <div className="space-y-1.5">
                <label className={`ml-1 block text-[10px] font-bold uppercase tracking-wider ${labelTone}`}>6-Digit Code</label>
                <div className="relative group">
                  <i className={`fa-solid fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${iconTone}`}></i>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className={`w-full rounded-xl border py-3.5 pl-11 pr-4 outline-none tracking-[0.25em] text-center font-bold text-lg transition-all focus:ring-4 ${inputTone}`}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#246BFF] font-bold text-white shadow-lg shadow-[#246BFF]/20 transition-all hover:bg-[#1f5fe0] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify & Proceed</span>
                  <i className="fa-solid fa-arrow-right text-xs opacity-50"></i>
                </>
              )}
            </button>

            <div className="flex flex-col items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRequestOTP}
                disabled={isLoading}
                className={`text-xs font-bold uppercase tracking-wider hover:underline transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Resend Code
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  isDark ? 'text-slate-450 hover:text-white' : 'text-slate-400 hover:text-slate-800'
                }`}
              >
                <i className="fa-solid fa-chevron-left"></i>
                <span>Change Method / Email</span>
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Reset Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-6 p-8">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={`ml-1 block text-[10px] font-bold uppercase tracking-wider ${labelTone}`}>New Password</label>
                <div className="relative group">
                  <i className={`fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${iconTone}`}></i>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    className={`w-full rounded-xl border py-3.5 pl-11 pr-12 outline-none transition-all focus:ring-4 ${inputTone}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors focus:outline-none ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fa-solid ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`ml-1 block text-[10px] font-bold uppercase tracking-wider ${labelTone}`}>Confirm New Password</label>
                <div className="relative group">
                  <i className={`fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${iconTone}`}></i>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className={`w-full rounded-xl border py-3.5 pl-11 pr-12 outline-none transition-all focus:ring-4 ${inputTone}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors focus:outline-none ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

            </div>

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid || !passwordsMatch}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <i className="fa-solid fa-check text-xs opacity-50"></i>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;
