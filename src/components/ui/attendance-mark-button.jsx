import React, { useEffect, useState } from 'react';
import { attendanceApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { notify, confirmDialog } from './feedback';
import { CalendarCheck, Loader2 } from 'lucide-react';

// One-click self attendance for employees and managers.
// Hidden for admins (they do not mark attendance).
export default function AttendanceMarkButton() {
  const { user } = useAuth();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const canSelfMark = user?.role === 'EMPLOYEE' || user?.role === 'MANAGER';

  const load = async () => {
    try {
      setLoading(true);
      const res = await attendanceApi.getMyToday();
      setState(res.data);
    } catch {
      // Silent: the header should not break the app if this fails.
      setState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canSelfMark) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSelfMark]);

  if (!canSelfMark) return null;
  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin text-slate-400" aria-label="Loading attendance" />;
  }
  if (!state) return null;

  const handleMark = async () => {
    // Confirm before marking: once the cutoff passes, an admin is needed to change it.
    const confirmed = await confirmDialog(
      `Mark yourself present for today (${state.date})?${
        state.cutoff ? ` You can mark until ${state.cutoff}.` : ''
      }`
    );
    if (!confirmed) return;

    try {
      setSending(true);
      await attendanceApi.markMe();
      await load();
      notify.success('Marked present for today.');
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSending(false);
    }
  };

  if (state.marked_at) {
    const time = new Date(state.marked_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return (
      <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap">
        <CalendarCheck className="w-3.5 h-3.5" />
        Present · {time}
      </span>
    );
  }

  // Off day: nobody marks. After the cutoff: only an admin can change it.
  if (!state.can_mark) {
    const label = state.is_off_day
      ? 'Off day · no attendance'
      : state.status === 'ABSENT'
      ? 'Absent · admin only'
      : `Marking closed (${state.cutoff || '11:55'})`;
    return (
      <span className="flex items-center gap-1.5 text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap">
        <CalendarCheck className="w-3.5 h-3.5" />
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleMark}
      disabled={sending}
      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand hover:bg-brand-dark rounded-lg px-3 py-1.5 shadow-sm transition disabled:opacity-50 whitespace-nowrap"
    >
      <CalendarCheck className="w-3.5 h-3.5" />
      {sending ? 'Marking…' : 'Mark Present'}
    </button>
  );
}
