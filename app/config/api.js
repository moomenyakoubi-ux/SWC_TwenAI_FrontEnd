export const BACKEND_BASE_URL =
  process.env.EXPO_PUBLIC_BACKEND_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
  process.env.VITE_BACKEND_BASE_URL ||
  'http://localhost:3333';
