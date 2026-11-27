import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskApi, attendanceApi } from '../../lib/api';
import { notify, LoadingSkeleton } from '../../components/ui/feedback';
import { Clock, Repeat, User, CalendarCheck, CheckCircle2 } from 'lucide-react';

// The Today tab: a timeline of today's tasks, recurring and assigned, with
// progress. Status is changed per row with the same dropdown used everywhere;
// clicking elsewhere on a row opens the task.
const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];

const statusClass = (status) =>
  status === 'COMPLETED'
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : status === 'MISSED'
    ? 'bg-red-100 text-red-700 border-red-200'
    : status === 'IN_PROGRESS'
    ? 'bg-brand-light text-brand-dark border-brand-light'
    : status === 'ON_HOLD'
    ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-slate-100 text-slate-600 border-slate-200';

export default function TodayPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [tab, setTab] = useState('recurring');
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    try {
      const res = await taskApi.myToday();
      setData(res.data);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAttendance = async () => {
    try {
      setMarking(true);
      await attendanceApi.markMe();
      notify.success('Marked present for today.');
      await load();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setMarking(false);
    }
  };

  // Optimistic status change: the row updates immediately, and is put back if
  // the server refuses, so the screen never claims something that did not happen.
  const changeStatus = async (task, status) => {
    if (status === task.status) return;
    const previous = task.status;
    setSavingId(task.assignment_id);
    setData((d) => ({
      ...d,
      recurring: d.recurring.map((t) => (t.assignment_id === task.assignment_id ? { ...t, status } : t)),
      assigned: d.assigned.map((t) => (t.assignment_id === task.assignment_id ? { ...t, status } : t)),
    }));
    try {
      await taskApi.updateStatus(task.assignment_id, status, 'Changed from Today list');
      await load(); // re-read progress and any server-side effects
    } catch (err) {
      notify.error(err.message);
      setData((d) => ({
        ...d,
        recurring: d.recurring.map((t) => (t.assignment_id === task.assignment_id ? { ...t, status: previous } : t)),
        assigned: d.assigned.map((t) => (t.assignment_id === task.assignment_id ? { ...t, status: previous } : t)),
      }));
    } finally {
      setSavingId(null);
    }
  };

  if (loading || !data) return <LoadingSkeleton />;

  const byTime = (a, b) => String(a.start_time || '99:99').localeCompare(String(b.start_time || '99:99'));
  const recurring = [...data.recurring].sort(byTime);
  const assigned = [...data.assigned].sort(byTime);
  const shown = tab === 'recurring' ? recurring : assigned;
  const pct = data.progress.total ? Math.round((data.progress.done / data.progress.total) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Today</h1>
          <p className="text-sm text-slate-500 mt-1">{data.date} · your schedule for the day</p>
        </div>
        {data.attendance_marked ? (
          <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-xs font-semibold">
            <CalendarCheck className="w-4 h-4" /> Attendance marked
          </span>
        ) : (
          <button
            onClick={markAttendance}
            disabled={marking}
            className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold disabled:opacity-50"
          >
            {marking ? 'Marking…' : 'Mark attendance'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-800">Progress</span>
          <span className="text-slate-500"><span className="font-bold text-slate-900">{data.progress.done}</span> of {data.progress.total} done</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Two tabs: what repeats today, and what was assigned to you. One page, one progress bar. */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'recurring', label: `Recurring (${recurring.length})`, icon: <Repeat className="w-3.5 h-3.5" /> },
          { id: 'assigned', label: `New tasks (${assigned.length})`, icon: <User className="w-3.5 h-3.5" /> },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 transition ${
              tab === t.id ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">
            {tab === 'recurring' ? 'No recurring tasks today.' : 'Nothing assigned to you right now.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {tab === 'recurring'
              ? 'Recurring tasks for today appear here when they are generated.'
              : 'Assigned tasks stay on this list until they are completed.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {shown.map((t) => (
            <div
              key={t.assignment_id}
              onClick={() => navigate(`/employee/tasks?open=${t.task_id}`)}
              className={`flex items-stretch gap-4 p-4 hover:bg-slate-50 transition cursor-pointer ${
                t.status === 'COMPLETED' ? 'bg-emerald-50/40' : ''
              }`}
            >
              <div className="w-16 flex-shrink-0 text-right">
                <p className="text-xs font-bold text-slate-900">{t.start_time || '—'}</p>
                <p className="text-[10px] text-slate-400">{t.end_time || ''}</p>
              </div>
              <div className={`w-0.5 rounded ${tab === 'recurring' ? 'bg-violet-300' : t.overdue || t.missed ? 'bg-red-400' : 'bg-brand/40'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${t.status === 'COMPLETED' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                  {t.title}
                </p>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {tab === 'recurring' ? <Repeat className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {tab === 'recurring'
                    ? `Recurring${t.frequency ? ' · ' + t.frequency.toLowerCase() : ''}`
                    : `Assigned${t.assigned_by ? ' by ' + t.assigned_by : ''}`}
                  {t.due_date && (
                    <span className={t.overdue ? 'text-red-600 font-semibold' : ''}>
                      · due {t.due_date}{t.overdue ? ' (overdue)' : ''}
                    </span>
                  )}
                  {(t.overdue || t.missed) && t.status !== 'COMPLETED' && (
                    <span className="text-[9px] font-bold text-red-600">⚠ attention</span>
                  )}
                </p>
              </div>
              {/* Status dropdown: the same control used on My Tasks. Stops the row
                  click so changing status never opens the task. */}
              <div className="self-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <select
                  value={t.status}
                  disabled={savingId === t.assignment_id || t.status === 'CANCELLED'}
                  onChange={(e) => changeStatus(t, e.target.value)}
                  title={t.status === 'MISSED' ? 'Missed at the cutoff — you can still mark it done now.' : 'Change status'}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-70 ${statusClass(t.status)}`}
                >
                  {/* MISSED has no option of its own: it is a past fact, not a choice.
                      It stays visible until the person picks a real status. */}
                  {t.status === 'MISSED' && <option value="MISSED" disabled>MISSED</option>}
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Change status here, or click a row to open the task.
      </p>
    </div>
  );
}
