
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { UserRole } from '../../../shared/types';
import { APP_NAME } from '../constants';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'fa-gauge' },
    { path: '/jobs', label: 'Jobs & Phases', icon: 'fa-screwdriver-wrench' },
  ];

  if (user?.role !== UserRole.TECHNICIAN) {
    navItems.splice(1, 0, { path: '/customers', label: 'Customers', icon: 'fa-users' });
  }

  if (user?.role === UserRole.SUPER_ADMIN) {
    navItems.push({ path: '/users', label: 'Manage Users', icon: 'fa-user-shield' });
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col relative">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="bg-blue-600 p-1.5 rounded-lg">
              <i className="fa-solid fa-wind text-white"></i>
            </span>
            {APP_NAME}
          </h1>
        </div>
        <nav className="mt-4 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${location.pathname.startsWith(item.path)
                ? 'bg-blue-600 text-white font-medium'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <i className={`fa-solid ${item.icon} w-5`}></i>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Profile / Logout (pushed to bottom) */}
        <div className="mt-auto p-4 border-t border-slate-800 hidden md:block w-full bg-slate-900">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold shrink-0">
              {user?.email[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate" title={user?.email}>{user?.email}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket"></i>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 transition-shadow">
          <div className="flex items-center md:hidden">
            <h1 className="text-lg font-bold">{APP_NAME}</h1>
          </div>
          <div className="hidden md:block">
            <span className="text-slate-400">Welcome back, </span>
            <span className="font-semibold">{user?.email}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user?.role === UserRole.SUPER_ADMIN ? 'bg-purple-100 text-purple-700' :
              user?.role === UserRole.TECHNICIAN ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
              }`}>
              {user?.role}
            </span>
            <button
              onClick={logout}
              className="md:hidden p-2 text-slate-500"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 md:pb-6 relative z-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
