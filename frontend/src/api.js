const BASE = import.meta.env.VITE_API_URL ?? ''

export function apiUrl(path) {
  return `${BASE}${path}`
}

export function getToken() {
  return localStorage.getItem('ps_token')
}

export function setToken(token) {
  localStorage.setItem('ps_token', token)
}

export function clearToken() {
  localStorage.removeItem('ps_token')
}

export function decodeToken(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function authFetch(path, options = {}) {
  const token = getToken()
  return fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
}
