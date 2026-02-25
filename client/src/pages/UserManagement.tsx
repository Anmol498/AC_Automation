
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { useAuth } from '../App';
import { API_BASE_URL } from '../constants';

const UserManagement: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', role: UserRole.ADMIN });

  const fetchUsers = () => {
    setLoading(true);
    fetch(`${API_BASE_URL}/users`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ email: '', password: '', role: UserRole.ADMIN });
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create user");
      }
    } catch (err) { }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Revoke access for this user?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchUsers();
      else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) { }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Admin Management</h2>
          <p className="text-slate-500 text-sm">Control who can access the service dashboard.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
          <div className="relative flex-1 group md:hidden">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
            <input
              type="text"
              placeholder="Search team members..."
              className="pl-11 pr-4 py-3 bg-white border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all w-full text-sm font-medium shadow-sm"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all font-medium shrink-0"
          >
            <i className="fa-solid fa-user-plus"></i>
            Add User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-10"><i className="fa-solid fa-spinner fa-spin text-slate-600 text-2xl"></i></div>
      ) : (
        <>
          {/* Mobile Card View (< md) */}
          <div className="md:hidden space-y-4">
            {users.map((user) => (
              <div key={user.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${user.role === UserRole.SUPER_ADMIN ? 'bg-purple-100/50 text-purple-600' :
                        user.role === UserRole.TECHNICIAN ? 'bg-emerald-100/50 text-emerald-600' : 'bg-blue-100/50 text-blue-600'
                      }`}>
                      <i className={`fa-solid ${user.role === UserRole.SUPER_ADMIN ? 'fa-crown text-purple-600' :
                          user.role === UserRole.TECHNICIAN ? 'fa-screwdriver-wrench text-emerald-600' : 'fa-user-shield text-blue-600'
                        }`}></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 leading-tight truncate w-48">{user.email}</h3>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase ${user.role === UserRole.SUPER_ADMIN ? 'bg-purple-50 text-purple-700' :
                          user.role === UserRole.TECHNICIAN ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">System Access: Active</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Grid View (>= md) */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <div key={user.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${user.role === UserRole.SUPER_ADMIN ? 'bg-purple-100 text-purple-600' :
                    user.role === UserRole.TECHNICIAN ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                    <i className={`fa-solid ${user.role === UserRole.SUPER_ADMIN ? 'fa-crown' :
                      user.role === UserRole.TECHNICIAN ? 'fa-screwdriver-wrench' : 'fa-user-gear'
                      }`}></i>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 truncate" title={user.email}>{user.email}</p>
                    <span className={`inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${user.role === UserRole.SUPER_ADMIN ? 'bg-purple-50 text-purple-500' :
                      user.role === UserRole.TECHNICIAN ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                      }`}>
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active</span>
                  </div>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-slate-300 hover:text-red-500 p-2 -mr-2 transition-colors rounded-lg hover:bg-red-50"
                    title="Remove User"
                  >
                    <i className="fa-solid fa-user-minus"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Floating Action Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="md:hidden fixed bottom-[84px] right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center active:scale-95 transition-transform z-40"
          >
            <i className="fa-solid fa-user-plus text-xl"></i>
          </button>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Register New User</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Email</label>
                <input type="email" placeholder="user@satguruengineers.com" className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Password</label>
                <input type="password" placeholder="••••••••" className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Role</label>
                <select
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                >
                  <option value={UserRole.ADMIN}>Standard Admin</option>
                  <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                  <option value={UserRole.TECHNICIAN}>Technician</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-3 bg-slate-100 font-bold rounded-xl">Cancel</button>
                <button type="submit" className="flex-1 p-3 bg-slate-900 text-white font-bold rounded-xl">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
