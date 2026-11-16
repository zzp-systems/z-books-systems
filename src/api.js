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
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { throw new Error(res.status === 405 ? `Method not allowed (405). The API route may not exist for this action.` : `Unexpected response (HTTP ${res.status}): ${text.slice(0, 150)}`); }
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
  remove: (id) => request(`/invoices/${id}`, { method: 'DELETE' }),
  recordPayment: (id, data) => request(`/invoices/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
};

export const payables = {
  list: (params = '') => request(`/payables${params}`),
  create: (data) => request('/payables', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/payables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/payables/${id}`, { method: 'DELETE' }),
  recordPayment: (id, data) => request(`/payables/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
};

export const entities = {
  list: (type) => request(`/entities${type ? `?type=${type}` : ''}`),
  create: (data) => request('/entities', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/entities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/entities/${id}`, { method: 'DELETE' }),
};

export const journal = {
  list: () => request('/journal'),
  create: (data) => request('/journal', { method: 'POST', body: JSON.stringify(data) }),
  post: (id) => request(`/journal/${id}/post`, { method: 'POST' }),
};

export const accounts = {
  list: () => request('/accounts'),
  create: (data) => request('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (code, data) => request(`/accounts/${code}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (code) => request(`/accounts/${code}`, { method: 'DELETE' }),
};

export const changeTrail = {
  list: (entityType, entityId) => request(`/change-trail?entity_type=${entityType}&entity_id=${entityId}`),
  recent: () => request('/change-trail'),
};

export const sync = {
  status: () => request('/sync/status'),
};
