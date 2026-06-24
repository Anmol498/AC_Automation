import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from 'sonner';
import { AuthState, User, UserRole } from './types';
import Login from './pages/Login';
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
import DailyWork from './pages/DailyWork';
import TechnicianWork from './pages/TechnicianWork';
import ScrollToTop from './components/ScrollToTop';
import { RealtimeProvider } from './components/RealtimeProvider';
import { AuthContext, SettingsContext } from './context/AppContext';
import { API_BASE_URL } from './constants';

axios.defaults.withCredentials = true;

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

  // Fetch public config settings on load
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/config`);
        if (res.data.company_phone) setCompanyPhoneState(res.data.company_phone);
        if (res.data.company_email) setCompanyEmailState(res.data.company_email);
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
          const res = await axios.get(`${API_BASE_URL}/settings`, {
            headers: { Authorization: `Bearer ${auth.token}` }
          });
          if (res.data.mail_transport) {
            setMailTransportState(res.data.mail_transport);
          }
          if (res.data.company_phone) {
            setCompanyPhoneState(res.data.company_phone);
          }
          if (res.data.company_email) {
            setCompanyEmailState(res.data.company_email);
          }
          if (res.data.copperPipeLowStockThreshold !== undefined) {
            setCopperPipeLowStockThresholdState(Number(res.data.copperPipeLowStockThreshold));
          }
          if (res.data.enableCopperPipeLowStockAlert !== undefined) {
            setEnableCopperPipeLowStockAlertState(res.data.enableCopperPipeLowStockAlert === 'true' || res.data.enableCopperPipeLowStockAlert === true);
          }
          if (res.data.lowStockThreshold !== undefined) {
            setLowStockThresholdState(Number(res.data.lowStockThreshold));
          }
          if (res.data.enableLowStockAlert !== undefined) {
            setEnableLowStockAlertState(res.data.enableLowStockAlert === 'true' || res.data.enableLowStockAlert === true);
          }
          if (res.data.requireEmailPreview !== undefined) {
            setRequireEmailPreviewState(res.data.requireEmailPreview === 'true' || res.data.requireEmailPreview === true);
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

  const login = (user: User, token: string) => {
    const newState = { user, token, isAuthenticated: true };
    setAuth(newState);
    localStorage.setItem('satguru_auth', JSON.stringify(newState));
  };

  const logout = () => {
    axios.post(`${API_BASE_URL}/auth/logout`).catch(err => {
      console.error("Logout API failed:", err);
    });
    setAuth({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem('satguru_auth');
  };

  const logoutRef = React.useRef(logout);
  const loginRef = React.useRef(login);

  useEffect(() => {
    logoutRef.current = logout;
    loginRef.current = login;
  });

  // Configure global interceptors for axios and fetch to catch 401/403 (token expiration)
  useEffect(() => {
    // 1. Axios Interceptor
    let isRefreshing = false;
    let refreshSubscribers: ((token: string) => void)[] = [];

    const subscribeTokenRefresh = (cb: (token: string) => void) => {
      refreshSubscribers.push(cb);
    };

    const onRefreshed = (token: string) => {
      refreshSubscribers.forEach((cb) => cb(token));
      refreshSubscribers = [];
    };

    const axiosInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
          // Do not attempt to refresh tokens for auth/refresh or login calls themselves
          if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.endsWith('/login')) {
            if (originalRequest.url?.includes('/auth/refresh')) {
              logoutRef.current();
            }
            return Promise.reject(error);
          }

          if (isRefreshing) {
            return new Promise((resolve) => {
              subscribeTokenRefresh((token) => {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
                resolve(axios(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
            const { token, user } = res.data;
            loginRef.current(user, token);
            isRefreshing = false;
            onRefreshed(token);
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axios(originalRequest);
          } catch (refreshError) {
            isRefreshing = false;
            logoutRef.current();
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    // 2. Fetch Interceptor
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        let response = await originalFetch(...args);
        const urlStr = args[0].toString();
        if (
          (response.status === 401 || response.status === 403) && 
          !urlStr.includes('/auth/refresh') && 
          !urlStr.endsWith('/login')
        ) {
          const isAuthed = getSafeAuth().isAuthenticated;
          if (isAuthed) {
            try {
              const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
              const { token, user } = refreshRes.data;
              loginRef.current(user, token);
              
              const [resource, config] = args;
              const newConfig = { ...(config || {}) };
              newConfig.headers = {
                ...(newConfig.headers || {}),
                'Authorization': `Bearer ${token}`
              };
              response = await originalFetch(resource, newConfig);
            } catch (refreshErr) {
              logoutRef.current();
            }
          }
        }
        return response;
      } catch (err) {
        throw err;
      }
    };

    return () => {
      axios.interceptors.response.eject(axiosInterceptor);
      window.fetch = originalFetch;
    };
  }, []);

  // Fix: Made children optional to resolve TypeScript errors where 'children' was reported missing in JSX
  const ProtectedRoute = ({ children, roles }: { children?: React.ReactNode, roles?: UserRole[] }) => {
    if (!auth.isAuthenticated) return <Navigate to="/login" replace />;
    if (roles && auth.user && !roles.includes(auth.user.role)) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, isLoginModalOpen, setLoginModalOpen }}>
      <SettingsContext.Provider value={{ 
        lowStockThreshold, 
        enableLowStockAlert, 
        copperPipeLowStockThreshold,
        enableCopperPipeLowStockAlert,
        requireEmailPreview, 
        mailTransport,
        companyPhone,
        companyEmail,
        setLowStockThreshold, 
        setEnableLowStockAlert, 
        setCopperPipeLowStockThreshold,
        setEnableCopperPipeLowStockAlert,
        setRequireEmailPreview,
        setMailTransport,
        setCompanyPhone,
        setCompanyEmail
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
                <Route path="/daily-work" element={<DailyWork />} />
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
