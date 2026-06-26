import { API_BASE_URL } from '../constants';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number>;
}

const getAuthToken = (): string | null => {
  try {
    const saved = localStorage.getItem('satguru_auth');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed?.token || null;
    }
  } catch (e) {
    console.error("Error reading token from localStorage:", e);
  }
  return null;
};

const updateAuthToken = (newToken: string, newUser: any) => {
  try {
    const saved = localStorage.getItem('satguru_auth');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.token = newToken;
      parsed.user = newUser;
      localStorage.setItem('satguru_auth', JSON.stringify(parsed));
    }
  } catch (e) {
    console.error("Error updating token in localStorage:", e);
  }
};

const clearAuth = () => {
  localStorage.removeItem('satguru_auth');
  window.dispatchEvent(new Event('auth-logout'));
};

let isRefreshing = false;
let refreshQueue: ((token: string) => void)[] = [];

const processQueue = (token: string) => {
  refreshQueue.forEach((callback) => callback(token));
  refreshQueue = [];
};

export async function apiFetch(endpoint: string, options: FetchOptions = {}): Promise<any> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      searchParams.append(key, String(val));
    });
    url += (url.includes('?') ? '&' : '?') + searchParams.toString();
  }

  const fetchOptions = { ...options, headers };

  try {
    const response = await fetch(url, fetchOptions);
    
    if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.endsWith('/login')) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((newToken) => {
            headers.set('Authorization', `Bearer ${newToken}`);
            resolve(apiFetch(endpoint, options));
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!refreshRes.ok) {
          throw new Error('Refresh token expired or invalid');
        }

        const data = await refreshRes.json();
        updateAuthToken(data.token, data.user);
        isRefreshing = false;
        processQueue(data.token);

        headers.set('Authorization', `Bearer ${data.token}`);
        return apiFetch(endpoint, options);
      } catch (refreshErr) {
        isRefreshing = false;
        refreshQueue = [];
        clearAuth();
        throw refreshErr;
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      let errJson;
      try {
        errJson = JSON.parse(errText);
      } catch (e) {}
      throw new Error(errJson?.error || errText || `Request failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    throw error;
  }
}

export const api = {
  get: (endpoint: string, options?: FetchOptions) => apiFetch(endpoint, { ...options, method: 'GET' }),
  post: (endpoint: string, body?: any, options?: FetchOptions) => 
    apiFetch(endpoint, { 
      ...options, 
      method: 'POST', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
  put: (endpoint: string, body?: any, options?: FetchOptions) => 
    apiFetch(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
  patch: (endpoint: string, body?: any, options?: FetchOptions) => 
    apiFetch(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),
  delete: (endpoint: string, options?: FetchOptions) => apiFetch(endpoint, { ...options, method: 'DELETE' }),
};
