import { LoadingSkeleton } from '../../components/ui/feedback';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { formatMinutes } from '../../lib/utils';
import {
  ArrowLeft,
  User,
  Building2,
  CheckSquare,
  FileText,
  Clock,
  ChevronDown,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

const STATUS_COLORS = {
  TODO: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-brand-light text-brand-dark',
  ON_HOLD: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
  MISSED: 'bg-red-100 text-red-700',
};

export default function AdminUserOverviewPage() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('worklogs'); // 'worklogs' | 'tasks'
  const [expandedReportId, setExpandedReportId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await adminApi.getUserOverview(userId);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-slate-500">
        User not found.{' '}
        <Link to="/admin/users" className="text-brand hover:underline">
          Back to Users
        </Link>
      </div>
    );
  }

  const { user, reports, task_assignments, summary } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Users
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-light text-brand-dark flex items-center justify-center font-black text-xl">
            {user.first_name?.[0]}
            {user.last_name?.[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {user.first_name} {user.last_name}
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  user.role === 'MANAGER'
                    ? 'bg-brand-light text-brand-dark border-brand-light'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {user.role}
              </span>
              {!user.is_active && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                  DEACTIVATED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" />
              {user.department?.name || 'No department assigned'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/admin/worklogs?employee_id=${user.id}`}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            Filter Worklogs
          </Link>
          <Link
            to="/admin/submission-timeline"
            className="px-3 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            View Timeline
          </Link>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Reports Submitted',
            value: summary.submitted_reports,
            sub: `${summary.draft_reports} draft`,
            icon: <FileText className="w-4 h-4 text-brand" />,
            color: 'text-brand',
          },
          {
            label: 'Hours Logged',
            value: formatMinutes(summary.total_minutes_logged),
            sub: 'across all submissions',
            icon: <Clock className="w-4 h-4 text-brand" />,
            color: 'text-brand',
          },
          {
            label: 'Tasks Assigned',
            value: summary.total_tasks,
            sub: `${summary.tasks_by_status?.COMPLETED || 0} completed`,
            icon: <CheckSquare className="w-4 h-4 text-emerald-600" />,
            color: 'text-emerald-600',
          },
          {
            label: 'Last Submitted',
            value: summary.last_submission_date
              ? new Date(summary.last_submission_date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : '—',
            sub: 'most recent report',
            icon: <TrendingUp className="w-4 h-4 text-amber-600" />,
            color: 'text-amber-600',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2 text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
              {s.icon}
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <span className="text-[11px] text-slate-500 mt-1 block">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Task status breakdown */}
      {summary.total_tasks > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-brand" /> Task Status Breakdown
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.tasks_by_status || {}).map(([status, count]) => (
              <span
                key={status}
                className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}
              >
                {status.replace('_', ' ')}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'worklogs', label: `Worklog Reports (${reports.length})`, icon: <FileText className="w-3.5 h-3.5" /> },
          { id: 'tasks', label: `Task Assignments (${task_assignments.length})`, icon: <CheckSquare className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === tab.id
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Worklog Reports */}
      {activeTab === 'worklogs' && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No reports filed yet.</p>
            </div>
          ) : (
            reports.map((report) => {
              const isExpanded = expandedReportId === report.id;
              const totalMins = (report.worklogs || []).reduce(
                (s, w) => s + w.duration_minutes,
                0
              );
              const isSubmitted = report.status === 'SUBMITTED';

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                >
                  <div
                    onClick={() =>
                      setExpandedReportId(isExpanded ? null : report.id)
                    }
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isSubmitted ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                      />
                      <div>
                        <span className="text-sm font-semibold text-slate-900">
                          {report.report_date}
                        </span>
                        <span
                          className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isSubmitted
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {isSubmitted ? 'SUBMITTED' : 'DRAFT'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-slate-700">
                        {formatMinutes(totalMins)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {report.worklogs?.length || 0} entries
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-5 pb-4 pt-3 divide-y divide-slate-100">
                      {(report.worklogs || []).length === 0 ? (
                        <p className="text-xs text-slate-500 py-2 italic">No entries yet.</p>
                      ) : (
                        (report.worklogs || []).map((w) => (
                          <div
                            key={w.id}
                            className="py-2.5 flex items-start justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-light text-brand-dark">
                                  {w.category?.name}
                                </span>
                                {w.task && (
                                  <span className="text-xs font-semibold text-slate-800">
                                    Task: {w.task.title}
                                  </span>
                                )}
                                {w.project && (
                                  <span className="text-[10px] text-slate-500">
                                    {w.project.name}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {w.description}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-slate-800 bg-white px-2 py-1 rounded-lg border border-slate-200 whitespace-nowrap">
                              {formatMinutes(w.duration_minutes)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Task Assignments */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          {task_assignments.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No task assignments found.</p>
            </div>
          ) : (
            task_assignments
              .filter((a) => a.task)
              .map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {assignment.task?.title}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {assignment.task?.project && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {assignment.task.project.name}
                        </span>
                      )}
                      {assignment.task?.priority && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            assignment.task.priority === 'HIGH' || assignment.task.priority === 'CRITICAL'
                              ? 'bg-red-50 text-red-600'
                              : assignment.task.priority === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {assignment.task.priority}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">
                        Assigned by {assignment.task?.creator?.first_name}{' '}
                        {assignment.task?.creator?.last_name}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                      STATUS_COLORS[assignment.status] || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {assignment.status.replace('_', ' ')}
                  </span>
                </div>
              ))
          )}
        </div>
      )}

      {/* Relationships: for managers show their team; for employees show their managers */}
      {user.role === 'MANAGER' && (user.managedEmployees?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-brand" /> Direct Reports ({user.managedEmployees.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.managedEmployees.map((emp) => (
              <Link
                key={emp.id}
                to={`/admin/users/${emp.id}/overview`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-brand-light hover:border-brand transition"
              >
                <span className="text-xs font-semibold text-slate-800">
                  {emp.first_name} {emp.last_name}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {user.role === 'EMPLOYEE' && (user.reportingManagers?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-brand" /> Reporting Managers
          </h3>
          <div className="flex flex-wrap gap-2">
            {user.reportingManagers.map((mgr) => (
              <Link
                key={mgr.id}
                to={`/admin/users/${mgr.id}/overview`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-brand-light hover:border-brand transition"
              >
                <span className="text-xs font-semibold text-slate-800">
                  {mgr.first_name} {mgr.last_name}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-500" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
