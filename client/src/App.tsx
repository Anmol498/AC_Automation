import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthState, User, UserRole } from './types';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import JobList from './pages/JobList';
import JobDetail from './pages/JobDetail';
import UserManagement from './pages/UserManagement';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import ContactUs from './pages/ContactUs';
import Layout from './components/Layout';
import InventoryManagement from './pages/InventoryManagement';
import Settings from './pages/Settings';
import WhatsAppTemplates from './pages/WhatsAppTemplates';
import DailyWork from './pages/DailyWork';
import TechnicianWork from './pages/TechnicianWork';
import ScrollToTop from './components/ScrollToTop';
import { RealtimeProvider } from './components/RealtimeProvider';
import { AuthContext, SettingsContext } from './context/AppContext';
import { api } from './lib/api';

export { useAuth, useSettings } from './context/AppContext';

const getSafeAuth = (): AuthState => {
  const saved = localStorage.getItem('satguru_auth');
  if (!saved) return { user: null, token: null, isAuthenticated: false };
  try {
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (e) {
    localStorage.removeItem('satguru_auth');
  }
  return { user: null, token: null, isAuthenticated: false };
};

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    return getSafeAuth();
  });
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);

  const [lowStockThreshold, setLowStockThresholdState] = useState<number>(() => {
    const saved = localStorage.getItem('lowStockThreshold');
    return saved ? parseInt(saved, 10) : 5;
  });

  const [enableLowStockAlert, setEnableLowStockAlertState] = useState<boolean>(() => {
    const saved = localStorage.getItem('enableLowStockAlert');
    return saved ? saved === 'true' : true;
  });

  const [copperPipeLowStockThreshold, setCopperPipeLowStockThresholdState] = useState<number>(() => {
    const saved = localStorage.getItem('copperPipeLowStockThreshold');
    return saved ? parseInt(saved, 10) : 100;
  });

  const [enableCopperPipeLowStockAlert, setEnableCopperPipeLowStockAlertState] = useState<boolean>(() => {
    const saved = localStorage.getItem('enableCopperPipeLowStockAlert');
    return saved ? saved === 'true' : true;
  });

  const [requireEmailPreview, setRequireEmailPreviewState] = useState<boolean>(() => {
    const saved = localStorage.getItem('requireEmailPreview');
    return saved ? saved === 'true' : true;
  });

  const [mailTransport, setMailTransportState] = useState<'smtp' | 'google_oauth'>('smtp');
  const [companyPhone, setCompanyPhoneState] = useState<string>('95922 92292');
  const [companyEmail, setCompanyEmailState] = useState<string>('contactsatguruengineer@gmail.com');
  const [whatsappEnabled, setWhatsappEnabledState] = useState<boolean>(true);

  // Fetch public config settings on load
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api.get('/config');
        if (data.company_phone) setCompanyPhoneState(data.company_phone);
        if (data.company_email) setCompanyEmailState(data.company_email);
        if (data.whatsapp_enabled !== undefined) setWhatsappEnabledState(data.whatsapp_enabled === true || data.whatsapp_enabled === 'true');
      } catch (err) {
        console.error("Failed to fetch public config:", err);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.role === UserRole.SUPER_ADMIN) {
      const fetchSettings = async () => {
        try {
          const data = await api.get('/settings');
          if (data.mail_transport) {
            setMailTransportState(data.mail_transport);
          }
          if (data.company_phone) {
            setCompanyPhoneState(data.company_phone);
          }
          if (data.company_email) {
            setCompanyEmailState(data.company_email);
          }
          if (data.copperPipeLowStockThreshold !== undefined) {
            setCopperPipeLowStockThresholdState(Number(data.copperPipeLowStockThreshold));
          }
          if (data.enableCopperPipeLowStockAlert !== undefined) {
            setEnableCopperPipeLowStockAlertState(data.enableCopperPipeLowStockAlert === 'true' || data.enableCopperPipeLowStockAlert === true);
          }
          if (data.lowStockThreshold !== undefined) {
            setLowStockThresholdState(Number(data.lowStockThreshold));
          }
          if (data.enableLowStockAlert !== undefined) {
            setEnableLowStockAlertState(data.enableLowStockAlert === 'true' || data.enableLowStockAlert === true);
          }
          if (data.requireEmailPreview !== undefined) {
            setRequireEmailPreviewState(data.requireEmailPreview === 'true' || data.requireEmailPreview === true);
          }
          if (data.whatsapp_enabled !== undefined) {
            setWhatsappEnabledState(data.whatsapp_enabled === 'true' || data.whatsapp_enabled === true);
          }
        } catch (err) {
          console.error("Failed to fetch backend settings:", err);
        }
      };
      fetchSettings();
    }
  }, [auth.isAuthenticated, auth.token, auth.user?.role]);

  const setLowStockThreshold = (val: number) => {
    setLowStockThresholdState(val);
    localStorage.setItem('lowStockThreshold', val.toString());
  };

  const setEnableLowStockAlert = (val: boolean) => {
    setEnableLowStockAlertState(val);
    localStorage.setItem('enableLowStockAlert', val.toString());
  };

  const setCopperPipeLowStockThreshold = (val: number) => {
    setCopperPipeLowStockThresholdState(val);
    localStorage.setItem('copperPipeLowStockThreshold', val.toString());
  };

  const setEnableCopperPipeLowStockAlert = (val: boolean) => {
    setEnableCopperPipeLowStockAlertState(val);
    localStorage.setItem('enableCopperPipeLowStockAlert', val.toString());
  };

  const setRequireEmailPreview = (val: boolean) => {
    setRequireEmailPreviewState(val);
    localStorage.setItem('requireEmailPreview', val.toString());
  };

  const setMailTransport = (val: 'smtp' | 'google_oauth') => {
    setMailTransportState(val);
  };

  const setCompanyPhone = (val: string) => {
    setCompanyPhoneState(val);
  };

  const setCompanyEmail = (val: string) => {
    setCompanyEmailState(val);
  };

  const setWhatsappEnabled = (val: boolean) => {
    setWhatsappEnabledState(val);
  };

  const login = (user: User, token: string) => {
    const newState = { user, token, isAuthenticated: true };
    setAuth(newState);
    localStorage.setItem('satguru_auth', JSON.stringify(newState));
  };

  const logout = () => {
    api.post('/auth/logout').catch(err => {
      console.error("Logout API failed:", err);
    });
    setAuth({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem('satguru_auth');
  };

  const updateUser = (newUser: User) => {
    setAuth(prev => {
      const updated = { ...prev, user: newUser };
      localStorage.setItem('satguru_auth', JSON.stringify(updated));
      return updated;
    });
  };

  const logoutRef = React.useRef(logout);
  const loginRef = React.useRef(login);

  useEffect(() => {
    logoutRef.current = logout;
    loginRef.current = login;
  });

  // Token refresh logic is handled inside lib/api.ts. Global page reload on auth logout:
  useEffect(() => {
    const handleAuthLogout = () => {
      setAuth({ user: null, token: null, isAuthenticated: false });
    };
    window.addEventListener('auth-logout', handleAuthLogout);
    return () => window.removeEventListener('auth-logout', handleAuthLogout);
  }, []);

  // Fix: Made children optional to resolve TypeScript errors where 'children' was reported missing in JSX
  const ProtectedRoute = ({ children, roles }: { children?: React.ReactNode, roles?: UserRole[] }) => {
    if (!auth.isAuthenticated) return <Navigate to="/login" replace />;
    if (roles && auth.user && !roles.includes(auth.user.role)) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, isLoginModalOpen, setLoginModalOpen, updateUser }}>
      <SettingsContext.Provider value={{ 
        lowStockThreshold, 
        enableLowStockAlert, 
        copperPipeLowStockThreshold,
        enableCopperPipeLowStockAlert,
        requireEmailPreview, 
        mailTransport,
        companyPhone,
        companyEmail,
        whatsappEnabled,
        setLowStockThreshold, 
        setEnableLowStockAlert, 
        setCopperPipeLowStockThreshold,
        setEnableCopperPipeLowStockAlert,
        setRequireEmailPreview,
        setMailTransport,
        setCompanyPhone,
        setCompanyEmail,
        setWhatsappEnabled
      }}>
        <RealtimeProvider>
          <div className="app-container">
            <BrowserRouter>
              <ScrollToTop />
              <Toaster position="top-right" richColors />
              <div className="main-content page-content">
                <Routes>
                  <Route path="/" element={<Home />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/login" element={!auth.isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
              <Route path="/forgot-password" element={!auth.isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />} />

              <Route element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<CustomerList />} />
                <Route path="/jobs" element={<JobList />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/inventory" element={
                  <ProtectedRoute roles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
                    <InventoryManagement />
                  </ProtectedRoute>
                } />
                <Route path="/logging" element={<DailyWork />} />
                <Route path="/my-work" element={
                  <ProtectedRoute roles={[UserRole.TECHNICIAN]}>
                    <TechnicianWork />
                  </ProtectedRoute>
                } />
                <Route path="/users" element={
                  <ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
                    <UserManagement />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={<Settings />} />
                <Route path="/whatsapp-templates" element={
                  <ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
                    <WhatsAppTemplates />
                  </ProtectedRoute>
                } />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
              {isLoginModalOpen && (
                <Login
                  isOpen={isLoginModalOpen}
                  onClose={() => setLoginModalOpen(false)}
                />
              )}
              </div>
            </BrowserRouter>
          </div>
        </RealtimeProvider>
      </SettingsContext.Provider>
    </AuthContext.Provider>
  );
};

export default App;
