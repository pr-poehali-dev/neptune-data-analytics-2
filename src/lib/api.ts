const AUTH_URL = 'https://functions.poehali.dev/d179e559-ae21-48c6-a638-7ed0d61253a5'
const ORDERS_URL = 'https://functions.poehali.dev/c4c44717-258f-405c-8b37-7515595dc59d'
const CHAT_URL = 'https://functions.poehali.dev/ebf9a9d9-0998-45da-aba0-8cb9274c6742'
const ANALYTICS_URL = 'https://functions.poehali.dev/04dc4b98-2045-491a-9095-e1af18d51efc'
const SUPPORT_URL = 'https://functions.poehali.dev/872fc325-5a92-4d24-a6a7-4237631de297'

export function getSessionId(): string {
  return localStorage.getItem('session_id') || ''
}
export function setSessionId(id: string) {
  localStorage.setItem('session_id', id)
}
export function clearSessionId() {
  localStorage.removeItem('session_id')
}

function req(url: string, method = 'GET', body?: object) {
  const sessionId = getSessionId()
  return fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json())
}

export const api = {
  auth: {
    me: () => req(AUTH_URL),
    register: (data: { email: string; password: string; name: string }) =>
      req(AUTH_URL, 'POST', { ...data, action: 'register' }),
    login: (data: { email: string; password: string }) =>
      req(AUTH_URL, 'POST', { ...data, action: 'login' }),
    logout: () => req(AUTH_URL, 'POST', { action: 'logout' }),
    users: () => req(`${AUTH_URL}?action=users`),
    setRole: (userId: number, role: string) =>
      req(AUTH_URL, 'POST', { action: 'set_role', user_id: userId, role }),
  },
  orders: {
    stats: () => fetch(`${ORDERS_URL}?action=stats`).then(r => r.json()),
    list: () => req(ORDERS_URL),
    create: (data: { title: string; description: string }) =>
      req(ORDERS_URL, 'POST', { ...data, action: 'create' }),
    setStatus: (id: number, status: string) =>
      req(ORDERS_URL, 'PUT', { id, status, action: 'status' }),
    setFile: (id: number, file_url: string) =>
      req(ORDERS_URL, 'PUT', { id, file_url, action: 'file' }),
  },
  chat: {
    messages: (orderId: number) => req(`${CHAT_URL}?order_id=${orderId}`),
    send: (orderId: number, text: string) =>
      req(CHAT_URL, 'POST', { order_id: orderId, text }),
  },
  support: {
    create: (data: { name: string; email: string; subject: string; message: string }) =>
      fetch(SUPPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, action: 'create' }),
      }).then(r => r.json()),
    list: (status?: string) => {
      const sid = getSessionId()
      const params = new URLSearchParams({ ...(status ? { status } : {}), ...(sid ? { session_id: sid } : {}) })
      return req(`${SUPPORT_URL}?${params}`)
    },
    get: (ticketId: number) => {
      const sid = getSessionId()
      const params = new URLSearchParams({ ticket_id: String(ticketId), ...(sid ? { session_id: sid } : {}) })
      return req(`${SUPPORT_URL}?${params}`)
    },
    reply: (ticketId: number, text: string) =>
      req(SUPPORT_URL, 'POST', { action: 'reply', ticket_id: ticketId, text, session_id: getSessionId() }),
    setStatus: (ticketId: number, status: string) =>
      req(SUPPORT_URL, 'PUT', { ticket_id: ticketId, status, session_id: getSessionId() }),
  },
  analytics: {
    track: (path: string) => {
      const params = new URLSearchParams(window.location.search)
      return fetch(ANALYTICS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          referrer: document.referrer || '',
          utm_source: params.get('utm_source') || '',
          utm_medium: params.get('utm_medium') || '',
        }),
      }).catch(() => {})
    },
    getStats: () => req(ANALYTICS_URL),
  },
}