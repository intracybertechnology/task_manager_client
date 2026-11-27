import React, { useEffect, useState } from 'react';
import { missedApi, adminApi } from '../../lib/api';
import { notify, confirmDialog, LoadingSkeleton } from '../../components/ui/feedback';
import { Modal } from '../../components/ui/dialog';
import { AlertTriangle, RefreshCw, UserPlus, X } from 'lucide-react';
import { localDateStr } from '../../lib/utils';

export default function AdminMissedTasksPage() {
  const [date, setDate] = useState(localDateStr());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [target, setTarget] = useState(null); // { person, task }
  const [form, setForm] = useState({ employee_id: '', date: '', start: '09:00', duration_minutes: 60, note: '' });
  const [saving, setSaving] = useState(false);

  const load = async (d = date) => {
    try {
      setLoading(true);
      const res = await missedApi.summary(d);
      setData(res.data);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    adminApi.getUsers({ is_active: true }).then((r) => setEmployees((r.data || []).filter((u) => u.role !== 'ADMIN'))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const runJob = async () => {
    if (!(await confirmDialog(`Mark unfinished dated tasks for ${date} as missed? Tasks already completed are untouched.`))) return;
    try {
      const res = await missedApi.run(date);
      notify.success(res.data.marked ? `${res.data.marked} task(s) marked missed.` : res.data.skipped || 'Nothing to mark.');
      await load();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const openReassign = (person, task) => {
    setTarget({ person, task });
    setForm({
      employee_id: task.assigneeEmployeeId || person.employee.id,
      date: localDateStr(),
      start: task.start_time || '09:00',
      duration_minutes: 60,
      note: '',
    });
  };

  const submitReassign = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await missedApi.reassign(target.task.assignee_id, {
        employee_id: form.employee_id,
        date: form.date || undefined,
        start: form.start,
        duration_minutes: Number(form.duration_minutes),
        note: form.note || undefined,
      });
      notify.success('New task created for the chosen person. The missed one stays on record.');
      setTarget(null);
      await load();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" /> Missed Tasks
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Unfinished dated tasks are marked missed at 23:10 each day. They stay on that day's record and never carry over.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value || localDateStr())} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs" />
          <button onClick={() => load()} className="p-2 text-slate-500 hover:text-brand" title="Refresh"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={runJob} className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold">Run for this date</button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : !data || data.total === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Nobody missed anything on {date}.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-600">
            <span className="font-bold text-red-600">{data.total}</span> missed task(s) across {data.people.length} {data.people.length === 1 ? 'person' : 'people'}.
          </p>
          <div className="space-y-4">
            {data.people.map((p) => (
              <div key={p.employee.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {p.employee.first_name} {p.employee.last_name} missed {p.count}
                    </p>
                    <p className="text-[11px] text-slate-500">{p.employee.department?.name || 'Unassigned'} · {p.employee.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {p.tasks.map((t) => (
                    <div key={t.assignee_id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-red-50/50 border border-red-100">
                      <div className="text-xs">
                        <p className="font-semibold text-slate-800">{t.title}</p>
                        {t.start_time && <p className="text-[10px] text-slate-500">{t.start_time}–{t.end_time}</p>}
                      </div>
                      <button onClick={() => openReassign(p, { ...t, assigneeEmployeeId: p.employee.id })} className="px-2.5 py-1 bg-brand text-white rounded-lg text-[11px] font-semibold hover:bg-brand-dark flex items-center gap-1">
                        <UserPlus className="w-3 h-3" /> Reassign
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {target && (
        <Modal open onOpenChange={(o) => { if (!o) setTarget(null); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">Reassign "{target.task.title}"</h2>
              <button onClick={() => setTarget(null)} className="text-slate-500 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              This creates a NEW task. The missed one stays on {data?.date}'s record.
            </p>
            <form onSubmit={submitReassign} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Assign to *</label>
                <select required value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className={input}>
                  <option value="">-- choose --</option>
                  {employees.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={input} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Start</label>
                  <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className={input} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Minutes</label>
                  <input type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className={input} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Note (optional)</label>
                <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={input} placeholder="e.g. carry over to tomorrow morning" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setTarget(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-lg disabled:opacity-50">{saving ? 'Creating…' : 'Create new task'}</button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
