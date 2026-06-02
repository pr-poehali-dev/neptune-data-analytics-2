const AUTH_URL = 'https://functions.poehali.dev/d179e559-ae21-48c6-a638-7ed0d61253a5'
const ORDERS_URL = 'https://functions.poehali.dev/c4c44717-258f-405c-8b37-7515595dc59d'
const CHAT_URL = 'https://functions.poehali.dev/ebf9a9d9-0998-45da-aba0-8cb9274c6742'

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
  },
  orders: {
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
}