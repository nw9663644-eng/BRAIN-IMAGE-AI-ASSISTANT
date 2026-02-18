/**
 * Central API client for NeuroGen Connect.
 * All backend requests go through this module.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ─── Token Management ────────────────────────────────────

let accessToken: string | null = null;

export const setToken = (token: string | null) => {
    accessToken = token;
    if (token) {
        localStorage.setItem('neurogen_token', token);
    } else {
        localStorage.removeItem('neurogen_token');
    }
};

export const getToken = (): string | null => {
    if (!accessToken) {
        accessToken = localStorage.getItem('neurogen_token');
    }
    return accessToken;
};

export const clearToken = () => {
    accessToken = null;
    localStorage.removeItem('neurogen_token');
};

// ─── Fetch Wrapper ───────────────────────────────────────

interface ApiOptions {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    isFormData?: boolean;
}

export async function apiFetch<T = any>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<T> {
    const { method = 'GET', body, headers = {}, isFormData = false } = options;

    const token = getToken();
    const requestHeaders: Record<string, string> = {
        ...headers,
    };

    if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (!isFormData && body) {
        requestHeaders['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
        method,
        headers: requestHeaders,
    };

    if (body) {
        config.body = isFormData ? body : JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        const errorMessage = errorData.detail || errorData.message || '请求失败';
        throw new Error(errorMessage);
    }

    return response.json();
}

export default { apiFetch, setToken, getToken, clearToken };
