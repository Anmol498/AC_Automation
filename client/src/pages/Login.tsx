import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { UserRole } from '../types';
import { APP_NAME, API_BASE_URL } from '../constants';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

      const data = response.data;
      login(data.user, data.token);
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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative">
      <Link to="/" className="absolute top-6 left-6 md:top-8 md:left-8 text-slate-400 hover:text-white transition-colors flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center group-hover:bg-blue-600 transition-colors border border-slate-800">
          <i className="fa-solid fa-arrow-left"></i>
        </div>
        <span className="font-medium hidden sm:block">Back to Catalog</span>
      </Link>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden transition-all duration-500">
        <div className="bg-blue-600 p-8 text-center text-white relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <i className="fa-solid fa-snowflake text-6xl rotate-12"></i>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
            <span className="text-3xl font-black tracking-tighter text-white">SE</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{APP_NAME}</h2>
          <p className="text-blue-100 mt-2 text-sm font-medium">Service & Installation Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-3 animate-shake">
              <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your email"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Secure Password</label>
              <div className="relative group">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-3"
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
        </form>
      </div>
    </div>
  );
};

export default Login;
