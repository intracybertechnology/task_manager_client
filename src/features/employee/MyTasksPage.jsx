import { Modal } from '../../components/ui/dialog';
import { notify, LoadingSkeleton } from '../../components/ui/feedback';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { taskApi } from '../../lib/api';
import TaskTimeEditor from '../../components/ui/task-time-editor';
import { formatMinutes, localDateStr, taskSource } from '../../lib/utils';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Search,
  Filter,
  Send,
  Calendar,
  Layers,
  UserPlus,
} from 'lucide-react';

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];

export default function MyTasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await taskApi.myTasks();
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // A notification can arrive as ?open=<task_id>: open that task's details.
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId || tasks.length === 0) return;
    const match = tasks.find((t) => t.task?.id === openId);
    if (match) setSelectedTask(match);
    setSearchParams({}, { replace: true });
  }, [tasks, searchParams, setSearchParams]);

  const handleStatusChange = async (assignmentId, newStatus) => {
    try {
      setUpdatingStatus(true);
      await taskApi.updateStatus(assignmentId, newStatus);
      await fetchTasks();
      if (selectedTask) {
        const updated = await taskApi.getById(selectedTask.task.id);
        setSelectedTask(prev => ({ ...prev, task: updated.data, assignment_status: newStatus }));
      }
    } catch (err) {
      notify.error(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTask) return;
    try {
      await taskApi.addComment(selectedTask.task.id, newComment, selectedTask.assignment_id);
      setNewComment('');
      const updated = await taskApi.getById(selectedTask.task.id);
      setSelectedTask(prev => ({ ...prev, task: updated.data }));
      fetchTasks();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const filteredTasks = tasks.filter((item) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OVERDUE') {
      const today = localDateStr();
      return (
        item.assignment_status !== 'COMPLETED' &&
        item.task.due_date &&
        item.task.due_date < today
      );
    }
    return item.assignment_status === statusFilter;
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-brand-light text-brand-dark border-brand-light';
      case 'ON_HOLD':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MISSED':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Assigned Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track individual progress and collaborate with your team
          </p>
        </div>

        {/* Filters */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:hidden w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand"
          aria-label="Filter by status"
        >
          {['ALL', 'TODO', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'OVERDUE'].map((status) => (
            <option key={status} value={status}>
              {status.replace('_', ' ')}
            </option>
          ))}
        </select>
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          {['ALL', 'TODO', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'OVERDUE'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === status
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Today's progress: how many of today's tasks are done.
          Cancelled tasks are excluded from the count. */}
      {(() => {
        const today = localDateStr();
        const todays = tasks.filter((t) => t.task?.task_date === today);
        const countable = todays.filter((t) => t.assignment_status !== 'CANCELLED');
        const done = countable.filter((t) => t.assignment_status === 'COMPLETED').length;
        if (countable.length === 0) return null;
        const pct = Math.round((done / countable.length) * 100);
        return (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-800">Today's progress</span>
              <span className="text-slate-500">
                <span className="font-bold text-slate-900">{done}</span> of {countable.length} done
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })()}

      {/* Task Cards Grid */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No tasks found matching this filter</p>
          <p className="text-xs text-slate-500 mt-1">Check back later or choose another filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((item) => {
            const task = item.task;
            const source = taskSource(task, task.template?.frequency);
            const isOverdue =
              item.assignment_status !== 'COMPLETED' &&
              task.due_date &&
              task.due_date < localDateStr();

            return (
              <div
                key={item.assignment_id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(
                        item.assignment_status
                      )}`}
                    >
                      {item.assignment_status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-800 text-base leading-snug line-clamp-2">
                    {task.title}
                  </h3>
                  {/* Source chip: is this a repeating template task, a reassigned one, or a person's assignment? */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span
                      title={source.detail || undefined}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        source.key === 'recurring'
                          ? 'bg-violet-50 text-violet-700 border-violet-200'
                          : source.key === 'reassigned'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {source.key === 'recurring' ? '↻ ' : source.key === 'reassigned' ? '↺ ' : ''}
                      {source.label}
                    </span>
                    {source.key === 'assigned' && (
                      <span className="text-[10px] text-slate-500 truncate">
                        by {item.assigned_by?.first_name || task.creator?.first_name || '—'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-y-2 text-xs text-slate-500">
                    <div className="w-full flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        Assigned by{' '}
                        <span className="font-semibold text-slate-700">
                          {item.assigned_by?.first_name || task.creator?.first_name}{' '}
                          {item.assigned_by?.last_name || task.creator?.last_name}
                        </span>
                      </span>
                    </div>
                    {task.project && (
                      <div className="w-full flex items-center gap-1.5 text-brand font-medium truncate">
                        <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{task.project.name}</span>
                      </div>
                    )}
                    {task.due_date && (
                      <div
                        className={`flex items-center gap-1.5 mr-4 ${
                          isOverdue ? 'text-red-600 font-semibold' : ''
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Due: {task.due_date}</span>
                      </div>
                    )}
                    {task.estimated_minutes && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Est: {formatMinutes(task.estimated_minutes)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <select
                    value={item.assignment_status}
                    disabled={updatingStatus}
                    onChange={(e) => handleStatusChange(item.assignment_id, e.target.value)}
                    className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st.replace('_', ' ')}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setSelectedTask(item)}
                    className="text-xs font-semibold text-brand hover:text-brand-dark px-3 py-1.5 rounded-lg hover:bg-brand-light transition"
                  >
                    Details & Comments
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Details & Comments Modal */}
      {selectedTask && (
        <Modal open={!!(selectedTask)} onOpenChange={(o) => { if (!o) setSelectedTask(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(
                      selectedTask.task.priority
                    )}`}
                  >
                    {selectedTask.task.priority} Priority
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(
                      selectedTask.assignment_status
                    )}`}
                  >
                    {selectedTask.assignment_status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{selectedTask.task.title}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {/* The assigner of this assignment, which can differ from the task creator. */}
                  Assigned by {selectedTask.assigned_by?.first_name || selectedTask.task.creator?.first_name}{' '}
                  {selectedTask.assigned_by?.last_name || selectedTask.task.creator?.last_name}
                  {selectedTask.assigned_by &&
                    selectedTask.task.creator &&
                    selectedTask.assigned_by.id !== selectedTask.task.creator.id && (
                      <span className="text-slate-400">
                        {' '}· created by {selectedTask.task.creator.first_name}{' '}
                        {selectedTask.task.creator.last_name}
                      </span>
                    )}
                </p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-500 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Description
                </h4>
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-100">
                  {selectedTask.task.description}
                </div>
              </div>

              {/* Status Update Control */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Update Your Assignment Progress
                </h4>
                <div className="flex items-center gap-2">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st}
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange(selectedTask.assignment_id, st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selectedTask.assignment_status === st
                          ? 'bg-brand text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduled time: shown, and editable by the assignee */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Scheduled Time
                </h4>
                <TaskTimeEditor
                  assignment={selectedTask}
                  onSaved={async () => {
                    const updated = await taskApi.getById(selectedTask.task.id);
                    setSelectedTask((prev) => ({ ...prev, task: updated.data }));
                    await fetchTasks();
                  }}
                />
              </div>

              {/* Discussion & Comments */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Comments & Activity
                </h4>

                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
                  {selectedTask.task.comments && selectedTask.task.comments.length > 0 ? (
                    selectedTask.task.comments.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
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
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add progress note or message..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-semibold hover:bg-brand-dark transition flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    Send
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
