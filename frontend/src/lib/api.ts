import axios from 'axios';

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error || fallback;
  }

  return fallback;
}

export function isNetworkError(error: unknown) {
  return axios.isAxiosError(error) && (error.code === 'ERR_NETWORK' || error.message === 'Network Error');
}
