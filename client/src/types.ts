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
