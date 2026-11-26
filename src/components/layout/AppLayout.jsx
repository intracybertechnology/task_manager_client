import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notify } from '../ui/feedback';
import { Modal } from '../ui/dialog';
import AttendanceMarkButton from '../ui/attendance-mark-button';
import {
  CheckSquare,
  Clock,
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  ShieldAlert,
  LogOut,
  Building2,
  Calendar,
  KeyRound,
  Menu,
  Tags,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);
  const [moreBelow, setMoreBelow] = useState(false);
  const [moreAbove, setMoreAbove] = useState(false);

  const updateMoreBelow = () => {
    const el = navRef.current;
    if (!el) return;
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    setMoreAbove(el.scrollTop > 8);
  };

  useEffect(() => {
    updateMoreBelow();
    window.addEventListener('resize', updateMoreBelow);
    return () => window.removeEventListener('resize', updateMoreBelow);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
  const WARNING_MS = 60 * 1000;
  const lastActivityRef = useRef(Date.now());
  const [secondsLeft, setSecondsLeft] = useState(null);

  const stayActive = () => {
    lastActivityRef.current = Date.now();
    setSecondsLeft(null);
  };

  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));

    const timer = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= INACTIVITY_LIMIT_MS) {
        clearInterval(timer);
        setSecondsLeft(null);
        logout();
        notify.error('You were signed out after 30 minutes of inactivity.');
        navigate('/login');
      } else if (idle >= INACTIVITY_LIMIT_MS - WARNING_MS) {
        setSecondsLeft(Math.ceil((INACTIVITY_LIMIT_MS - idle) / 1000));
      } else {
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, markActive));
      clearInterval(timer);
    };
  }, [logout, navigate]);

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-brand-light text-brand-dark border-brand-light';
      case 'MANAGER':
        return 'bg-brand-light text-brand-dark border-brand-light';
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="fixed inset-0 flex bg-slate-50 overflow-hidden">
      {secondsLeft !== null && (
        <Modal open onOpenChange={(o) => { if (!o) stayActive(); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-100 text-center">
            <h2 className="text-base font-bold text-slate-900">Are you still there?</h2>
            <p className="text-sm text-slate-600 mt-2">
              You will be signed out in{' '}
              <span className="font-bold text-slate-900">{secondsLeft}</span> seconds due to inactivity.
            </p>
            <button
              type="button"
              onClick={stayActive}
              className="mt-5 w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-brand hover:bg-brand-dark shadow-sm transition"
            >
              Stay signed in
            </button>
          </div>
        </Modal>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-brand-navy text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 transform transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="rounded-lg bg-white p-1.5 flex-shrink-0">
            <img src="/taiqon-logo.png" alt="Taiqon Technologies" className="h-10 w-auto" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-white tracking-wide text-sm truncate">Taiqon Technologies</h1>
            <p className="text-xs text-slate-400">Worklog Pro</p>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div className="overflow-hidden pr-2">
            <p className="text-sm font-medium text-white truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getRoleBadgeColor(
              user?.role
            )}`}
          >
            {user?.role}
          </span>
        </div>

        {/* Nav Links */}
        <div className="relative flex-1 min-h-0 flex flex-col">
        <nav
          ref={navRef}
          onScroll={updateMoreBelow}
          className="flex-1 min-h-0 px-3 py-2 space-y-1 overflow-y-auto hide-scrollbar"
          onClick={() => setMobileOpen(false)}
        >
          {/* Employee Navigation */}
          {user?.role === 'EMPLOYEE' && (
            <>
              <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                My Workspace
              </div>
              <NavLink
                to="/employee/tasks"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <CheckSquare className="w-4 h-4" />
                My Tasks
              </NavLink>
              <NavLink
                to="/employee/worklog"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Clock className="w-4 h-4" />
                Daily Worklog
              </NavLink>
              <NavLink
                to="/employee/history"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Calendar className="w-4 h-4" />
                Submitted Reports
              </NavLink>
            </>
          )}

          {/* Manager Navigation */}
          {user?.role === 'MANAGER' && (
            <>
              <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Team Management
              </div>
              <NavLink
                to="/manager/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                Team Dashboard
              </NavLink>
              <NavLink
                to="/manager/tasks"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <CheckSquare className="w-4 h-4" />
                Assign & Track Tasks
              </NavLink>
              <NavLink
                to="/manager/worklog"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Clock className="w-4 h-4" />
                My Daily Worklog
              </NavLink>
              <NavLink
                to="/manager/worklogs"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                Team Worklogs
              </NavLink>
            </>
          )}

          {/* Admin Navigation */}
          {user?.role === 'ADMIN' && (
            <>
              <div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Administration
              </div>
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                Overview & Metrics
              </NavLink>
              <NavLink
                to="/admin/tasks"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <CheckSquare className="w-4 h-4" />
                Tasks & Assignments
              </NavLink>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Users className="w-4 h-4" />
                Users & Team Scope
              </NavLink>
              {/* /admin/users/:userId/overview is reached from Users page — no separate nav entry needed */}
              <NavLink
                to="/admin/departments"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Building2 className="w-4 h-4" />
                Departments & Projects
              </NavLink>
              <NavLink
                to="/admin/categories"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Tags className="w-4 h-4" />
                Worklog Categories
              </NavLink>
              <NavLink
                to="/admin/worklogs"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                All Submitted Reports
              </NavLink>
              <NavLink
                to="/admin/submission-timeline"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Calendar className="w-4 h-4" />
                Submission Timeline
              </NavLink>
              <NavLink
                to="/admin/attendance"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Clock className="w-4 h-4" />
                Attendance & Off Days
              </NavLink>
              <NavLink
                to="/admin/audit-logs"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <ShieldAlert className="w-4 h-4" />
                Audit Logs
              </NavLink>
            </>
          )}
        </nav>
          {moreAbove && (
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-14 flex items-start justify-center pt-1 bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent text-slate-400">
              <ChevronUp className="w-4 h-4 animate-bounce" />
            </div>
          )}
          {moreBelow && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 flex items-end justify-center pb-1 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent text-slate-400">
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </div>
          )}
        </div>

        {/* Footer with logout */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <NavLink
            to="/change-password"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-brand text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <KeyRound className="w-4 h-4" />
            Change Password
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-950/40 hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden h-14 flex items-center gap-3 px-4 bg-brand-navy text-white flex-shrink-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img src="/taiqon-logo.png" alt="Taiqon Technologies" className="h-8 w-auto bg-white rounded p-0.5" />
          <span className="font-semibold text-sm truncate">Worklog Pro</span>
        </div>

        {/* Top Header */}
        <header className="hidden sm:flex h-14 border-b border-slate-200 bg-white px-4 md:px-8 items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
              {user?.department?.name || 'Taiqon Technologies'}
            </span>
            <span className="hidden md:inline text-xs text-slate-400 whitespace-nowrap">
              Session active:{' '}
              {new Date().toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <AttendanceMarkButton />
            <span className="hidden md:inline text-xs text-slate-500">Signed in as:</span>
            <span className="text-xs font-semibold text-slate-800 truncate">{user?.email}</span>
          </div>
        </header>

        {/* View body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
