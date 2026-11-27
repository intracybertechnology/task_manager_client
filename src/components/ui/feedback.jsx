import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, X, Bell } from 'lucide-react';
import { Modal } from './dialog';

let toasts = [];
let toastId = 0;
const toastListeners = new Set();
let confirmSetter = null;

const emitToasts = () => toastListeners.forEach((fn) => fn([...toasts]));

const dismissToast = (id) => {
  toasts = toasts.filter((t) => t.id !== id);
  emitToasts();
};

const pushToast = (type, message) => {
  const id = ++toastId;
  toasts = [...toasts, { id, type, message }];
  emitToasts();
  setTimeout(() => dismissToast(id), 4000);
};

export const notify = {
  success: (message) => pushToast('success', message),
  error: (message) => pushToast('error', message),
  info: (message) => pushToast('info', message),
};

export const confirmDialog = (message) =>
  new Promise((resolve) => {
    if (confirmSetter) {
      confirmSetter({ message, resolve });
    } else {
      resolve(window.confirm(message));
    }
  });

export function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse py-4" aria-busy="true">
      <div className="h-5 w-1/3 bg-slate-200 rounded" />
      <div className="h-16 bg-slate-100 rounded-xl" />
      <div className="h-16 bg-slate-100 rounded-xl" />
      <div className="h-16 bg-slate-100 rounded-xl" />
    </div>
  );
}

export function FeedbackProvider({ children }) {
  const [items, setItems] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  useEffect(() => {
    toastListeners.add(setItems);
    confirmSetter = setConfirmState;
    return () => {
      toastListeners.delete(setItems);
      confirmSetter = null;
    };
  }, []);

  const answer = (result) => {
    confirmState.resolve(result);
    setConfirmState(null);
  };

  return (
    <>
      {children}

      <div className="fixed top-4 right-4 z-[60] w-[calc(100vw-2rem)] max-w-sm space-y-2 pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3 rounded-xl border shadow-lg bg-white text-xs ${
              t.type === 'success'
                ? 'border-emerald-200'
                : t.type === 'info'
                ? 'border-brand-light'
                : 'border-red-200'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
            ) : t.type === 'info' ? (
              <Bell className="w-4 h-4 mt-0.5 text-brand flex-shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
            )}
            <p className="flex-1 text-slate-800 font-medium leading-relaxed">{t.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <Modal open onOpenChange={(o) => { if (!o) answer(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-100">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900">Please confirm</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">{confirmState.message}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => answer(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => answer(true)}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand hover:bg-brand-dark shadow-sm transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
