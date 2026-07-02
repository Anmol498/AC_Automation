import { createContext, useContext } from 'react';
import { AuthState, User } from '../types';

export interface AuthContextType extends AuthState {
  login: (user: User, token: string) => void;
  logout: () => void;
  isLoginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  updateUser: (newUser: User) => void;
}

export interface SettingsState {
  lowStockThreshold: number;
  enableLowStockAlert: boolean;
  copperPipeLowStockThreshold: number;
  enableCopperPipeLowStockAlert: boolean;
  requireEmailPreview: boolean;
  mailTransport: 'smtp' | 'google_oauth';
  companyPhone: string;
  companyEmail: string;
  whatsappEnabled: boolean;
  setLowStockThreshold: (val: number) => void;
  setEnableLowStockAlert: (val: boolean) => void;
  setCopperPipeLowStockThreshold: (val: number) => void;
  setEnableCopperPipeLowStockAlert: (val: boolean) => void;
  setRequireEmailPreview: (val: boolean) => void;
  setMailTransport: (val: 'smtp' | 'google_oauth') => void;
  setCompanyPhone: (val: string) => void;
  setCompanyEmail: (val: string) => void;
  setWhatsappEnabled: (val: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const SettingsContext = createContext<SettingsState | undefined>(undefined);

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
