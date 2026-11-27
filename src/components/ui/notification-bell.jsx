import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

const ROLE_HOME = {
  ADMIN: '/admin/tasks',
  MANAGER: '/manager/tasks',
  EMPLOYEE: '/employee/tasks',
};

const relative = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
};

export default function NotificationBell() {
  const { items, unread, connected, markRead, markAllRead, dismiss, clearRead } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const seenRef = useRef(new Set());

  // Open the thing the notification is about: the exact task when we know it,
  // otherwise the notification's link, otherwise the role's home page.
  const openNotification = async (n) => {
    if (!n.is_read) await markRead(n.id).catch(() => {});
    setOpen(false);
    if (n.task_id) {
      navigate(`${ROLE_HOME[user?.role] || '/employee/tasks'}?open=${n.task_id}`);
    } else if (n.link) {
      navigate(n.link);
    } else if (ROLE_HOME[user?.role]) {
      navigate(ROLE_HOME[user.role]);
    }
  };

  // No toast for notifications. Instead, the bell jumps once and the unread
  // badge flashes. `pulseKey` changes only when something new arrives, which
  // restarts the CSS animation; loading existing items does not animate.
  const [pulseKey, setPulseKey] = useState(0);
  const [animating, setAnimating] = useState(false);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    let arrived = false;
    items.forEach((n) => {
      if (seenRef.current.has(n.id)) return;
      seenRef.current.add(n.id);
      if (n.is_read) return;
      // Ignore anything that is not fresh: it came from the saved history.
      const ageMs = Date.now() - new Date(n.createdAt).getTime();
      if (ageMs < 10000) arrived = true;
    });
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    if (arrived) {
      setPulseKey((k) => k + 1);
      setAnimating(true);
    }
  }, [items]);

  // The animation is decorative; stop it after it has played.
  useEffect(() => {
    if (!animating) return undefined;
    const t = setTimeout(() => setAnimating(false), 1500);
    return () => clearTimeout(t);
  }, [animating, pulseKey]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition [.bg-brand-navy_&]:text-slate-100 [.bg-brand-navy_&]:hover:bg-slate-800"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        title={connected ? 'Notifications (live)' : 'Notifications'}
        data-pulse={pulseKey}
      >
        <Bell className={`w-5 h-5 ${animating ? 'animate-belljump' : ''}`} />
        {unread > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ${
              animating ? 'animate-badgeflash' : ''
            }`}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        <span
          className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold text-brand hover:text-brand-dark flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
              <span className="text-slate-200">|</span>
              <button
                onClick={clearRead}
                className="text-[11px] font-semibold text-slate-500 hover:text-red-600"
              >
                Clear read
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500">Nothing here yet.</p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 flex items-start gap-2 ${n.is_read ? 'bg-white' : 'bg-brand-light/40'}`}
                >
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      className="text-left w-full"
                    >
                      <p className="text-xs font-semibold text-slate-900 hover:text-brand">{n.title}</p>
                      {n.body && <p className="text-[11px] text-slate-600 mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {relative(n.createdAt)}
                        {n.task_id && <span className="ml-1 text-brand font-semibold">· open task</span>}
                      </p>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    {!n.is_read && (
                      <button
                        onClick={() => markRead(n.id)}
                        title="Mark read"
                        className="p-1 text-slate-400 hover:text-emerald-600"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => dismiss(n.id)}
                      title="Dismiss"
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
