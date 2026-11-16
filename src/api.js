// ── z-books ARAP API Client ──

const API_BASE = '/api';

function getToken() { return localStorage.getItem('jjb_arap_token'); }
export function setToken(token) { localStorage.setItem('jjb_arap_token', token); }
export function clearToken() { localStorage.removeItem('jjb_arap_token'); }
export function isLoggedIn() { return !!getToken(); }

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) { clearToken(); window.location.href = '/login'; return; }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const auth = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),
};

export const dashboard = {
  stats: () => request('/dashboard'),
};

export const invoices = {
  list: (params = '') => request(`/invoices${params}`),
  create: (data) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  recordPayment: (id, data) => request(`/invoices/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
};

export const payables = {
  list: (params = '') => request(`/payables${params}`),
  create: (data) => request('/payables', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/payables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  recordPayment: (id, data) => request(`/payables/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
};

export const journal = {
  list: () => request('/journal'),
  create: (data) => request('/journal', { method: 'POST', body: JSON.stringify(data) }),
  post: (id) => request(`/journal/${id}/post`, { method: 'POST' }),
};

export const accounts = {
  list: () => request('/chart-of-accounts'),
  create: (data) => request('/chart-of-accounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (code, data) => request(`/chart-of-accounts/${code}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (code) => request(`/chart-of-accounts/${code}`, { method: 'DELETE' }),
};

export const changeTrail = {
  list: (entityType, entityId) => request(`/change-trail?entity_type=${entityType}&entity_id=${entityId}`),
  recent: () => request('/change-trail'),
};

export const sync = {
  status: () => request('/sync/status'),
};
