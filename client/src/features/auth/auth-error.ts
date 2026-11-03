import axios from 'axios';

export function getAuthErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
    return error.response?.data?.error?.message ?? 'We could not complete that request. Please try again.';
  }
  return 'We could not complete that request. Please try again.';
}
