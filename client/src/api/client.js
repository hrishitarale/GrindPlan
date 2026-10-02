const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const TOKEN_KEY = 'grindplan-token'

export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function setToken(token) { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY) }

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  if (response.status === 204) return null
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status})`)
  return result
}

export const authApi = {
  login: (body) => api('/auth/login', { method: 'POST', body, auth: false }),
  register: (body) => api('/auth/register', { method: 'POST', body, auth: false }),
  me: () => api('/auth/me'),
}
