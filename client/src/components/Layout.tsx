import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AppContext';
import { UserRole } from '../types';
import { APP_NAME } from '../constants';
import { useRealtime } from './RealtimeProvider';
import { FloatingDock } from './ui/floating-dock';
import { GenieOutlet } from './ui/GenieOutlet';
import { LogoutOverlay } from './ui/LogoutOverlay';
import { GenieProvider, useGenie } from '../context/GenieContext';
import { motion, useTransform } from 'framer-motion';
import {
  IconLayoutDashboard,
  IconUsers,
  IconHammer,
  IconPackage,
  IconClipboardText,
  IconSettings,
  IconLogout,
} from '@tabler/icons-react';

interface ThemeToggleSwitchProps {
  parentSize?: any;
  isDark: boolean;
}

const ThemeToggleSwitch: React.FC<ThemeToggleSwitchProps> = ({ parentSize, isDark }) => {
  const baseSize = parentSize 
    ? useTransform(parentSize, [40, 70], [8, 14]) 
    : 9;

  return (
    <motion.label 
      className="theme-switch pointer-events-none" 
      style={{ fontSize: parentSize ? baseSize : 9 }}
    >
      <input 
        type="checkbox" 
        checked={!isDark} 
        readOnly 
      />
      <span className="theme-slider"></span>
      <span className="theme-decoration"></span>
    </motion.label>
  );
};

// Outer component: just sets up the Genie context so both the dock (which
// reports icon click origins) and the Outlet (which animates using them)
// can share state. Nothing else changed here.
const Layout: React.FC = () => {
  return (
    <GenieProvider>
      <LayoutContent />
    </GenieProvider>
  );
};

const LayoutContent: React.FC = () => {
  const { user, logout } = useAuth();
  const { status } = useRealtime();
  const location = useLocation();
  const navigate = useNavigate();
  const { setOrigin } = useGenie();
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('dashboard-theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('dashboard-theme')) {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const newVal = !prev;
      localStorage.setItem('dashboard-theme', newVal ? 'dark' : 'light');
      return newVal;
    });
  };

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const newVal = !prev;
      localStorage.setItem('sidebar-collapsed', String(newVal));
      return newVal;
    });
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'fa-gauge' },
    { path: '/jobs', label: 'Jobs & Phases', icon: 'fa-screwdriver-wrench' },
  ];

  if (user?.role !== UserRole.TECHNICIAN) {
    navItems.splice(1, 0, { path: '/customers', label: 'Customers', icon: 'fa-users' });
    navItems.push({ path: '/inventory', label: 'Inventory', icon: 'fa-boxes-stacked' });
    navItems.push({ path: '/logging', label: 'Logging', icon: 'fa-clipboard-list' });
  }

  // Technician gets "My Work" nav item
  if (user?.role === UserRole.TECHNICIAN) {
    navItems.push({ path: '/my-work', label: 'My Work', icon: 'fa-clipboard-list' });
  }
  const handleLogout = () => {
    // Origin (Logout icon position) is already set by onIconInteract on pointerdown,
    // which fires before this onClick. Show the collapse overlay first, and only
    // clear auth state (which unmounts Layout) once it's fully played out —
    // otherwise Layout disappears mid-animation and nothing is visible.
    setIsLoggingOut(true);
    setTimeout(() => {
      navigate('/', { replace: true });
      logout();
    }, 650); // matches LogoutOverlay's enter + hold + collapse timing
  };

  const getIconForLabel = (label: string, isActive?: boolean) => {
    const sizeClasses = `h-full w-full transition-colors ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`;
    switch (label) {
      case 'Dashboard':
        return <IconLayoutDashboard className={sizeClasses} />;
      case 'Customers':
        return <IconUsers className={sizeClasses} />;
      case 'Jobs & Phases':
      case 'Jobs':
        return <IconHammer className={sizeClasses} />;
      case 'Inventory':
        return <IconPackage className={sizeClasses} />;
      case 'Logging':
      case 'Daily Work':
      case 'My Work':
        return <IconClipboardText className={sizeClasses} />;
      default:
        return <IconSettings className={sizeClasses} />;
    }
  };

  const dockItems = [
    {
      title: APP_NAME,
      icon: (
        <img 
          src="/logo.png" 
          alt={`${APP_NAME} Logo`} 
          className="h-7 w-auto object-contain drop-shadow-sm select-none" 
        />
      ),
      onClick: () => navigate('/'),
      iconClassName: "h-auto w-auto flex items-center justify-center",
    },
    ...navItems.map((item) => {
      const isActive = location.pathname.startsWith(item.path);
      return {
        title: item.label,
        icon: getIconForLabel(item.label, isActive),
        href: item.path,
        active: isActive,
      };
    }),
    {
      title: 'Settings',
      icon: <IconSettings className={`h-full w-full transition-colors ${location.pathname.startsWith('/settings') ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`} />,
      href: '/settings',
      active: location.pathname.startsWith('/settings'),
    },

    {
      title: 'Logout',
      icon: <IconLogout className="h-full w-full text-red-400" />,
      onClick: handleLogout,
    },
  ];


  return (
    <div className={`h-screen flex flex-col md:flex-row ${isDark ? 'bg-background-dark text-zinc-100 dark' : 'bg-background-light text-slate-900'} overflow-hidden`}>
      {/* Sidebar (Desktop) */}
      <aside className={`flex max-md:!hidden ${isCollapsed ? 'w-20 bg-transparent border-none' : 'w-64 bg-slate-900 border-r border-slate-800'} text-white flex-shrink-0 flex-col relative z-20 shadow-xl transition-all duration-300`}>
        {isCollapsed ? (
          <div className="flex items-center justify-center h-full w-full relative">
            <div className="relative">
              <FloatingDock
                orientation="vertical"
                items={dockItems}
                desktopClassName="border-slate-800 bg-slate-900/90 shadow-2xl"
                onIconInteract={setOrigin}
              />
              {/* Floating border collapse/expand button, attached to the dock capsule */}
              <button
                onClick={toggleSidebar}
                className="absolute top-1/2 -right-4 -translate-y-1/2 z-50 w-8 h-8 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer focus:outline-none"
                title="Expand Sidebar"
              >
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 shrink-0 border-b border-slate-800 flex items-center justify-between min-h-[72px] transition-all">
              <div 
                onClick={() => navigate('/')} 
                className="text-white text-lg font-normal flex items-center gap-2 hover:opacity-90 transition-opacity min-w-0 cursor-pointer"
              >
                <img src="/logo.png" alt={`${APP_NAME} Logo`} className="h-9 w-auto object-contain drop-shadow-sm shrink-0" />
                <span className="tracking-tight leading-tight uppercase text-sm xl:text-base font-semibold font-display" title={APP_NAME}>{APP_NAME}</span>
              </div>
            </div>
            <nav className="mt-4 px-4 space-y-1 overflow-y-auto flex-1">
              {navItems.map((item) => (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center rounded-xl transition-all cursor-pointer gap-3 px-4 py-3 ${location.pathname.startsWith(item.path)
                    ? 'bg-[var(--color-primary)] text-white font-medium shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <i className={`fa-solid ${item.icon} text-lg w-5 text-center`}></i>
                  <span>{item.label}</span>
                </div>
              ))}
              <div
                onClick={() => navigate('/settings')}
                className={`flex items-center rounded-xl transition-all cursor-pointer gap-3 px-4 py-3 ${location.pathname.startsWith('/settings')
                  ? 'bg-[var(--color-primary)] text-white font-medium shadow-md shadow-blue-600/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <i className="fa-solid fa-gear text-lg w-5 text-center"></i>
                <span>Settings</span>
              </div>
            </nav>

            {/* User Profile / Logout (pushed to bottom) */}
            <div className="mt-auto border-t border-slate-800 w-full bg-slate-900/50 backdrop-blur-sm p-4 flex flex-col gap-3">
              {/* Theme Switcher & Logout Buttons */}
              <div className="flex items-center gap-3 px-2">
                <label className="theme-switch shrink-0 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={!isDark} 
                    onChange={toggleTheme} 
                  />
                  <span className="theme-slider"></span>
                  <span className="theme-decoration"></span>
                </label>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="flex-1 h-10 bg-slate-800/40 hover:bg-slate-800 justify-center gap-2 text-xs font-semibold flex items-center rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-350 transition-colors"
                >
                  <i className="fa-solid fa-right-from-bracket text-base text-center"></i>
                  <span>Logout</span>
                </button>
              </div>

              {/* User Profile Details */}
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-lg font-bold shrink-0 text-white shadow-lg cursor-pointer">
                  {user?.email[0].toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-white truncate" title={user?.email}>{user?.email}</p>
                  <p className="text-xs text-slate-300 capitalize font-medium">{user?.role}{user?.role === UserRole.TECHNICIAN && ` • ID: ${user?.id}`}</p>
                </div>
              </div>

              {/* Subtle Connection Status indicator at absolute bottom */}
              <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-500 select-none border-t border-slate-800/10 pt-2 w-full justify-start px-2">
                <span className="relative flex h-1.5 w-1.5">
                  {status === 'connecting' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    status === 'connected' ? 'bg-emerald-500/80' :
                    status === 'connecting' ? 'bg-amber-500/80' :
                    status === 'polling' ? 'bg-yellow-500/80' : 'bg-rose-500/80'
                  }`}></span>
                </span>
                <span className="opacity-45 font-medium tracking-wider uppercase text-[8px] leading-none" title={
                  status === 'connected' ? 'Real-time synchronization active' :
                  status === 'connecting' ? 'Connecting to real-time stream...' :
                  status === 'polling' ? 'Using 60s fallback polling' : 'Real-time connection inactive'
                }>
                  {status === 'connected' ? 'Live' :
                   status === 'connecting' ? 'Connecting' :
                   status === 'polling' ? 'Polling' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Floating border collapse/expand button, attached to expanded sidebar edge */}
            <button
              onClick={toggleSidebar}
              className="absolute top-9 -right-4 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-305 hover:text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer focus:outline-none"
              title="Collapse Sidebar"
            >
              <i className="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
          </>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-y-auto pb-[68px] md:pb-0">
        {/* Mobile Header */}
        <header className={`md:hidden h-14 shrink-0 ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-md border-b flex items-center justify-between px-4 sticky top-0 z-30 transition-shadow shadow-sm`}>
          <Link to="/" className="flex flex-col sm:flex-row items-center md:hidden sm:gap-3 gap-0.5 hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt={`${APP_NAME} Logo`} className="h-11 sm:h-12 w-auto object-contain drop-shadow-sm shrink-0" />
            <h1 className={`text-[10px] sm:text-lg font-normal font-display ${isDark ? 'text-white' : 'text-slate-800'} uppercase text-center sm:text-left leading-tight`}>{APP_NAME}</h1>
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <span className={isDark ? 'text-slate-300' : 'text-slate-500'}>Welcome back, </span>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={handleLogout}
              className={`md:hidden w-8 h-8 flex items-center justify-center rounded-full transition-colors shrink-0 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500'}`}
            >
              <i className="fa-solid fa-right-from-bracket text-sm"></i>
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          <GenieOutlet isCollapsed={isCollapsed} outletContext={{ isDark, toggleTheme }} />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-md border-t flex justify-around items-center h-[68px] z-50 pb-safe shadow-[0_-10px_15px_-3px_rgb(0,0,0,0.05)]`}>
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 pt-1 pb-2 relative transition-all duration-200 ${isActive ? 'text-[var(--color-primary)]' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[var(--color-primary)] rounded-b-full shadow-[0_2px_4px_rgba(37,84,232,0.4)]"></span>
              )}
              <i className={`fa-solid ${item.icon} text-lg mb-0.5 transition-transform duration-200 ${isActive ? '-translate-y-px scale-110' : ''}`}></i>
              <span className={`text-[10px] font-semibold leading-none tracking-tight transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                {item.label === 'Jobs & Phases' ? 'Jobs' : item.label}
              </span>
            </Link>
          );
        })}
        <Link
          to="/settings"
          className={`flex flex-col items-center justify-center w-full h-full gap-1 pt-1 pb-2 relative transition-all duration-200 ${location.pathname.startsWith('/settings') ? 'text-[var(--color-primary)]' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
        >
          {location.pathname.startsWith('/settings') && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[var(--color-primary)] rounded-b-full shadow-[0_2px_4px_rgba(37,84,232,0.4)]"></span>
          )}
          <i className={`fa-solid fa-gear text-lg mb-0.5 transition-transform duration-200 ${location.pathname.startsWith('/settings') ? '-translate-y-px scale-110' : ''}`}></i>
          <span className={`text-[10px] font-semibold leading-none tracking-tight transition-all duration-200 ${location.pathname.startsWith('/settings') ? 'opacity-100' : 'opacity-80'}`}>
            Settings
          </span>
        </Link>
      </nav>

      <LogoutOverlay active={isLoggingOut} />
    </div>
  );
};

export default Layout;
