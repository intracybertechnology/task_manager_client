import { LoadingSkeleton } from '../../components/ui/feedback';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { createSocket, onDashboardChange } from '../../lib/socket';
import { formatMinutes, localDateStr, localDateOffset } from '../../lib/utils';
import {
  Users,
  FolderKanban,
  CheckSquare,
  Building2,
  FileCheck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  CalendarCheck,
  UserX,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const todayStr = localDateStr();
  const [stats, setStats] = useState(null);
  const [trackDate, setTrackDate] = useState(todayStr);
  const [loading, setLoading] = useState(true);

  const fetchStats = async (date) => {
    try {
      setLoading(true);
      const res = await adminApi.getDashboard({ date });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(trackDate);
  }, [trackDate]);

  // Live updates: when something changes, re-read the dashboard (no loading flash).
  const [live, setLive] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    const socket = createSocket(token);
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    let t = null;
    const off = onDashboardChange(socket, () => {
      // Coalesce bursts of events into one refresh.
      clearTimeout(t);
      t = setTimeout(async () => {
        try {
          const res = await adminApi.getDashboard({ date: trackDate });
          setStats(res.data);
        } catch {
          /* keep the last good view */
        }
      }, 400);
    });
    return () => {
      clearTimeout(t);
      off();
      socket.disconnect();
    };
  }, [trackDate]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const submittedPct =
    stats?.total_employees > 0
      ? Math.round((stats.submitted_count / stats.total_employees) * 100)
      : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Overview & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            High-level operational metrics across all departments, projects, and work submissions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Submission tracking date picker */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Track Date
            </label>
            <input
              type="date"
              value={trackDate}
              max={todayStr}
              onChange={(e) => setTrackDate(e.target.value || todayStr)}
              className="text-xs text-slate-800 bg-transparent focus:outline-none"
            />
          </div>

          <Link
            to="/admin/tasks"
            className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create & Assign Task
          </Link>
          <Link
            to="/admin/worklogs"
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            All Worklogs
          </Link>
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
              live ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
            title={live ? 'Updating live' : 'Live updates disconnected'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {live ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Employees</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stats?.total_employees || 0}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {stats?.total_managers || 0} Managers
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Projects</span>
            <FolderKanban className="w-4 h-4 text-brand" />
          </div>
          <p className="text-2xl font-black text-brand">{stats?.active_projects || 0}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Company initiatives</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-brand" />
          </div>
          <p className="text-2xl font-black text-brand">{stats?.total_tasks || 0}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {stats?.task_status_counts?.IN_PROGRESS || 0} In Progress
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Submissions · {stats?.submission_date}
            </span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {stats?.submitted_count || 0}
            <span className="text-xs text-slate-500 font-normal"> / {stats?.total_employees}</span>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${submittedPct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-red-500">
              {stats?.pending_count || 0} pending
            </span>
          </div>
        </div>
      </div>

      {/* Attendance today */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-600" /> Attendance Today
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              cutoff {stats?.attendance_today?.cutoff || '11:55'}
            </span>
          </h3>
          <Link
            to="/admin/attendance"
            className="text-[11px] font-semibold text-brand hover:text-brand-dark"
          >
            Open attendance board →
          </Link>
        </div>

        {stats?.attendance_today?.is_off_day ? (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
            Today ({stats.attendance_today.date}) is a company off day. Attendance is not marked today.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Present', value: stats?.attendance_today?.counts?.present || 0, cls: 'text-emerald-600' },
                { label: 'Not yet', value: stats?.attendance_today?.counts?.not_yet || 0, cls: 'text-slate-700' },
                { label: 'Absent', value: stats?.attendance_today?.counts?.absent || 0, cls: 'text-red-600' },
              ].map((c) => (
                <div key={c.label} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <p className={`text-2xl font-black ${c.cls}`}>{c.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{c.label}</p>
                </div>
              ))}
            </div>
            {stats?.attendance_today?.absent?.length > 0 && (
              <p className="text-[11px] text-slate-500 mt-3">
                <span className="font-semibold text-red-600">Absent: </span>
                {stats.attendance_today.absent.map((a) => a.name).join(', ')}
              </p>
            )}
            {stats?.attendance_today?.present?.length > 0 && (
              <p className="text-[11px] text-slate-500 mt-1">
                <span className="font-semibold text-emerald-700">Present: </span>
                {stats.attendance_today.present.map((a) => a.name).join(', ')}
              </p>
            )}
          </>
        )}
      </div>

      {/* Submission Tracking — Submitted & Pending panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending submissions — who hasn't submitted */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-500" /> Pending Submissions
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
              {stats?.pending_count || 0} outstanding
            </span>
          </div>
          {stats?.pending_users && stats.pending_users.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {stats.pending_users.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-3 bg-red-50/40 rounded-xl border border-red-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 font-bold flex items-center justify-center text-xs">
                      {emp.first_name?.[0]}
                      {emp.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {emp.department?.name || 'Unassigned'}
                        {emp.role === 'MANAGER' && (
                          <span className="ml-1 text-brand font-bold">· Manager</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/admin/users/${emp.id}/overview`}
                    className="text-[10px] font-semibold text-brand hover:text-brand-dark"
                  >
                    View profile →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-slate-500">
                All active users have submitted for {stats?.submission_date}.
              </p>
            </div>
          )}
        </div>

        {/* Submitted — who has submitted */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Submitted
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
              {stats?.submitted_count || 0} received
            </span>
          </div>
          {stats?.submitted_users && stats.submitted_users.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {stats.submitted_users.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-3 bg-emerald-50/40 rounded-xl border border-emerald-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs">
                      {emp.first_name?.[0]}
                      {emp.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {emp.department?.name || 'Unassigned'} ·{' '}
                        {emp.submitted_at
                          ? new Date(emp.submitted_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                        {emp.role === 'MANAGER' && (
                          <span className="ml-1 text-brand font-bold">· Manager</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700">
                      {formatMinutes(emp.total_minutes || 0)}
                    </span>
                    <Link
                      to={`/admin/users/${emp.id}/overview`}
                      className="text-[10px] font-semibold text-brand hover:text-brand-dark"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">
                No submissions recorded for {stats?.submission_date} yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Monitoring: completion by department + templates running today */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-brand" /> Task Completion by Department
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {stats?.submission_date}
            </span>
          </h3>
          {(stats?.completion_by_department || []).length === 0 ? (
            <p className="text-xs text-slate-500 italic">No dated tasks for this date.</p>
          ) : (
            <div className="space-y-3">
              {stats.completion_by_department.map((d) => (
                <div key={d.department}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800">{d.department}</span>
                    <span className="text-slate-500">
                      <span className="font-bold text-slate-800">{d.done}</span>/{d.total} done · {d.percent}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${d.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-brand" /> Templates Running Today
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {stats?.templates_today?.date}
            </span>
          </h3>
          {(stats?.templates_today?.templates || []).length === 0 ? (
            <p className="text-xs text-slate-500 italic">No recurring templates are active today.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {stats.templates_today.templates.map((t) => (
                <div key={t.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{t.title}</p>
                    <p className="text-[10px] text-slate-500">{t.start_time} · {t.duration_minutes}m · {t.frequency.toLowerCase()}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      t.generated ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {t.generated ? `${t.done}/${t.assignments} done` : 'not generated yet'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link to="/admin/recurring" className="text-[11px] font-semibold text-brand hover:text-brand-dark mt-3 inline-block">
            Manage recurring tasks →
          </Link>
        </div>
      </div>

      {/* Distribution Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Hours */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-brand" /> Logged Hours by Project
          </h3>
          <div className="space-y-3">
            {stats?.project_hours && Object.keys(stats.project_hours).length > 0 ? (
              Object.entries(stats.project_hours).map(([proj, hours]) => (
                <div
                  key={proj}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-slate-800">{proj}</span>
                  <span className="text-xs font-black text-brand">
                    {Math.round(hours * 10) / 10} hrs
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No submitted project hours yet.</p>
            )}
          </div>
        </div>

        {/* Department Hours */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand" /> Logged Hours by Department
          </h3>
          <div className="space-y-3">
            {stats?.department_hours && Object.keys(stats.department_hours).length > 0 ? (
              Object.entries(stats.department_hours).map(([dept, hours]) => (
                <div
                  key={dept}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-slate-800">{dept}</span>
                  <span className="text-xs font-black text-brand">
                    {Math.round(hours * 10) / 10} hrs
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No submitted department hours yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Link to full timeline */}
      <div className="bg-gradient-to-r from-brand to-brand rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="text-white">
          <h3 className="text-base font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5" /> Submission Timeline
          </h3>
          <p className="text-xs text-brand-light mt-1">
            Track submissions across multiple days in a grid view — see exactly who submitted and
            who is outstanding, day by day.
          </p>
        </div>
        <Link
          to="/admin/submission-timeline"
          className="px-5 py-2.5 bg-white text-brand-dark rounded-xl text-xs font-bold shadow-sm hover:bg-brand-light transition whitespace-nowrap"
        >
          Open Submission Timeline →
        </Link>
      </div>
    </div>
  );
}
