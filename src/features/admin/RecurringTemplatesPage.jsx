import React, { useEffect, useState } from 'react';
import { templateApi, adminApi, scheduleApi } from '../../lib/api';
import { notify, confirmDialog, LoadingSkeleton } from '../../components/ui/feedback';
import { Modal } from '../../components/ui/dialog';
import { Repeat, Plus, X, Power, Play } from 'lucide-react';

const DAYS = [
  { v: 1, l: 'Mon' },
  { v: 2, l: 'Tue' },
  { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' },
  { v: 5, l: 'Fri' },
  { v: 6, l: 'Sat' },
  { v: 0, l: 'Sun' },
];

const emptyForm = {
  title: '',
  description: '',
  department_id: '',
  frequency: 'DAILY',
  weekdays: [],
  day_of_month: 1,
  start_time: '09:00',
  duration_minutes: 60,
  priority: 'MEDIUM',
  assignee_mode: 'DEPARTMENT',
  members: [],
};

const describeFrequency = (t) =>
  t.frequency === 'DAILY'
    ? 'Every day'
    : t.frequency === 'WEEKLY'
    ? t.weekdays.length
      ? 'Every ' + t.weekdays.map((d) => DAYS.find((x) => x.v === d)?.l).join(', ')
      : 'Every day'
    : `Day ${t.day_of_month} of each month`;

export default function RecurringTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [t, d, e, s] = await Promise.all([
        templateApi.list(),
        adminApi.getDepartments(),
        adminApi.getUsers({ is_active: true }),
        scheduleApi.get(),
      ]);
      setTemplates(t.data);
      setDepartments(d.data);
      setEmployees((e.data || []).filter((u) => u.role !== 'ADMIN'));
      setSchedule(s.data);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      description: t.description || '',
      department_id: t.department_id || '',
      frequency: t.frequency,
      weekdays: Array.isArray(t.weekdays) ? t.weekdays : [],
      day_of_month: t.day_of_month || 1,
      start_time: t.start_time,
      duration_minutes: t.duration_minutes,
      priority: t.priority,
      assignee_mode: t.assignee_mode,
      members: (t.members || []).map((m) => ({ employee_id: m.employee_id, mode: m.mode })),
    });
    setShowModal(true);
  };

  const toggleWeekday = (v) =>
    setForm((f) => ({ ...f, weekdays: f.weekdays.includes(v) ? f.weekdays.filter((d) => d !== v) : [...f.weekdays, v] }));

  const toggleMember = (id) => {
    setForm((f) => {
      const existing = f.members.find((m) => m.employee_id === id);
      if (!existing) return { ...f, members: [...f.members, { employee_id: id, mode: 'ADD' }] };
      // third click removes
      if (existing.mode === 'ADD') return { ...f, members: f.members.map((m) => (m.employee_id === id ? { ...m, mode: 'EXCLUDE' } : m)) };
      return { ...f, members: f.members.filter((m) => m.employee_id !== id) };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        department_id: form.department_id || null,
        day_of_month: Number(form.day_of_month),
        duration_minutes: Number(form.duration_minutes),
      };
      if (editingId) await templateApi.update(editingId, payload);
      else await templateApi.create(payload);
      notify.success(editingId ? 'Template updated.' : 'Template created.');
      setShowModal(false);
      await load();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (t) => {
    if (!(await confirmDialog(`Stop generating "${t.title}"? Existing tasks are kept.`))) return;
    try {
      await templateApi.deactivate(t.id);
      await load();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const runToday = async () => {
    if (!(await confirmDialog("Create today's tasks from all active templates now? Safe to repeat."))) return;
    try {
      setRunning(true);
      const res = await templateApi.generate();
      const d = res.data;
      notify.success(d.is_off_day ? 'Today is a company off day; nothing generated.' : `${d.created} task(s) created.`);
      await load();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setRunning(false);
    }
  };

  const input = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Repeat className="w-6 h-6 text-brand" /> Recurring Tasks
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Templates that create dated tasks automatically (runs daily at 00:05, and catches up at login).
            {schedule && <span className="text-slate-400"> Working day: {schedule.start}–{schedule.end}, {Math.floor(schedule.effective_minutes / 60)}h effective.</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={runToday} disabled={running} className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50">
            <Play className="w-3.5 h-3.5" /> {running ? 'Running…' : 'Generate today'}
          </button>
          <button onClick={openCreate} className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New template
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <Repeat className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">No recurring templates yet.</p>
          <p className="text-xs text-slate-500 mt-1">Create one to have tasks generated automatically each day.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-bold">Template</th>
                  <th className="py-3 px-4 font-bold">Runs</th>
                  <th className="py-3 px-4 font-bold">Time</th>
                  <th className="py-3 px-4 font-bold">People</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {templates.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{t.title}</p>
                      <p className="text-[10px] text-slate-500">{t.department?.name || 'No department'} · {t.priority}</p>
                    </td>
                    <td className="py-3 px-4">{describeFrequency(t)}</td>
                    <td className="py-3 px-4">{t.start_time} · {t.duration_minutes}m</td>
                    <td className="py-3 px-4">
                      {t.assignee_mode === 'DEPARTMENT' ? 'Whole department' : 'Only listed people'}
                      {t.members?.length > 0 && (
                        <span className="text-[10px] text-slate-500 block">
                          {t.members.filter((m) => m.mode === 'ADD').length} added · {t.members.filter((m) => m.mode === 'EXCLUDE').length} excluded
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {t.is_active ? 'Active' : 'Stopped'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button onClick={() => openEdit(t)} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold">Edit</button>
                      {t.is_active && (
                        <button onClick={() => deactivate(t)} className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-semibold">
                          <Power className="w-3 h-3 inline" /> Stop
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <Modal open onOpenChange={(o) => { if (!o) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit template' : 'New recurring template'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Title *</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} placeholder="e.g. Daily standup prep" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Department</label>
                  <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className={input}>
                    <option value="">-- None --</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={input}>
                    {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Frequency *</label>
                  <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={input}>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Start time *</label>
                  <input type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={input} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Duration (min) *</label>
                  <input type="number" min={1} required value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className={input} />
                </div>
              </div>

              {form.frequency === 'WEEKLY' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Days (none = every day)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((d) => (
                      <button type="button" key={d.v} onClick={() => toggleWeekday(d.v)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${form.weekdays.includes(d.v) ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>{d.l}</button>
                    ))}
                  </div>
                </div>
              )}

              {form.frequency === 'MONTHLY' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Day of month (31 = last day)</label>
                  <input type="number" min={1} max={31} value={form.day_of_month} onChange={(e) => setForm({ ...form, day_of_month: e.target.value })} className={`${input} w-24`} />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Who gets it</label>
                <select value={form.assignee_mode} onChange={(e) => setForm({ ...form, assignee_mode: e.target.value })} className={`${input} mb-2`}>
                  <option value="DEPARTMENT">Everyone in the department</option>
                  <option value="PEOPLE">Only the people I add below</option>
                </select>
                <p className="text-[10px] text-slate-500 mb-2">
                  Click a person to include them. Click again to exclude them. Click a third time to clear. Leave/half-day people are skipped each day.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {employees.map((emp) => {
                    const m = form.members.find((x) => x.employee_id === emp.id);
                    return (
                      <button
                        type="button"
                        key={emp.id}
                        onClick={() => toggleMember(emp.id)}
                        className={`text-left px-2 py-1.5 rounded-lg text-[11px] border ${m?.mode === 'ADD' ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold' : m?.mode === 'EXCLUDE' ? 'bg-red-50 border-red-300 text-red-700 line-through' : 'bg-white border-slate-200 text-slate-700'}`}
                      >
                        {emp.first_name} {emp.last_name}
                        {m && <span className="block text-[9px] font-bold uppercase">{m.mode}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save template'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
