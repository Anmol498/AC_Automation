import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AppContext';
import { APP_NAME, API_BASE_URL } from '../constants';

interface LoginProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Login: React.FC<LoginProps> = ({ isOpen = true, onClose }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const isModal = Boolean(onClose);
  const isDark = (() => {
    const saved = localStorage.getItem('dashboard-theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  })();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('satguru_remember_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      } else {
        setEmail('');
        setRememberMe(false);
      }
      setPassword('');
      setError('');
      setShowPassword(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email: email.trim(),
        password
      }, {
        withCredentials: true
      });

      if (rememberMe) {
        localStorage.setItem('satguru_remember_email', email.trim());
      } else {
        localStorage.removeItem('satguru_remember_email');
      }

      const data = response.data;
      login(data.user, data.token);
      onClose?.();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError(`Connection Error: Unable to reach the server at ${API_BASE_URL}. Ensure your Node.js backend is running.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const shell = isModal
    ? 'fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm'
    : `min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#151619] text-white' : 'bg-slate-50 text-slate-900'}`;

  const card = isModal
    ? isDark
      ? 'border border-[#2a2e36] bg-[#1a1c20] text-white'
      : 'border border-slate-100 bg-white text-slate-900'
    : isDark
      ? 'border border-[#2a2e36] bg-[#1a1c20] text-white'
      : 'border border-slate-100 bg-white text-slate-900';

  const headerBg = 'bg-[linear-gradient(180deg,#091328_0%,#11162c_100%)] text-white';
  const labelTone = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputTone = isDark
    ? 'border-[#2b3038] bg-[#111318] text-slate-100 placeholder:text-slate-500 focus:border-[#246BFF] focus:ring-[#246BFF]/10'
    : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/10';
  const iconTone = isDark ? 'text-slate-500 group-focus-within:text-[#246BFF]' : 'text-slate-300 group-focus-within:text-blue-500';
  const rememberTone = isDark ? 'text-slate-300' : 'text-slate-600';
  const closeTone = isDark
    ? 'bg-white/10 text-white/75 hover:bg-white/15 hover:text-white'
    : 'bg-black/20 text-white/75 hover:bg-black/35 hover:text-white';

  const content = (
    <div className={isModal ? 'absolute inset-0' : 'absolute inset-0'} onClick={() => onClose?.()}></div>
  );

  const form = (
    <div className={`relative z-10 w-full max-w-md overflow-hidden rounded-3xl shadow-2xl ${card}`} style={{ colorScheme: isDark ? 'dark' : 'light' }}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={`absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${closeTone}`}
          title="Close"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>
      )}

      <div className={`relative p-8 text-center ${headerBg}`}>
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <i className="fa-solid fa-snowflake text-6xl rotate-12"></i>
        </div>
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-white/20 bg-white p-2 shadow-xl shadow-black/10">
          <img src="/logo.png" alt={`${APP_NAME} Logo`} className="h-full w-full object-contain" />
        </div>
        <h2 className="text-xl font-normal uppercase tracking-tight" style={{ fontFamily: "'Open Sans', sans-serif" }}>{APP_NAME}</h2>
        <p className="mt-1.5 text-sm font-medium text-blue-100/80">Service & Installation Portal</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-8">
        {error && (
          <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-red-500/20 bg-red-500/10 text-red-100' : 'border-red-100 bg-red-50 text-red-600'}`}>
            <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className={`ml-1 block text-[10px] font-bold uppercase tracking-wider ${labelTone}`}>Email Address</label>
            <div className="relative group">
              <i className={`fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${iconTone}`}></i>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className={`w-full rounded-xl border py-3.5 pl-11 pr-10 outline-none transition-all focus:ring-4 ${inputTone}`}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={`ml-1 block text-[10px] font-bold uppercase tracking-wider ${labelTone}`}>Secure Password</label>
            <div className="relative group">
              <i className={`fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${iconTone}`}></i>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={`w-full rounded-xl border py-3.5 pl-11 pr-12 outline-none transition-all focus:ring-4 ${inputTone}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors focus:outline-none ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className={`h-4 w-4 rounded focus:ring-offset-0 focus:ring-2 cursor-pointer ${isDark ? 'border-slate-500 text-[#246BFF] focus:ring-[#246BFF]' : 'border-slate-300 text-blue-600 focus:ring-blue-500'}`}
            />
            <span className={`text-sm font-medium ${rememberTone}`}>Remember me</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#246BFF] font-bold text-white shadow-lg shadow-[#246BFF]/20 transition-all hover:bg-[#1f5fe0] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <i className="fa-solid fa-arrow-right text-xs opacity-50"></i>
            </>
          )}
        </button>

        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <i className="fa-solid fa-house"></i>
            <span>Back to Home</span>
          </button>
        </div>
      </form>
    </div>
  );

  if (isModal) {
    return (
      <div className={shell}>
        <div className="absolute inset-0" onClick={() => onClose?.()}></div>
        {form}
      </div>
    );
  }

  return <div className={shell}>{form}</div>;
};

export default Login;
