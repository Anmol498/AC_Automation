import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { useAuth } from '../context/AppContext';
import { useRealtimeListener } from '../components/RealtimeProvider';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { api } from '../lib/api';

interface UserManagementProps {
  inSettingsView?: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({ inSettingsView = false }) => {
  const { user: currentUser } = useAuth();
  const { isDark = false } = useOutletContext<{ isDark?: boolean }>() || {};
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', role: UserRole.ADMIN, phone: '' });
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isCollapsed, setIsCollapsed] = useState(() => inSettingsView && (typeof window !== 'undefined' ? window.innerWidth < 768 : true));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    api.get('/users')
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch users", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useRealtimeListener('users', fetchUsers);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ email: '', password: '', role: UserRole.ADMIN, phone: '' });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password.length < 1) {
      toast.error('Password cannot be empty.');
      return;
    }

    try {
      await api.post('/users', formData);
      toast.success("User account registered successfully!");
      handleCloseModal();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    }
  };

  const handleDelete = (id: number | string) => {
    const userToDelete = users.find(u => u.id === id);
    toast.error("Revoke access?", {
      description: `Are you sure you want to revoke access for ${userToDelete ? userToDelete.email : 'this user'}?`,
      action: {
        label: "Revoke",
        onClick: async () => {
          try {
            await api.delete(`/users/${id}`);
            toast.success("User access revoked successfully!");
            fetchUsers();
          } catch (err: any) {
            toast.error(err.message || "Failed to revoke user access");
          }
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {inSettingsView ? (
        <div 
          onClick={() => isMobile && setIsCollapsed(!isCollapsed)}
          className={`flex items-center justify-between p-4 -mx-4 sm:mx-0 sm:p-0 rounded-2xl transition-colors select-none ${
            isMobile ? 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-zinc-850/30' : 'cursor-default'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isDark ? 'bg-purple-950/40 text-purple-400' : 'bg-purple-100 text-purple-600'
            }`}>
              <i className="fa-solid fa-users-gear text-lg"></i>
            </div>
            <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>Team Management</h2>
          </div>
          {isMobile && (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-400 hover:bg-slate-100'
            }`}>
              <i className={`fa-solid fa-chevron-down transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}></i>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">Admin Management</h2>
            <p className="text-slate-500 text-sm">Control who can access the service dashboard.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl items-center gap-2 shadow-lg shadow-blue-500/20 transition-all font-medium shrink-0 flex w-full justify-center md:w-auto"
            >
              <i className="fa-solid fa-user-plus"></i>
              <span>Add User</span>
            </button>
          </div>
        </div>
      )}

      {!isCollapsed && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {inSettingsView && (
            <div className="flex w-full md:justify-end">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex w-full md:w-auto justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl items-center gap-2 shadow-lg shadow-blue-500/20 transition-all font-medium shrink-0"
              >
                <i className="fa-solid fa-user-plus"></i>
                <span>Add User</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center p-10"><i className={`fa-solid fa-spinner fa-spin text-2xl ${isDark ? 'text-zinc-500' : 'text-slate-600'}`}></i></div>
          ) : (
            <>
              {/* Responsive Card/Grid View */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {users.map((user) => (
                  <div key={user.id} className={`p-4 rounded-3xl border shadow-sm flex items-center justify-between transition-all hover:shadow-md ${
                    isDark 
                      ? 'bg-[var(--color-card-dark)] border-[var(--color-border-dark)]' 
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                        isDark 
                          ? user.role === UserRole.SUPER_ADMIN ? 'bg-purple-950/40 text-purple-400' :
                            user.role === UserRole.TECHNICIAN ? 'bg-emerald-950/40 text-emerald-400' : 'bg-blue-950/40 text-blue-400'
                          : user.role === UserRole.SUPER_ADMIN ? 'bg-purple-100 text-purple-600' :
                            user.role === UserRole.TECHNICIAN ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        <i className={`fa-solid ${
                          user.role === UserRole.SUPER_ADMIN ? 'fa-crown' :
                          user.role === UserRole.TECHNICIAN ? 'fa-screwdriver-wrench' : 'fa-user-gear'
                        }`}></i>
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold truncate max-w-[180px] ${isDark ? 'text-zinc-100' : 'text-slate-800'}`} title={user.email}>{user.email}</p>
                        {user.phone && (
                          <p className={`text-[11px] truncate ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}><i className="fa-solid fa-phone mr-1 opacity-70"></i>{user.phone}</p>
                        )}
                        <span className={`inline-block mt-1 text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                          isDark 
                            ? user.role === UserRole.SUPER_ADMIN ? 'bg-purple-950/50 text-purple-400' :
                              user.role === UserRole.TECHNICIAN ? 'bg-emerald-950/50 text-emerald-400' : 'bg-blue-950/50 text-blue-400'
                            : user.role === UserRole.SUPER_ADMIN ? 'bg-purple-50 text-purple-600' :
                              user.role === UserRole.TECHNICIAN ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className={`text-slate-400 hover:text-red-500 p-2.5 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800`}
                          title="Remove User"
                        >
                          <i className="fa-solid fa-user-minus"></i>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 ${isDark ? 'dark' : ''}`}>
          <div className={`rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-300 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white'
          }`}>
            <div className={`p-6 border-b flex items-center justify-between ${
              isDark ? 'border-zinc-800 bg-zinc-950/20' : 'border-slate-100 bg-slate-50/50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-user-plus text-lg"></i>
                </div>
                <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>Register Team Member</h3>
              </div>
              <button 
                onClick={handleCloseModal}
                className={`transition-colors rounded-lg p-2 ${
                  isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200'
                }`}
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="p-6 space-y-5">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@satguruengineers.com" 
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-450'
                  }`} 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  required 
                />
              </div>
              
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Account Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••••••" 
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-450'
                  }`} 
                  value={formData.password} 
                  onChange={e => setFormData({ ...formData, password: e.target.value })} 
                  required 
                />
              </div>
 
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Phone Number (for WhatsApp OTP) - Optional</label>
                <input 
                  type="text" 
                  placeholder="e.g. 919876543210" 
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-450'
                  }`} 
                  value={formData.phone} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                />
              </div>
              
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-1.5 block ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Access Level</label>
                <CustomSelect
                  value={formData.role}
                  onChange={val => setFormData({ ...formData, role: val as UserRole })}
                  options={[
                    { value: UserRole.ADMIN, label: "Standard Administrator" },
                    { value: UserRole.SUPER_ADMIN, label: "Super Administrator" },
                    { value: UserRole.TECHNICIAN, label: "Technician / Staff" }
                  ]}
                  isDark={isDark}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  className={`flex-1 py-3.5 px-4 font-bold rounded-2xl transition-all ${
                    isDark ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-[1.5] py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
