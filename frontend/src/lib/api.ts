import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error || fallback;
  }
  return fallback;
}

export function isNetworkError(error: unknown) {
  return axios.isAxiosError(error) && (error.code === 'ERR_NETWORK' || error.message === 'Network Error');
}
