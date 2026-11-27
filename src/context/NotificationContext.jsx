import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { notificationApi } from '../lib/api';
import { createSocket } from '../lib/socket';
import { useAuth } from './AuthContext';

// Holds the bell's state and the live socket:
//  - loads saved notifications after login (so nothing is lost while offline)
//  - pushes new ones from the socket, saving them first server-side
//  - marks read / dismisses against the server, then updates locally

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const res = await notificationApi.list();
      const serverItems = res.data.items || [];
      // Merge rather than replace: a socket event may have arrived while this
      // request was in flight. Keep any row the server has not returned yet,
      // and never show the same notification twice (dedupe by id).
      setItems((prev) => {
        const byId = new Map();
        [...serverItems, ...prev].forEach((n) => {
          // Server copy wins, because it carries the authoritative is_read state.
          if (!byId.has(n.id)) byId.set(n.id, n);
        });
        return [...byId.values()].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      });
      setUnread(res.data.unread_count || 0);
    } catch {
      // Not signed in yet or API unreachable: the bell simply stays empty.
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnread(0);
      return undefined;
    }

    refresh();

    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('notification', (n) => {
      let added = false;
      setItems((prev) => {
        if (prev.some((x) => x.id === n.id)) return prev;
        added = true;
        return [n, ...prev];
      });
      // Count it only if it was not already in the list (a refresh may have won the race).
      if (added) setUnread((u) => u + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, refresh]);

  const markRead = async (id) => {
    await notificationApi.markRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const dismiss = async (id) => {
    const wasUnread = items.find((n) => n.id === id && !n.is_read);
    await notificationApi.dismiss(id);
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnread((u) => Math.max(0, u - 1));
  };

  const clearRead = async () => {
    await notificationApi.clearRead();
    setItems((prev) => prev.filter((n) => !n.is_read));
  };

  return (
    <NotificationContext.Provider
      value={{ items, unread, connected, refresh, markRead, markAllRead, dismiss, clearRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
