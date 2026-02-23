import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthState, User, UserRole } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import JobList from './pages/JobList';
import JobDetail from './pages/JobDetail';
import UserManagement from './pages/UserManagement';
import Layout from './components/Layout';

interface AuthContextType extends AuthState {
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('coolbreeze_auth');
    return saved ? JSON.parse(saved) : { user: null, token: null, isAuthenticated: false };
  });

  const login = (user: User, token: string) => {
    const newState = { user, token, isAuthenticated: true };
    setAuth(newState);
    localStorage.setItem('coolbreeze_auth', JSON.stringify(newState));
  };

  const logout = () => {
    setAuth({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem('coolbreeze_auth');
  };

  // Fix: Made children optional to resolve TypeScript errors where 'children' was reported missing in JSX
  const ProtectedRoute = ({ children, roles }: { children?: React.ReactNode, roles?: UserRole[] }) => {
    if (!auth.isAuthenticated) return <Navigate to="/login" replace />;
    if (roles && auth.user && !roles.includes(auth.user.role)) return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      <HashRouter>
        <Routes>
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
            <Route path="/users" element={
              <ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
                <UserManagement />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;