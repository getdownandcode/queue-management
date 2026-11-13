const TOKEN_KEY = 'queue-manager-token';
export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (getToken()) headers.Authorization = `Bearer ${getToken()}`;
  const response = await fetch(`/api${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) {
    clearToken();
    if (window.location.pathname !== '/login') window.location.assign('/login');
  }
  if (!response.ok) throw new Error(body.error || 'Request failed. Please try again.');
  return body;
}
export function send(path, method, data) { return api(path, { method, body: JSON.stringify(data) }); }
