import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthState, User, UserRole } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import JobList from './pages/JobList';
import JobDetail from './pages/JobDetail';
import UserManagement from './pages/UserManagement';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Layout from './components/Layout';
import InventoryManagement from './pages/InventoryManagement';
import Settings from './pages/Settings';

interface AuthContextType extends AuthState {
  login: (user: User, token: string) => void;
  logout: () => void;
}

interface SettingsState {
  lowStockThreshold: number;
  enableLowStockAlert: boolean;
  setLowStockThreshold: (val: number) => void;
  setEnableLowStockAlert: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SettingsContext = createContext<SettingsState | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('satguru_auth');
    return saved ? JSON.parse(saved) : { user: null, token: null, isAuthenticated: false };
  });

  const [lowStockThreshold, setLowStockThresholdState] = useState<number>(() => {
    const saved = localStorage.getItem('lowStockThreshold');
    return saved ? parseInt(saved, 10) : 5;
  });

  const [enableLowStockAlert, setEnableLowStockAlertState] = useState<boolean>(() => {
    const saved = localStorage.getItem('enableLowStockAlert');
    return saved ? saved === 'true' : true;
  });

  const setLowStockThreshold = (val: number) => {
    setLowStockThresholdState(val);
    localStorage.setItem('lowStockThreshold', val.toString());
  };

  const setEnableLowStockAlert = (val: boolean) => {
    setEnableLowStockAlertState(val);
    localStorage.setItem('enableLowStockAlert', val.toString());
  };

  const login = (user: User, token: string) => {
    const newState = { user, token, isAuthenticated: true };
    setAuth(newState);
    localStorage.setItem('satguru_auth', JSON.stringify(newState));
  };

  const logout = () => {
    setAuth({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem('satguru_auth');
  };

  // Fix: Made children optional to resolve TypeScript errors where 'children' was reported missing in JSX
  const ProtectedRoute = ({ children, roles }: { children?: React.ReactNode, roles?: UserRole[] }) => {
    if (!auth.isAuthenticated) return <Navigate to="/login" replace />;
    if (roles && auth.user && !roles.includes(auth.user.role)) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      <SettingsContext.Provider value={{ lowStockThreshold, enableLowStockAlert, setLowStockThreshold, setEnableLowStockAlert }}>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
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
              <Route path="/users" element={
                <ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
                  <UserManagement />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </SettingsContext.Provider>
    </AuthContext.Provider>
  );
};

export default App;