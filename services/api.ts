/**
 * Central API client for NeuroGen Connect.
 * All backend requests go through this module.
 * 
 * When deployed without a backend (e.g. Vercel static site),
 * requests will fail fast so localStorage fallbacks kick in.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Detect if we're running on a deployed environment (not localhost).
 * When true, backend API calls should fail fast to trigger fallbacks.
 */
const isDeployed = typeof window !== 'undefined'
    && !window.location.hostname.includes('localhost')
    && !window.location.hostname.includes('127.0.0.1');

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
    // If deployed without backend, fail immediately to trigger fallbacks
    if (isDeployed && !import.meta.env.VITE_API_BASE_URL) {
        throw new Error('Failed to fetch');
    }

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

    // Add a 5-second timeout so requests fail fast when backend is down
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const config: RequestInit = {
        method,
        headers: requestHeaders,
        signal: controller.signal,
    };

    if (body) {
        config.body = isFormData ? body : JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            const errorMessage = errorData.detail || errorData.message || '请求失败';
            throw new Error(errorMessage);
        }

        return response.json();
    } catch (err: any) {
        clearTimeout(timeoutId);
        // Convert AbortError to "Failed to fetch" so fallbacks detect it
        if (err.name === 'AbortError') {
            throw new Error('Failed to fetch');
        }
        throw err;
    }
}

export default { apiFetch, setToken, getToken, clearToken };
