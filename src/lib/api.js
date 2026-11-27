import axios from 'axios';
import { localDateStr } from './utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Tell the server what date it is in the browser's local timezone.
  // The server uses this for "today's worklog" so IST and GST users get
  // the correct calendar date even when UTC has already rolled over.
  config.headers['X-Client-Date'] = localDateStr();
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const taskApi = {
  list: (params) => api.get('/tasks', { params }),
  myTasks: (params) => api.get('/tasks/my-tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  updateStatus: (assigneeId, status, note) =>
    api.patch(`/tasks/assignments/${assigneeId}/status`, { status, note }),
  editAssignmentTime: (assigneeId, data) => api.patch(`/tasks/assignments/${assigneeId}/time`, data),
  getTimeHistory: (taskId) => api.get(`/tasks/time-history/${taskId}`),
  addAssignees: (id, employee_ids) => api.post(`/tasks/${id}/assignees`, { employee_ids }),
  removeAssignee: (id, assigneeId) => api.delete(`/tasks/${id}/assignees/${assigneeId}`),
  addComment: (id, comment, task_assignee_id) =>
    api.post(`/tasks/${id}/comments`, { comment, task_assignee_id }),
};

export const worklogApi = {
  getCategories: (params) => api.get('/worklogs/categories', { params }),
  createCategory: (data) => api.post('/worklogs/categories', data),
  updateCategory: (id, data) => api.patch(`/worklogs/categories/${id}`, data),
  getTodayDraft: () => api.get('/worklogs/today'),
  getPrefill: () => api.get('/worklogs/prefill'),
  getReminder: () => api.get('/worklogs/reminder'),
  getMyReports: (params) => api.get('/worklogs/my-reports', { params }),
  getReportById: (id) => api.get(`/worklogs/reports/${id}`),
  addEntry: (reportId, data) => api.post(`/worklogs/reports/${reportId}/entries`, data),
  updateEntry: (entryId, data) => api.patch(`/worklogs/entries/${entryId}`, data),
  deleteEntry: (entryId) => api.delete(`/worklogs/entries/${entryId}`),
  submitReport: (reportId) => api.post(`/worklogs/reports/${reportId}/submit`),
};

export const managerApi = {
  getTeam: () => api.get('/manager/team'),
  getDashboard: () => api.get('/manager/dashboard'),
  getSubmittedWorklogs: (params) => api.get('/manager/worklogs', { params }),
  getSubmittedReportById: (id) => api.get(`/manager/worklogs/${id}`),
};

export const adminApi = {
  getDashboard: (params) => api.get('/admin/dashboard', { params }),
  getSubmissionTimeline: (params) => api.get('/admin/submission-timeline', { params }),
  getUserOverview: (userId) => api.get(`/admin/users/${userId}/overview`),
  getWorklogs: (params) => api.get('/admin/worklogs', { params }),
  correctReport: (reportId, data) => api.post(`/admin/worklogs/${reportId}/corrections`, data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getUsers: (params) => api.get('/users', { params }),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.patch(`/users/${id}`, data),
  toggleUserStatus: (id) => api.patch(`/users/${id}/status`),
  resetUserPassword: (id, new_password) =>
    api.post(`/users/${id}/reset-password`, { new_password }),
  setManagerTeam: (managerId, employee_ids) =>
    api.post(`/users/${managerId}/team`, { employee_ids }),
  getManagerTeam: (managerId) => api.get(`/users/${managerId}/team`),
  getDepartments: () => api.get('/departments'),
  createDepartment: (data) => api.post('/departments', data),
};

export const projectApi = {
  list: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  addMember: (id, employee_id) => api.post(`/projects/${id}/members`, { employee_id }),
  removeMember: (id, employeeId) => api.delete(`/projects/${id}/members/${employeeId}`),
};

export const attendanceApi = {
  // Self-service (employees and managers)
  getMyToday: () => api.get('/attendance/me/today'),
  markMe: () => api.post('/attendance/me/mark'),
  getTodayBoard: () => api.get('/attendance/today'),
  setStatus: (data) => api.patch('/attendance/status', data),
  // Company off days
  getOffDays: (params) => api.get('/attendance/off-days', { params }),
  addOffDay: (data) => api.post('/attendance/off-days', data),
  bulkAddOffDays: (entries) => api.post('/attendance/off-days/bulk', { entries }),
  removeOffDay: (id) => api.delete(`/attendance/off-days/${id}`),
  // Attendance exceptions
  getExceptions: (params) => api.get('/attendance/exceptions', { params }),
  markException: (data) => api.post('/attendance/exceptions', data),
  removeException: (id) => api.delete(`/attendance/exceptions/${id}`),
};

export const notificationApi = {
  list: (params) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  dismiss: (id) => api.delete(`/notifications/${id}`),
  clearRead: () => api.post('/notifications/clear-read'),
};

export const scheduleApi = {
  get: () => api.get('/work-schedule'),
  save: (data) => api.put('/work-schedule', data),
  previewEnd: (start, minutes) => api.get('/work-schedule/preview', { params: { start, minutes } }),
};

export const templateApi = {
  list: () => api.get('/task-templates'),
  get: (id) => api.get(`/task-templates/${id}`),
  create: (data) => api.post('/task-templates', data),
  update: (id, data) => api.patch(`/task-templates/${id}`, data),
  deactivate: (id) => api.delete(`/task-templates/${id}`),
  generate: (date) => api.post('/task-templates/generate', { date }),
};

export const missedApi = {
  summary: (date) => api.get('/missed', { params: date ? { date } : {} }),
  run: (date) => api.post('/missed/run', { date }),
  reassign: (assigneeId, data) => api.post(`/missed/${assigneeId}/reassign`, data),
};

export const libraryApi = {
  list: () => api.get('/task-library'),
  create: (data) => api.post('/task-library', data),
  update: (id, data) => api.patch(`/task-library/${id}`, data),
  deactivate: (id) => api.delete(`/task-library/${id}`),
};

export default api;
