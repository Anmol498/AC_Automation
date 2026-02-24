
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Admin Management</h2>
          <p className="text-slate-500 text-sm">Control who can access the service dashboard.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all font-medium"
        >
          <i className="fa-solid fa-user-shield"></i>
          Add New User
        </button>
      </div>

      {loading ? (
        <div className="text-center p-10"><i className="fa-solid fa-spinner fa-spin text-slate-600 text-2xl"></i></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{user.email}</p>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${user.role === UserRole.SUPER_ADMIN ? 'bg-purple-50 text-purple-500' :
                    user.role === UserRole.TECHNICIAN ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                    }`}>
                    {user.role}
                  </span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase">System Access: Active</span>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <i className="fa-solid fa-user-minus"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Register New User</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Email</label>
                <input type="email" placeholder="user@coolbreeze.com" className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
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
