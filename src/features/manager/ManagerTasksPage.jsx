import { Modal } from '../../components/ui/dialog';
import { notify, LoadingSkeleton } from '../../components/ui/feedback';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { taskApi, managerApi, adminApi, projectApi, libraryApi } from '../../lib/api';
import { formatMinutes } from '../../lib/utils';
import {
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Layers,
  Users,
  MessageSquare,
  Send,
} from 'lucide-react';

export default function ManagerTasksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState([]);
  const [assignableEmployees, setAssignableEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Create Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_id: '',
    priority: 'MEDIUM',
    start_date: '',
    due_date: '',
    task_date: '',
    estimated_minutes: 120,
    assignee_ids: [],
  });

  // Task Details Modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentText, setCommentText] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksRes, empRes, projRes] = await Promise.all([
        taskApi.list(),
        isAdmin ? adminApi.getUsers({ is_active: true }) : managerApi.getTeam(),
        projectApi.list(),
      ]);

      setTasks(tasksRes.data);

      const available = isAdmin
        ? empRes.data.filter((u) => u.role === 'EMPLOYEE' && u.is_active)
        : empRes.data;
      setAssignableEmployees(available);

      setProjects(projRes.data);
      // Saved library tasks: picking one pre-fills the form.
      libraryApi.list().then((r) => setLibrary(r.data || [])).catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // A notification can arrive as ?open=<task_id>: open that task's details.
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId) return;
    (async () => {
      try {
        const res = await taskApi.getById(openId);
        setSelectedTask(res.data);
      } catch (err) {
        notify.error(err.message);
      } finally {
        setSearchParams({}, { replace: true });
      }
    })();
  }, [searchParams, setSearchParams]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.assignee_ids.length === 0) {
      setFormError('Please select at least one employee to assign.');
      return;
    }

    try {
      setCreating(true);
      await taskApi.create({
        ...formData,
        project_id: formData.project_id || null,
        start_date: formData.start_date || null,
        task_date: formData.task_date || null,
        due_date: formData.due_date || null,
        estimated_minutes: formData.estimated_minutes
          ? parseInt(formData.estimated_minutes, 10)
          : null,
      });

      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        project_id: '',
        priority: 'MEDIUM',
        start_date: '',
        due_date: '',
        task_date: '',
        estimated_minutes: 120,
        assignee_ids: [],
      });
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const toggleAssignee = (empId) => {
    setFormData((prev) => {
      const exists = prev.assignee_ids.includes(empId);
      return {
        ...prev,
        assignee_ids: exists
          ? prev.assignee_ids.filter((id) => id !== empId)
          : [...prev.assignee_ids, empId],
      };
    });
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;
    try {
      await taskApi.addComment(selectedTask.id, commentText);
      setCommentText('');
      const updated = await taskApi.getById(selectedTask.id);
      setSelectedTask(updated.data);
      await loadData();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-brand-light text-brand-dark border-brand-light';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isAdmin ? 'Company Task Assignment & Tracking' : 'Team Task Assignment'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Create tasks, assign any company employee, and track progress across all teams'
              : 'Create tasks, assign team members, and monitor independent progress'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          Create New Task
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title or description..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="sm:hidden w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand"
            aria-label="Filter by priority"
          >
            {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
              <option key={p} value={p}>
                Priority: {p}
              </option>
            ))}
          </select>
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Priority:
            </span>
            {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  priorityFilter === p
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task Cards */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No tasks found</p>
          <p className="text-xs text-slate-500 mt-1">Create your first task to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                  {task.due_date && (
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {task.due_date}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2">
                  {task.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>

                {task.project && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-brand font-medium truncate">
                    <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{task.project.name}</span>
                  </div>
                )}
              </div>

              {/* Assignees Progress Indicators */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Assignees ({task.assignees?.length || 0})
                </span>
                <div className="space-y-1.5">
                  {task.assignees?.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50 border border-slate-100"
                    >
                      <span className="font-medium text-slate-800 truncate pr-2">
                        {a.employee?.first_name} {a.employee?.last_name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          a.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : a.status === 'IN_PROGRESS'
                            ? 'bg-brand-light text-brand-dark'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <Modal open={!!(showCreateModal)} onOpenChange={(o) => { if (!o) setShowCreateModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create & Assign Task</h2>
                <p className="text-xs text-slate-500">
                  {isAdmin
                    ? 'As Administrator, you can assign to any employee in the company'
                    : 'Select assignees from your authorized team members'}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Task Title *
                </label>
                {library.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      const item = library.find((l) => l.id === e.target.value);
                      if (!item) return;
                      setFormData((prev) => ({
                        ...prev,
                        title: item.title,
                        description: item.description || prev.description,
                        project_id: item.project_id || prev.project_id,
                        priority: item.priority || prev.priority,
                        estimated_minutes: item.estimated_minutes || prev.estimated_minutes,
                      }));
                    }}
                    className="w-full mb-1.5 px-3 py-2 bg-brand-light/60 border border-brand-light rounded-lg text-xs text-brand-dark font-medium focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="">Use a saved task from the library…</option>
                    {library.map((l) => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Implement user dashboard charts"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Detailed Instructions *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide complete requirements and acceptance criteria"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Project (Optional)
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="">-- No Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Priority *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Which day this task belongs to. Optional on purpose: with no date
                  it stays on the assignee's Today list until completed. */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Task Date <span className="text-slate-400 normal-case font-normal">(when should this be done?)</span>
                </label>
                <input
                  type="date"
                  value={formData.task_date}
                  onChange={(e) => setFormData({ ...formData, task_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Leave empty to keep it on their Today list until completed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Est. Effort (Mins)
                  </label>
                  <input
                    type="number"
                    step={30}
                    min={30}
                    value={formData.estimated_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_minutes: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </div>

              {/* Multi-Employee Assignee Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isAdmin
                    ? 'Select Assignees (All Active Employees) *'
                    : 'Select Assignees (Authorized Team Members) *'}
                </label>
                {assignableEmployees.length === 0 ? (
                  <p className="text-xs text-red-500 italic">
                    {isAdmin
                      ? 'No active employees found to assign.'
                      : 'No employees currently in your scope. Ask an admin to map team members.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-36 overflow-y-auto">
                    {assignableEmployees.map((emp) => {
                      const isSelected = formData.assignee_ids.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => toggleAssignee(emp.id)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                            isSelected
                              ? 'bg-brand-light border-brand text-brand-dark font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">
                            {emp.first_name} {emp.last_name}
                          </span>
                          {isSelected && (
                            <CheckCircle className="w-3.5 h-3.5 text-brand flex-shrink-0 ml-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Click to toggle. Selected: {formData.assignee_ids.length} employee(s).
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || formData.assignee_ids.length === 0}
                  className="px-5 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create & Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <Modal open={!!(selectedTask)} onOpenChange={(o) => { if (!o) setSelectedTask(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border mb-2 inline-block ${getPriorityBadge(
                    selectedTask.priority
                  )}`}
                >
                  {selectedTask.priority}
                </span>
                <h2 className="text-xl font-bold text-slate-900">{selectedTask.title}</h2>
                {selectedTask.project && (
                  <p className="text-xs text-brand font-medium mt-1">
                    Project: {selectedTask.project.name}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-500 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Instructions
                </h4>
                <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-100">
                  {selectedTask.description}
                </div>
              </div>

              {/* Assignees List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Individual Assignee Progress
                </h4>
                <div className="space-y-2">
                  {selectedTask.assignees?.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">
                          {a.employee?.first_name} {a.employee?.last_name}
                        </span>
                        <span className="text-[10px] text-slate-500 block">{a.employee?.email}</span>
                      </div>
                      <span
                        className={`font-bold px-2.5 py-1 rounded-lg ${
                          a.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : a.status === 'IN_PROGRESS'
                            ? 'bg-brand-light text-brand-dark'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Comments & Activity
                </h4>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
                  {selectedTask.comments && selectedTask.comments.length > 0 ? (
                    selectedTask.comments.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-800">
                            {c.author?.first_name} {c.author?.last_name}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            {new Date(c.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{c.comment}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No comments yet.</p>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment or directive..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-dark transition flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    Comment
                  </button>
                </form>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
