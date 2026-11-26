import { Modal } from '../../components/ui/dialog';
import { notify, confirmDialog, LoadingSkeleton } from '../../components/ui/feedback';
import React, { useState, useEffect, useCallback } from 'react';
import { attendanceApi, adminApi } from '../../lib/api';
import { localDateStr } from '../../lib/utils';
import {
  CalendarDays,
  CalendarCheck,
  Plus,
  Trash2,
  X,
  Users,
  RefreshCw,
  SunMedium,
  UserX,
} from 'lucide-react';

const localDateStrUtil = localDateStr;

const todayStr = () => localDateStrUtil();

// Return all Sundays in a given year-month (e.g. "2026-11")
const sundaysInMonth = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  const days = [];
  const d = new Date(year, month - 1, 1);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  while (d.getMonth() === month - 1) {
    days.push(localDateStrUtil(d));
    d.setDate(d.getDate() + 7);
  }
  return days;
};

const TYPE_LABELS = {
  SUNDAY: { label: 'Sunday', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  SATURDAY: { label: 'Saturday', color: 'bg-brand-light text-brand-dark border-brand-light' },
  PUBLIC_HOLIDAY: { label: 'Holiday', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  OTHER: { label: 'Other', color: 'bg-brand-light text-brand-dark border-brand-light' },
};

const EX_TYPE_LABELS = {
  ABSENT: { label: 'Absent', color: 'bg-red-50 text-red-700 border-red-200' },
  LEAVE: { label: 'Leave', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  HALF_DAY: { label: 'Half Day', color: 'bg-orange-50 text-orange-700 border-orange-200' },
};

const currentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function AdminAttendancePage() {
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'offdays' | 'absences'

  // Today's presence board
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(null);

  const loadBoard = useCallback(async () => {
    try {
      const res = await attendanceApi.getTodayBoard();
      setBoard(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setBoardLoading(false);
    }
  }, []);

  const handleSetStatus = async (person, status) => {
    if (status === person.status) return;

    const label = (s) => s.replace('_', ' ').toLowerCase();
    const confirmed = await confirmDialog(
      `Change ${person.first_name} ${person.last_name} from ${label(person.status)} to ${label(status)}? This is recorded in the audit log.`
    );
    if (!confirmed) return;

    try {
      setSavingStatus(person.id);
      await attendanceApi.setStatus({ employee_id: person.id, date: board.date, status });
      notify.success(`${person.first_name} ${person.last_name} set to ${label(status)}.`);
      await loadBoard();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSavingStatus(null);
    }
  };

  useEffect(() => {
    loadBoard();
    const timer = setInterval(loadBoard, 30000);
    return () => clearInterval(timer);
  }, [loadBoard]);

  // Off days state
  const [offDays, setOffDays] = useState([]);
  const [offLoading, setOffLoading] = useState(true);
  const [offMonth, setOffMonth] = useState(currentYearMonth());
  const [showAddOffDay, setShowAddOffDay] = useState(false);
  const [newOffDate, setNewOffDate] = useState('');
  const [newOffType, setNewOffType] = useState('OTHER');
  const [newOffReason, setNewOffReason] = useState('');
  const [bulkAdding, setBulkAdding] = useState(false);

  // Absences state
  const [exceptions, setExceptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [exLoading, setExLoading] = useState(true);
  const [showMarkAbsence, setShowMarkAbsence] = useState(false);
  const [exEmployee, setExEmployee] = useState('');
  const [exDate, setExDate] = useState(todayStr());
  const [exType, setExType] = useState('ABSENT');
  const [exReason, setExReason] = useState('');
  const [exFilterEmployee, setExFilterEmployee] = useState('');

  const loadOffDays = useCallback(async () => {
    try {
      setOffLoading(true);
      const [year, month] = offMonth.split('-').map(Number);
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      const res = await attendanceApi.getOffDays({ start_date: start, end_date: end });
      setOffDays(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setOffLoading(false);
    }
  }, [offMonth]);

  const loadExceptions = useCallback(async () => {
    try {
      setExLoading(true);
      const params = {};
      if (exFilterEmployee) params.employee_id = exFilterEmployee;
      const res = await attendanceApi.getExceptions(params);
      setExceptions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setExLoading(false);
    }
  }, [exFilterEmployee]);

  const loadEmployees = async () => {
    try {
      const res = await adminApi.getUsers({ role: 'EMPLOYEE', is_active: true });
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadOffDays(); }, [loadOffDays]);
  useEffect(() => { loadExceptions(); loadEmployees(); }, [loadExceptions]);

  // ── Off Day handlers ──────────────────────────────────────────────────────

  const handleAddOffDay = async (e) => {
    e.preventDefault();
    try {
      await attendanceApi.addOffDay({ date: newOffDate, type: newOffType, reason: newOffReason });
      setShowAddOffDay(false);
      setNewOffDate('');
      setNewOffReason('');
      setNewOffType('OTHER');
      await loadOffDays();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const handleBulkSundays = async () => {
    if (!(await confirmDialog(`Mark all Sundays in ${offMonth} as off days?`))) return;
    try {
      setBulkAdding(true);
      const entries = sundaysInMonth(offMonth).map(date => ({
        date,
        type: 'SUNDAY',
        reason: 'Weekly off',
      }));
      const res = await attendanceApi.bulkAddOffDays(entries);
      notify.success(`Added ${res.data.added} Sunday(s). ${res.data.skipped} already existed.`);
      await loadOffDays();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setBulkAdding(false);
    }
  };

  const handleRemoveOffDay = async (id) => {
    if (!(await confirmDialog('Remove this off day?'))) return;
    try {
      await attendanceApi.removeOffDay(id);
      await loadOffDays();
    } catch (err) {
      notify.error(err.message);
    }
  };

  // ── Absence handlers ──────────────────────────────────────────────────────

  const handleMarkAbsence = async (e) => {
    e.preventDefault();
    if (!exEmployee) { notify.error('Select an employee.'); return; }
    try {
      await attendanceApi.markException({
        employee_id: exEmployee,
        date: exDate,
        type: exType,
        reason: exReason,
      });
      setShowMarkAbsence(false);
      setExEmployee('');
      setExDate(todayStr());
      setExType('ABSENT');
      setExReason('');
      await loadExceptions();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const handleRemoveException = async (id) => {
    if (!(await confirmDialog('Remove this attendance record?'))) return;
    try {
      await attendanceApi.removeException(id);
      await loadExceptions();
    } catch (err) {
      notify.error(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-brand" />
          Attendance & Working Days
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Define company off days and mark individual absences. These are used in the submission
          timeline so missing reports on off days or absent days don't count against employees.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-brand-light border border-brand-light rounded-xl p-4 text-xs text-brand-dark flex gap-3">
        <CalendarDays className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand" />
        <div>
          <strong>How this works:</strong> Employees can still submit a worklog on any day,
          including off days. These settings only affect the timeline view — a cell on an off day
          shows grey (not red), and an absent/leave day shows amber instead of a missing red ✗.
          The submission rate is calculated only over expected working days.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { id: 'today', label: "Today's Attendance", icon: <CalendarCheck className="w-4 h-4" /> },
          { id: 'offdays', label: 'Company Off Days', icon: <SunMedium className="w-4 h-4" /> },
          { id: 'absences', label: 'Individual Absences', icon: <UserX className="w-4 h-4" /> },
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

      {/* ── Tab: Today's Attendance ───────────────────────────────────────── */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          {boardLoading ? (
            <LoadingSkeleton />
          ) : !board ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
              Could not load today's attendance.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    Present: {board.counts.present}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                    Not yet: {board.counts.not_yet}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 font-semibold">
                    Absent: {board.counts.absent}
                  </span>
                  {board.counts.other > 0 && (
                    <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                      Leave / Off / Half: {board.counts.other}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CalendarDays className="w-4 h-4" />
                  {board.date}
                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-slate-600">
                    cutoff {board.cutoff}
                  </span>
                  {board.is_off_day && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-slate-600">
                      Off day
                    </span>
                  )}
                  <button
                    onClick={loadBoard}
                    className="p-1.5 text-slate-500 hover:text-brand transition"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {board.is_off_day ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                  <SunMedium className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Company off day</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Nobody marks attendance today and the {board.cutoff} cutoff does not run. Everyone shows as Off.
                  </p>
                </div>
              ) : (
                <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {[
                  { key: 'present', title: 'Present' },
                  { key: 'not_yet', title: `Not yet marked (until ${board.cutoff})` },
                  { key: 'absent', title: 'Absent' },
                ].map((col) => (
                  <div key={col.key} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-slate-900">{col.title}</h3>
                      <span className="text-xs font-bold text-slate-500">{board[col.key].length}</span>
                    </div>
                    {board[col.key].length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">Nobody here.</p>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {board[col.key].map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {p.first_name} {p.last_name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {p.role}
                                {p.cutoff_absence && (
                                  <span className="ml-1 text-red-600 font-semibold">
                                    · {p.absence_reason === 'ADMIN' ? 'absent (set by admin)' : 'cutoff absence'}
                                  </span>
                                )}
                                {p.overridden && p.absence_reason !== 'ADMIN' && (
                                  <span className="ml-1 text-brand font-semibold">· admin changed</span>
                                )}
                              </p>
                              {p.last_changed_by && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  changed by {p.last_changed_by.name} ({p.last_changed_by.email})
                                  {p.last_changed_at && (
                                    <> at {new Date(p.last_changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                                  )}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {p.marked_at && (
                                <span className="text-[10px] font-semibold text-emerald-700">
                                  {new Date(p.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              <select
                                value={p.status}
                                onChange={(e) => handleSetStatus(p, e.target.value)}
                                disabled={savingStatus === p.id}
                                className="text-[10px] font-semibold bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand"
                                title="Admin can change the status"
                              >
                                <option value="PRESENT">Present</option>
                                <option value="ABSENT">Absent</option>
                                <option value="LEAVE">Leave</option>
                                <option value="HALF_DAY">Half day</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
                </>
              )}

              {!board.is_off_day && board.other.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Leave / Half day / Future</h3>
                  <div className="flex flex-wrap gap-2">
                    {board.other.map((p) => (
                      <span
                        key={p.id}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium"
                        title={p.status}
                      >
                        {p.first_name} {p.last_name} · {p.status.replace('_', ' ').toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Off Days ─────────────────────────────────────────────────── */}
      {activeTab === 'offdays' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Month:</label>
              <input
                type="month"
                value={offMonth}
                onChange={(e) => setOffMonth(e.target.value || currentYearMonth())}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <button
                onClick={loadOffDays}
                className="p-1.5 text-slate-500 hover:text-brand transition"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkSundays}
                disabled={bulkAdding}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <SunMedium className="w-3.5 h-3.5" />
                {bulkAdding ? 'Adding...' : 'Mark All Sundays'}
              </button>
              <button
                onClick={() => setShowAddOffDay(true)}
                className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Off Day
              </button>
            </div>
          </div>

          {offLoading ? (
            <LoadingSkeleton />
          ) : offDays.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No off days defined for {offMonth}.</p>
              <p className="text-xs text-slate-500 mt-1">
                Use "Mark All Sundays" for a quick start, or add individual dates.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto"><table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Day</th>
                    <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                    <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Added by</th>
                    <th className="py-3 px-4 text-right font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {offDays.map((od) => {
                    const d = new Date(od.date + 'T00:00:00');
                    const typeInfo = TYPE_LABELS[od.type] || TYPE_LABELS.OTHER;
                    return (
                      <tr key={od.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900">{od.date}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {d.toLocaleDateString(undefined, { weekday: 'long' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{od.reason || '—'}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {od.creator ? `${od.creator.first_name} ${od.creator.last_name}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRemoveOffDay(od.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 transition"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            </div>
          )}

          {/* Add Off Day Modal */}
          {showAddOffDay && (
            <Modal open={!!(showAddOffDay)} onOpenChange={(o) => { if (!o) setShowAddOffDay(false); }}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">Add Company Off Day</h2>
                  <button onClick={() => setShowAddOffDay(false)} className="text-slate-500 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddOffDay} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={newOffDate}
                      onChange={(e) => setNewOffDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Type *</label>
                    <select
                      value={newOffType}
                      onChange={(e) => setNewOffType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                    >
                      <option value="SUNDAY">Sunday (Weekly Off)</option>
                      <option value="SATURDAY">Saturday (Weekly Off)</option>
                      <option value="PUBLIC_HOLIDAY">Public Holiday</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Reason <span className="text-slate-500 normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={newOffReason}
                      onChange={(e) => setNewOffReason(e.target.value)}
                      placeholder="e.g. National holiday, Eid, etc."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddOffDay(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      Save Off Day
                    </button>
                  </div>
                </form>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ── Tab: Individual Absences ──────────────────────────────────────── */}
      {activeTab === 'absences' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filter by:</label>
              <select
                value={exFilterEmployee}
                onChange={(e) => setExFilterEmployee(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowMarkAbsence(true)}
              className="px-3 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Mark Absence / Leave
            </button>
          </div>

          {exLoading ? (
            <LoadingSkeleton />
          ) : exceptions.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No attendance exceptions recorded.</p>
              <p className="text-xs text-slate-500 mt-1">
                Use "Mark Absence / Leave" to record when an employee was absent.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto"><table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                    <th className="py-3 px-4 text-left font-bold text-slate-500 uppercase tracking-wider">Marked by</th>
                    <th className="py-3 px-4 text-right font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {exceptions.map((ex) => {
                    const typeInfo = EX_TYPE_LABELS[ex.type] || EX_TYPE_LABELS.ABSENT;
                    return (
                      <tr key={ex.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">
                            {ex.employee?.first_name} {ex.employee?.last_name}
                          </p>
                          <p className="text-[10px] text-slate-500">{ex.employee?.department?.name || '—'}</p>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{ex.date}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{ex.reason || '—'}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {ex.marker ? `${ex.marker.first_name} ${ex.marker.last_name}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRemoveException(ex.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 transition"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>
            </div>
          )}

          {/* Mark Absence Modal */}
          {showMarkAbsence && (
            <Modal open={!!(showMarkAbsence)} onOpenChange={(o) => { if (!o) setShowMarkAbsence(false); }}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">Mark Absence / Leave</h2>
                  <button onClick={() => setShowMarkAbsence(false)} className="text-slate-500 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleMarkAbsence} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Employee *</label>
                    <select
                      required
                      value={exEmployee}
                      onChange={(e) => setExEmployee(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                    >
                      <option value="">-- Select employee --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={exDate}
                      onChange={(e) => setExDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Type *</label>
                    <select
                      value={exType}
                      onChange={(e) => setExType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                    >
                      <option value="ABSENT">Absent (no notice)</option>
                      <option value="LEAVE">Leave (approved)</option>
                      <option value="HALF_DAY">Half Day</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Reason <span className="text-slate-500 normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={exReason}
                      onChange={(e) => setExReason(e.target.value)}
                      placeholder="e.g. Sick, Family emergency..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowMarkAbsence(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      Save Record
                    </button>
                  </div>
                </form>
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}
