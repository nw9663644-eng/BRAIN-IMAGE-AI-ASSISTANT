/**
 * Authentication service — connects to /api/auth endpoints.
 */

import { UserProfile, UserRole, Gender } from '../types';
import { apiFetch, setToken, clearToken } from './api';

interface LoginResponse {
    access_token: string;
    token_type: string;
    user: UserProfileAPI;
}

interface UserProfileAPI {
    id: string;
    role: string;
    name: string;
    gender?: string;
    age?: number;
    phone?: string;
    department?: string;
    title?: string;
    hospital?: string;
    specialties?: string;
    registrationDate: string;
}

// ─── Convert API response to frontend type ───────────────

function toUserProfile(apiUser: UserProfileAPI): UserProfile {
    return {
        id: apiUser.id,
        role: apiUser.role as UserRole,
        name: apiUser.name,
        gender: apiUser.gender as Gender | undefined,
        age: apiUser.age,
        phone: apiUser.phone,
        department: apiUser.department,
        title: apiUser.title,
        hospital: apiUser.hospital,
        specialties: apiUser.specialties,
        registrationDate: apiUser.registrationDate,
    };
}

// ─── API Functions ───────────────────────────────────────

export async function registerUser(params: {
    id: string;
    password: string;
    role: UserRole;
    name: string;
    gender: Gender;
    age: number;
    phone: string;
    department?: string;
    title?: string;
    hospital?: string;
    specialties?: string;
}): Promise<UserProfile> {
    const data = await apiFetch<UserProfileAPI>('/api/auth/register', {
        method: 'POST',
        body: params,
    });
    return toUserProfile(data);
}

export async function loginUser(params: {
    id: string;
    password: string;
    role: UserRole;
}): Promise<UserProfile> {
    const data = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: params,
    });

    // Store the JWT token
    setToken(data.access_token);

    return toUserProfile(data.user);
}

export async function getMe(): Promise<UserProfile> {
    const data = await apiFetch<UserProfileAPI>('/api/auth/me');
    return toUserProfile(data);
}

export function logoutUser(): void {
    clearToken();
    localStorage.removeItem('neurogen_current_user');
    localStorage.removeItem('neurogen_active_tab');
    localStorage.removeItem('neurogen_patient_view');
    localStorage.removeItem('neurogen_selected_case_id');
}
