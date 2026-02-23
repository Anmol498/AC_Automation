
export enum UserRole {
  SUPER_ADMIN = 'superadmin',
  ADMIN = 'admin',
  TECHNICIAN = 'technician'
}

export interface User {
  id: number;
  email: string;
  role: UserRole;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  drawingUrl?: string;
  quotationUrl?: string;
  createdAt: string;
}

export interface Job {
  id: number;
  customerId: number;
  customerName?: string;
  jobType: 'Installation' | 'Service';
  startDate: string;
  technician: string;
  status: 'Ongoing' | 'Completed';
  currentPhase?: string;
  paymentStatus: 'Pending' | '1/3rd Received' | '2/3rd Received' | 'Fully Received';
  copperPipingCost: number;
  outdoorFittingCost: number;
  commissioningCost: number;
  totalCost: number;
  totalPaid?: number;
  createdAt: string;
}

export interface JobPhase {
  id: number;
  jobId: number;
  phaseName: string;
  isCompleted: boolean;
  completedAt: string | null;
  order: number;
}

export interface Payment {
  id: number;
  job_id: number;
  amount: string | number;
  payment_method: 'Cash' | 'Card' | 'Transfer' | 'Other';
  notes: string;
  recorded_by: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
