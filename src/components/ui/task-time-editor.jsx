import React, { useEffect, useState } from 'react';
import { taskApi, scheduleApi } from '../../lib/api';
import { notify } from './feedback';
import { Clock, AlertTriangle, Pencil } from 'lucide-react';

// Employee time editing for one assignment. Rules are enforced on the server:
//   - today or future, not completed
//   - inside working hours, not starting in a break
//   - an overlap is shown as a warning, not blocked
export default function TaskTimeEditor({ assignment, onSaved }) {
  const task = assignment.task;
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(task.task_date || '');
  const [start, setStart] = useState(task.start_time || '');
  const [minutes, setMinutes] = useState(60);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState(null);
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    scheduleApi.get().then((r) => setSchedule(r.data)).catch(() => {});
  }, []);

  const locked = ['COMPLETED', 'CANCELLED'].includes(assignment.assignment_status);
  if (!task.task_date && !task.start_time) return null;

  const save = async (e) => {
    e.preventDefault();
    setWarning(null);
    try {
      setSaving(true);
      const res = await taskApi.editAssignmentTime(assignment.assignment_id, {
        date: date || undefined,
        start,
        duration_minutes: Number(minutes),
        reason: reason || undefined,
      });
      if (res.data.warning) {
        // Saved, but tell the employee it clashes.
        setWarning(res.data);
      } else {
        notify.success(`Time updated to ${res.data.start_time}–${res.data.end_time}.`);
        setOpen(false);
        setReason('');
      }
      if (onSaved) await onSaved();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const input = 'px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand';

  if (!open) {
    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="w-4 h-4" />
            <span>
              Scheduled: <span className="font-semibold text-slate-800">{task.task_date || 'no date'}</span>
              {task.start_time && <> · <span className="font-semibold text-slate-800">{task.start_time}</span>–{task.end_time}</>}
            </span>
          </div>
          {!locked && (
            <button
              onClick={() => {
                setDate(task.task_date || '');
                setStart(task.start_time || '');
                setOpen(true);
              }}
              className="text-xs font-semibold text-brand hover:text-brand-dark flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5" /> Change time
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="bg-slate-50 rounded-xl p-4 border border-brand-light space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <Clock className="w-4 h-4 text-brand" /> Change this task's time
      </div>
      {schedule && (
        <p className="text-[10px] text-slate-500">
          Working day {schedule.start}–{schedule.end}. Breaks: {schedule.breaks.map((b) => `${b.start}–${b.end}`).join(', ') || 'none'}.
        </p>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start</label>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Minutes</label>
          <input type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={`${input} w-20`} />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reason (optional)</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. client call this morning" className={`${input} w-full`} />
      </div>

      {warning && warning.overlaps?.length > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">Saved, but this now overlaps:</p>
            <ul className="list-disc ml-4 mt-0.5">
              {warning.overlaps.map((o) => <li key={o.task_id}>{o.title} ({o.start}–{o.end})</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => { setOpen(false); setWarning(null); }} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
          {warning ? 'Close' : 'Cancel'}
        </button>
        {!warning && (
          <button type="submit" disabled={saving} className="px-4 py-1.5 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-lg disabled:opacity-50">
            {saving ? 'Saving…' : 'Save time'}
          </button>
        )}
      </div>
    </form>
  );
}
