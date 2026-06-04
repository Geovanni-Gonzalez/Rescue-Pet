import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/_/backend' : 'http://localhost:3000');

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api`,
});

// Attach token on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('rescue_pet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto logout on 401/403 (expired or invalid token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      (error.response?.status === 401 || error.response?.status === 403) &&
      // Only auto-logout for token issues, not RBAC denials
      (error.response?.data?.error?.includes('Token') ||
       error.response?.data?.error?.includes('Acceso denegado. Token'))
    ) {
      localStorage.removeItem('rescue_pet_token');
      localStorage.removeItem('rescue_pet_user');
      // Redirect to login without full page reload if possible
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error || fallback;
  }
  return fallback;
}

export function isNetworkError(error: unknown) {
  return axios.isAxiosError(error) && (error.code === 'ERR_NETWORK' || error.message === 'Network Error');
}
