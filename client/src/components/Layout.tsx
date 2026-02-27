
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { UserRole } from '../types';
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
    navItems.push({ path: '/inventory', label: 'Inventory', icon: 'fa-boxes-stacked' });
  }

  if (user?.role === UserRole.SUPER_ADMIN) {
    navItems.push({ path: '/users', label: 'Manage Users', icon: 'fa-user-shield' });
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-shrink-0 flex-col relative z-20 shadow-xl">
        <div className="p-6 shrink-0 border-b border-slate-800">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span className="bg-blue-600 rounded-lg flex items-center justify-center w-8 h-8 shrink-0 shadow-md shadow-blue-500/20">
              <span className="text-sm font-black tracking-tighter text-white">SE</span>
            </span>
            <span className="tracking-tight leading-tight" title={APP_NAME}>{APP_NAME}</span>
          </h1>
        </div>
        <nav className="mt-4 px-4 space-y-1 overflow-y-auto flex-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname.startsWith(item.path)
                ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Profile / Logout (pushed to bottom) */}
        <div className="mt-auto p-4 border-t border-slate-800 w-full bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold shrink-0 text-white shadow-lg">
              {user?.email[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate" title={user?.email}>{user?.email}</p>
              <p className="text-xs text-slate-400 capitalize font-medium">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket w-5 text-center"></i>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative bg-slate-50 relative pb-[68px] md:pb-0">
        {/* Mobile Header */}
        <header className="h-14 md:h-16 shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 transition-shadow shadow-sm">
          <div className="flex items-center md:hidden gap-3">
            <span className="bg-blue-600 rounded-lg flex items-center justify-center w-8 h-8 shrink-0 shadow-md shadow-blue-500/20">
              <span className="text-sm font-black tracking-tighter text-white">SE</span>
            </span>
            <h1 className="text-base font-bold text-slate-800 truncate pr-2">{APP_NAME}</h1>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-slate-500">Welcome back, </span>
            <span className="font-semibold text-slate-800">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm flex-shrink-0 ${user?.role === UserRole.SUPER_ADMIN ? 'bg-purple-100 text-purple-700 border border-purple-200' :
              user?.role === UserRole.TECHNICIAN ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
              {user?.role}
            </span>
            <button
              onClick={logout}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
            >
              <i className="fa-solid fa-right-from-bracket text-sm"></i>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-6 w-full max-w-full overflow-x-hidden relative z-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around items-center h-[68px] z-50 pb-safe shadow-[0_-10px_15px_-3px_rgb(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 pt-1 pb-2 relative transition-all duration-200 ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-b-full shadow-[0_2px_4px_rgba(37,99,235,0.4)]"></span>
              )}
              <i className={`fa-solid ${item.icon} text-lg mb-0.5 transition-transform duration-200 ${isActive ? '-translate-y-px scale-110' : ''}`}></i>
              <span className={`text-[10px] font-semibold leading-none tracking-tight transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                {item.label === 'Manage Users' ? 'Users' : item.label === 'Jobs & Phases' ? 'Jobs' : item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
