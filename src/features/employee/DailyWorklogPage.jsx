import { Modal } from '../../components/ui/dialog';
import { notify, confirmDialog, LoadingSkeleton } from '../../components/ui/feedback';
import React, { useState, useEffect } from 'react';
import { worklogApi, taskApi, projectApi } from '../../lib/api';
import { formatMinutes, localDateStr, localDateOffset } from '../../lib/utils';
import { SubmitReminder } from '../../components/ui/submit-reminder';
import {
  Clock,
  Plus,
  Minus,
  CheckCircle,
  Lock,
  Trash2,
  Calendar,
  Layers,
  FileText,
  AlertTriangle,
  Briefcase,
  Pencil,
  X,
} from 'lucide-react';

export default function DailyWorklogPage() {
  const [report, setReport] = useState(null);
  const [categories, setCategories] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [entryType, setEntryType] = useState('TASK'); // 'TASK' or 'UNPLANNED'
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60); // Default 60 mins
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [autoNotices, setAutoNotices] = useState([]);
  const [reminder, setReminder] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [prefilling, setPrefilling] = useState(false);

  // Modals & submission state
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [todayReport, cats, tasks, projs, recent, reminderRes] = await Promise.all([
        worklogApi.getTodayDraft(),
        worklogApi.getCategories(),
        taskApi.myTasks(),
        projectApi.list(),
        worklogApi.getMyReports({ status: 'SUBMITTED', start_date: localDateOffset(-7), end_date: localDateStr() }),
        worklogApi.getReminder(),
      ]);

      setReminder(reminderRes.data);
      // Today's completed tasks, offered as entries to add (never added silently).
      worklogApi.getPrefill().then((p) => setPrefill(p.data)).catch(() => {});
      setReport(todayReport.data);
      setCategories(cats.data);
      setMyTasks(tasks.data);
      setProjects(projs.data);

      const dismissed = JSON.parse(localStorage.getItem('dismissedAutoSubmitNotices') || '[]');
      setAutoNotices(recent.data.filter((r) => r.auto_submitted && !dismissed.includes(r.id)));

      if (cats.data.length > 0) {
        setSelectedCategoryId(cats.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const refreshReminder = () => {
      worklogApi.getReminder().then((r) => setReminder(r.data)).catch(() => {});
    };
    const timer = setInterval(refreshReminder, 5 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshReminder();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshReminder);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshReminder);
    };
  }, []);

  // Duration Stepper (+ / - 30 minutes)
  const increaseDuration = () => {
    setDurationMinutes((prev) => prev + 30);
  };

  const decreaseDuration = () => {
    setDurationMinutes((prev) => (prev > 30 ? prev - 30 : 30));
  };

  const resetForm = () => {
    setEditingEntryId(null);
    setDescription('');
    setDurationMinutes(60);
    setSelectedTaskId('');
    setFormError('');
  };

  const handleEditEntry = (entry) => {
    setEditingEntryId(entry.id);
    setEntryType(entry.task_id ? 'TASK' : 'UNPLANNED');
    setSelectedTaskId(entry.task_id || '');
    setSelectedCategoryId(entry.category_id || '');
    setSelectedProjectId(entry.project_id || '');
    setDescription(entry.description || '');
    setDurationMinutes(entry.duration_minutes);
    setFormError('');
    document.getElementById('worklog-entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Pre-fill: add today's completed tasks as entries, one by one through the
  // normal addEntry endpoint so every worklog rule still applies.
  const handlePrefillAll = async () => {
    const suggestions = (prefill?.suggested_entries || []).filter((s) => !s.already_logged);
    if (suggestions.length === 0) return;
    const ok = await confirmDialog(
      `Add ${suggestions.length} entr${suggestions.length === 1 ? 'y' : 'ies'} from today's completed tasks? You can edit them as normal.`
    );
    if (!ok) return;
    try {
      setPrefilling(true);
      for (const s of suggestions) {
        await worklogApi.addEntry(report.id, {
          category_id: selectedCategoryId,
          description: s.title,
          duration_minutes: s.suggested_duration_minutes,
          task_id: s.task_id,
          project_id: null,
        });
      }
      const [updated, p] = await Promise.all([worklogApi.getReportById(report.id), worklogApi.getPrefill()]);
      setReport(updated.data);
      setPrefill(p.data);
      notify.success(`Added ${suggestions.length} entr${suggestions.length === 1 ? 'y' : 'ies'} from today's tasks.`);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setPrefilling(false);
    }
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!description.trim()) {
      setFormError('Work description is required.');
      return;
    }

    if (durationMinutes < 30 || durationMinutes % 30 !== 0) {
      setFormError('Duration must be a multiple of 30 minutes (minimum 30m).');
      return;
    }

    try {
      const payload = {
        category_id: selectedCategoryId,
        description: description.trim(),
        duration_minutes: durationMinutes,
        task_id: entryType === 'TASK' && selectedTaskId ? selectedTaskId : null,
        project_id: selectedProjectId || null,
      };

      if (editingEntryId) {
        await worklogApi.updateEntry(editingEntryId, payload);
      } else {
        await worklogApi.addEntry(report.id, payload);
      }

      resetForm();

      const updated = await worklogApi.getReportById(report.id);
      setReport(updated.data);
    } catch (err) {
      setFormError(err.message || 'Failed to save worklog entry');
    }
  };

  const dismissAutoNotice = (reportId) => {
    const dismissed = JSON.parse(localStorage.getItem('dismissedAutoSubmitNotices') || '[]');
    localStorage.setItem('dismissedAutoSubmitNotices', JSON.stringify([...dismissed, reportId]));
    setAutoNotices((prev) => prev.filter((r) => r.id !== reportId));
  };

  const handleDeleteEntry = async (entryId) => {
    if (!(await confirmDialog('Are you sure you want to delete this worklog entry?'))) return;
    try {
      await worklogApi.deleteEntry(entryId);
      const updated = await worklogApi.getReportById(report.id);
      setReport(updated.data);
    } catch (err) {
      notify.error(err.message);
    }
  };

  const handleSubmitReport = async () => {
    try {
      setSubmitting(true);
      await worklogApi.submitReport(report.id);
      setShowSubmitModal(false);
      const updated = await worklogApi.getReportById(report.id);
      setReport(updated.data);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  const isSubmitted = report?.status === 'SUBMITTED';
  const totalMinutes =
    report?.worklogs?.reduce((sum, entry) => sum + entry.duration_minutes, 0) || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SubmitReminder reminder={reminder} />

      {/* Pre-fill from today's completed tasks */}
      {prefill && (prefill.suggested_entries?.length > 0 || prefill.unfinished?.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
          {prefill.suggested_entries?.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-xs text-slate-700">
                <span className="font-semibold">{prefill.suggested_entries.length} completed task{prefill.suggested_entries.length === 1 ? '' : 's'} today</span>{' '}
                can be added as worklog entries.
              </p>
              <button
                onClick={handlePrefillAll}
                disabled={prefilling}
                className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                {prefilling ? 'Adding…' : 'Add from completed tasks'}
              </button>
            </div>
          )}
          {prefill.unfinished?.length > 0 && (
            <p className="text-[11px] text-slate-500">
              Still unfinished today: {prefill.unfinished.map((u) => u.title).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Top Banner / Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h1 className="text-xl font-bold text-slate-900">
              Daily Worklog — {report?.report_date}
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Record time spent on assigned tasks or unplanned activities
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-500 block font-medium">Total Time Logged</span>
            <span className="text-xl font-black text-slate-800 tracking-tight">
              {formatMinutes(totalMinutes)}
            </span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
              isSubmitted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {isSubmitted ? (
              <>
                <Lock className="w-3.5 h-3.5" /> SUBMITTED & LOCKED
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5" /> DRAFT
              </>
            )}
          </div>
        </div>
      </div>

      {/* Auto-submit notices */}
      {autoNotices.map((r) => (
        <div
          key={r.id}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-semibold">
              Your draft from{' '}
              {new Date(`${r.report_date}T00:00:00`).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}{' '}
              was auto-submitted at 11:00 PM.
            </p>
            <p className="text-amber-800 mt-0.5">
              It wasn't submitted in time, so it is now locked. Contact your administrator if a correction is needed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dismissAutoNotice(r.id)}
            className="text-amber-700 hover:text-amber-900"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Submitted Notice Banner */}
      {isSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800 text-xs">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">This daily worklog report has been submitted.</p>
            <p className="text-emerald-700 mt-0.5">
              Per company policy, submitted entries are permanently locked for the employee. Contact
              your manager or system administrator if a formal correction is required.
            </p>
          </div>
        </div>
      )}

      {/* Entry Addition Card (Active only while DRAFT) */}
      {!isSubmitted && (
        <div id="worklog-entry-form" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {editingEntryId ? (
                <><Pencil className="w-4 h-4 text-brand" /> Edit Worklog Entry</>
              ) : (
                <><Plus className="w-4 h-4 text-brand" /> Add Worklog Entry</>
              )}
            </h2>

            {/* Entry Type Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setEntryType('TASK')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  entryType === 'TASK'
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Assigned Task
              </button>
              <button
                type="button"
                onClick={() => setEntryType('UNPLANNED')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  entryType === 'UNPLANNED'
                    ? 'bg-white text-brand shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unplanned / General
              </button>
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveEntry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Task Selector if Assigned Task */}
              {entryType === 'TASK' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Assigned Task *
                  </label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => {
                      const taskId = e.target.value;
                      setSelectedTaskId(taskId);
                      const t = myTasks.find((item) => item.task.id === taskId);
                      if (t && t.task.project_id) {
                        setSelectedProjectId(t.task.project_id);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="">-- Choose from your tasks --</option>
                    {myTasks.map((item) => (
                      <option key={item.task.id} value={item.task.id}>
                        {item.task.title} ({item.assignment_status})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Associated Project (Optional)
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="">-- General / Non-Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Description *
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you actually accomplish or work on?"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand leading-relaxed"
              />
            </div>

            {/* Duration Control: 30-min Step Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Duration:
                </span>
                <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={decreaseDuration}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center font-bold shadow-sm transition active:scale-95"
                    title="Subtract 30 minutes"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <span className="w-24 text-center text-sm font-bold text-slate-900 tracking-tight">
                    {formatMinutes(durationMinutes)}
                  </span>

                  <button
                    type="button"
                    onClick={increaseDuration}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center font-bold shadow-sm transition active:scale-95"
                    title="Add 30 minutes"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 italic">
                  (Steps: 30m, 60m, 90m, 120m...)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {editingEntryId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
                >
                  {editingEntryId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingEntryId ? 'Save Changes' : 'Add to Daily Draft'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Logged Entries List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Today's Logged Entries</h2>
            <p className="text-xs text-slate-500">
              {report?.worklogs?.length || 0} entries recorded
            </p>
          </div>

          {!isSubmitted && report?.worklogs?.length > 0 && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Submit Daily Report
            </button>
          )}
        </div>

        {report?.worklogs?.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No entries added yet today.</p>
            <p className="text-xs mt-1">Use the form above to add your first worklog entry.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {[...report.worklogs]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((entry) => (
              <div key={entry.id} className="py-4 flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-light text-brand-dark border border-brand-light">
                      {entry.category?.name || 'General'}
                    </span>
                    {entry.project && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {entry.project.name}
                      </span>
                    )}
                    {entry.task && (
                      <span className="text-xs font-semibold text-slate-800">
                        Task: {entry.task.title}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {entry.description}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                    {formatMinutes(entry.duration_minutes)}
                  </span>
                  {!isSubmitted && (
                    <button
                      onClick={() => handleEditEntry(entry)}
                      className="p-1 text-slate-500 hover:text-brand transition"
                      title="Edit entry"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {!isSubmitted && (
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1 text-slate-500 hover:text-red-600 transition"
                      title="Delete entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <Modal open={!!(showSubmitModal)} onOpenChange={(o) => { if (!o) setShowSubmitModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                Confirm Report Final Submission
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Once you submit today’s report ({report?.report_date}), it will be{' '}
              <strong className="text-slate-800">permanently locked</strong>. You will not be able to
              add, edit, or delete entries.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-200/60 text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span>Total Entries:</span>
                <span className="font-bold">{report?.worklogs?.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Time Logged:</span>
                <span className="font-bold">{formatMinutes(totalMinutes)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitReport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                {submitting ? 'Submitting...' : 'Yes, Lock & Submit'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
