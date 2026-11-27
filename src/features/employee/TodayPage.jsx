import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { taskApi, attendanceApi } from '../../lib/api';
import { notify, LoadingSkeleton } from '../../components/ui/feedback';
import { taskSource } from '../../lib/utils';
import { Clock, Repeat, User, CalendarCheck, CheckCircle2 } from 'lucide-react';

// The Today tab: a timeline of today's tasks, recurring and assigned, with
// progress. Status is changed in the task itself, not here.
export default function TodayPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

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

  if (loading || !data) return <LoadingSkeleton />;

  const all = [...data.recurring, ...data.assigned].sort((a, b) =>
    String(a.start_time || '99:99').localeCompare(String(b.start_time || '99:99'))
  );
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

      {all.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Nothing scheduled for today.</p>
          <p className="text-xs text-slate-500 mt-1">Tasks dated today — recurring or assigned — appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {all.map((t) => {
            const source = taskSource(
              { task_type: t.source === 'recurring' ? 'RECURRING' : 'ONE_OFF', auto_generated: t.source === 'recurring' },
              t.frequency
            );
            return (
              <Link
                key={t.assignment_id}
                to={`/employee/tasks?open=${t.task_id}`}
                className="flex items-stretch gap-4 p-4 hover:bg-slate-50 transition"
              >
                <div className="w-16 flex-shrink-0 text-right">
                  <p className="text-xs font-bold text-slate-900">{t.start_time || '—'}</p>
                  <p className="text-[10px] text-slate-400">{t.end_time || ''}</p>
                </div>
                <div className={`w-0.5 rounded ${t.source === 'recurring' ? 'bg-violet-300' : 'bg-brand/40'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{t.title}</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    {t.source === 'recurring' ? <Repeat className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {t.source === 'recurring' ? `Recurring${t.frequency ? ' · ' + t.frequency.toLowerCase() : ''}` : `Assigned${t.assigned_by ? ' by ' + t.assigned_by : ''}`}
                  </p>
                </div>
                <span className={`self-center text-[10px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                  t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : t.status === 'MISSED' ? 'bg-red-100 text-red-700' : t.status === 'IN_PROGRESS' ? 'bg-brand-light text-brand-dark' : 'bg-slate-100 text-slate-600'
                }`}>
                  {t.status.replace('_', ' ')}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-slate-500 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Open a task to change its status.
      </p>
    </div>
  );
}
