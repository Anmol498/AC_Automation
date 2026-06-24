export enum UserRole {
    ADMIN = 'admin',
    SUPER_ADMIN = 'superadmin',
    TECHNICIAN = 'technician'
}

export interface User {
    id: number | string;
    email: string;
    role: UserRole;
    name?: string;
    phone?: string;
    createdAt?: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
}

export interface Customer {
    id: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    drawingUrl?: string;
    quotationUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Job {
    id: number;
    customerId: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    technician: string;
    jobType: string;
    currentPhase: string;
    status: 'Scheduled' | 'In Progress' | 'Completed' | 'Pending';
    paymentStatus: 'Pending' | 'Partially Paid' | 'Paid';
    startDate: string;
    totalCost: number;
    totalPaid: number;
    createdAt: string;
    updatedAt: string;
    copperPipingCost?: number;
    outdoorFittingCost?: number;
    commissioningCost?: number;
    equipmentCost?: number;
}

export interface JobPhase {
    id: number;
    jobId: number;
    phaseName: string;
    isCompleted: boolean;
    completedAt?: string;
    emailStatus?: 'sent' | 'failed' | 'skipped';
}

export interface Payment {
    id: number;
    jobId: number;
    amount: number;
    category?: 'Low-Side' | 'Equipment';
    paymentMethod: string;
    notes?: string;
    recorded_by: string;
    createdAt: string;
}
