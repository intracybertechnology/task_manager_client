import { Modal } from '../../components/ui/dialog';
import { notify } from '../../components/ui/feedback';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { Users, Plus, CheckCircle, Search, KeyRound } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    department_id: '',
  });

  // Team Mapping Modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [managerTeamIds, setManagerTeamIds] = useState([]);
  const [savingTeam, setSavingTeam] = useState(false);

  // Reset Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes] = await Promise.all([
        adminApi.getUsers(),
        adminApi.getDepartments(),
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createUser({
        ...formData,
        department_id: formData.department_id || null,
      });
      setShowCreateModal(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        department_id: '',
      });
      await loadData();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await adminApi.toggleUserStatus(userId);
      await loadData();
    } catch (err) {
      notify.error(err.message);
    }
  };

  const openTeamMapping = async (manager) => {
    setSelectedManager(manager);
    try {
      const res = await adminApi.getManagerTeam(manager.id);
      setManagerTeamIds((res.data || []).map((m) => m.id));
      setShowTeamModal(true);
    } catch (err) {
      notify.error(err.message);
      setManagerTeamIds([]);
      setShowTeamModal(true);
    }
  };

  const handleSaveTeam = async () => {
    if (!selectedManager) return;
    try {
      setSavingTeam(true);
      await adminApi.setManagerTeam(selectedManager.id, managerTeamIds);
      setShowTeamModal(false);
      await loadData();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSavingTeam(false);
    }
  };

  const toggleTeamEmployee = (empId) => {
    setManagerTeamIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const openPasswordReset = (user) => {
    setPasswordTarget(user);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    try {
      setSavingPassword(true);
      await adminApi.resetUserPassword(passwordTarget.id, newPassword);
      setShowPasswordModal(false);
      notify.success(`Password reset for ${passwordTarget.email}`);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const allEmployees = users.filter((u) => u.role === 'EMPLOYEE');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management & Team Scope</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure system accounts, organizational roles, and manager-to-employee relationships
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center">
        <Search className="w-4 h-4 text-slate-500 mr-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or role..."
          className="w-full text-xs text-slate-800 bg-transparent focus:outline-none"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider bg-slate-50">
              <th className="py-3 px-4 font-bold">User</th>
              <th className="py-3 px-4 font-bold">Role</th>
              <th className="py-3 px-4 font-bold">Department</th>
              <th className="py-3 px-4 font-bold">Status</th>
              <th className="py-3 px-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition">
                <td className="py-3 px-4 font-semibold text-slate-900">
                  {user.first_name} {user.last_name}
                  <span className="text-[10px] text-slate-500 block font-normal">{user.email}</span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      user.role === 'ADMIN'
                        ? 'bg-brand-light text-brand-dark border-brand-light'
                        : user.role === 'MANAGER'
                        ? 'bg-brand-light text-brand-dark border-brand-light'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="py-3 px-4">{user.department?.name || 'Unassigned'}</td>
                <td className="py-3 px-4">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      user.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  <Link
                    to={`/admin/users/${user.id}/overview`}
                    className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold"
                  >
                    View Profile
                  </Link>
                  {user.role === 'MANAGER' && (
                    <button
                      onClick={() => openTeamMapping(user)}
                      className="px-2.5 py-1 bg-brand-light text-brand rounded-lg hover:bg-brand-light font-semibold"
                    >
                      Configure Scope
                    </button>
                  )}
                  <button
                    onClick={() => openPasswordReset(user)}
                    className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 font-semibold"
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => handleToggleStatus(user.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold ${
                      user.is_active
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    }`}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <Modal open={!!(showCreateModal)} onOpenChange={(o) => { if (!o) setShowCreateModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">-- None --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-lg"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && passwordTarget && (
        <Modal open={!!(showPasswordModal && passwordTarget)} onOpenChange={(o) => { if (!o) setShowPasswordModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              Reset Password
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Set a new password for {passwordTarget.first_name} {passwordTarget.last_name} (
              {passwordTarget.email}). Share it with them securely.
            </p>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  {savingPassword ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Team Mapping Modal */}
      {showTeamModal && selectedManager && (
        <Modal open={!!(showTeamModal && selectedManager)} onOpenChange={(o) => { if (!o) setShowTeamModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Configure Manager Scope: {selectedManager.first_name} {selectedManager.last_name}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Select which employees this manager is authorized to assign tasks to and review worklogs
              for.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50 mb-5">
              {allEmployees.map((emp) => {
                const isSelected = managerTeamIds.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleTeamEmployee(emp.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-brand-light border-brand text-brand-dark font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div>
                      <span>
                        {emp.first_name} {emp.last_name}
                      </span>
                      <span className="text-[10px] text-slate-500 block">{emp.email}</span>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-brand" />}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTeamModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingTeam}
                onClick={handleSaveTeam}
                className="px-5 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-semibold rounded-lg"
              >
                {savingTeam ? 'Saving...' : 'Save Scope'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
