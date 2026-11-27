import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskApi, attendanceApi } from '../../lib/api';
import { Modal } from './dialog';
import { notify } from './feedback';
import { taskSource } from '../../lib/utils';
import { Repeat, User, CheckCircle2, Clock, CalendarCheck } from 'lucide-react';

// The login popup: today's tasks (recurring and assigned), a reminder to mark
// attendance, and today's progress. Shown once per day per user; a row opens the
// task, where its status is set (status lives in one place only).
const DISMISS_KEY = 'dayStartDismissed';

export default function DayStartPopup() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await taskApi.myToday();
        setData(res.data);
        // Show once per company date.
        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (dismissed !== res.data.date) setOpen(true);
      } catch {
        // Not signed in or no endpoint access: stay silent.
      }
    };
    load();
  }, []);

  const dismiss = () => {
    if (data?.date) {
      try {
        localStorage.setItem(DISMISS_KEY, data.date);
      } catch {
        /* storage may be blocked; the popup simply shows next reload */
      }
    }
    setOpen(false);
  };

  const goToTask = (taskId) => {
    dismiss();
    navigate(`/employee/tasks?open=${taskId}`);
  };

  const markAttendance = async () => {
    try {
      setMarking(true);
      await attendanceApi.markMe();
      notify.success('Marked present for today.');
      const res = await taskApi.myToday();
      setData(res.data);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setMarking(false);
    }
  };

  if (!open || !data) return null;

  const total = data.recurring.length + data.assigned.length;
  const showAttendance = !data.attendance_marked;

  const Row = ({ t }) => {
    const source = taskSource(
      { task_type: t.source === 'recurring' ? 'RECURRING' : 'ONE_OFF', auto_generated: t.source === 'recurring' },
      t.frequency
    );
    return (
      <button
        type="button"
        onClick={() => goToTask(t.task_id)}
        className="w-full text-left p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-brand-light/50 transition flex items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate">{t.title}</p>
          <p className="text-[10px] text-slate-500">
            {t.start_time ? `${t.start_time}–${t.end_time}` : 'No time set'}
            {t.source !== 'recurring' && t.assigned_by ? ` · by ${t.assigned_by}` : ''}
          </p>
        </div>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            source.key === 'recurring' ? 'bg-violet-50 text-violet-700' : source.key === 'reassigned' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {source.key === 'recurring' ? '↻ ' : ''}{source.label}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : t.status === 'MISSED' ? 'bg-red-100 text-red-700' : 'bg-white border border-slate-200 text-slate-600'
          }`}>
            {t.status.replace('_', ' ')}
          </span>
        </span>
      </button>
    );
  };

  return (
    <Modal open onOpenChange={(o) => { if (!o) dismiss(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Good day — here is today</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.date} · {total === 0 ? 'nothing scheduled' : `${data.progress.done} of ${data.progress.total} done`}
          </p>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {showAttendance && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
              <p className="text-xs text-amber-900 flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4" /> You have not marked attendance yet today.
              </p>
              <button
                onClick={markAttendance}
                disabled={marking}
                className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-[11px] font-semibold disabled:opacity-50 whitespace-nowrap"
              >
                {marking ? 'Marking…' : 'Mark present'}
              </button>
            </div>
          )}

          {data.recurring.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5" /> Recurring today ({data.recurring.length})
              </h3>
              <div className="space-y-1.5">{data.recurring.map((t) => <Row key={t.assignment_id} t={t} />)}</div>
            </div>
          )}

          {data.assigned.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Assigned to you ({data.assigned.length})
              </h3>
              <div className="space-y-1.5">{data.assigned.map((t) => <Row key={t.assignment_id} t={t} />)}</div>
            </div>
          )}

          {total === 0 && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-slate-600">No tasks scheduled for today.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Open a task to update its status</span>
          <div className="flex gap-2">
            <button onClick={dismiss} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Close</button>
            <button
              onClick={() => { dismiss(); navigate('/employee/today'); }}
              className="px-4 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold"
            >
              Today tab →
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
