import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// The socket lives on the same host as the API, at its root (not under /api/v1).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export const createSocket = (token) =>
  io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

// Subscribes to dashboard change signals and returns an unsubscribe function.
// Only fires for admins (the server puts them in the 'admins' room).
export const onDashboardChange = (socket, handler) => {
  const events = ['dashboard:task', 'dashboard:attendance'];
  events.forEach((e) => socket.on(e, handler));
  return () => events.forEach((e) => socket.off(e, handler));
};
