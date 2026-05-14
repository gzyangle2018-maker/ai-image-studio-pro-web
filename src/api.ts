const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request('auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    me: () => request('auth/me'),
  },
  models: {
    list: () => request('models'),
  },
  agents: {
    list: (type?: string) => request(`agents${type ? `?type=${type}` : ''}`),
    get: (key: string) => request(`agents/${key}`),
  },
  generate: {
    image: (body: unknown) => request('generate-image', { method: 'POST', body: JSON.stringify(body) }),
  },
  chat: {
    send: (body: unknown) => request('chat', { method: 'POST', body: JSON.stringify(body) }),
  },
  vision: {
    analyze: (body: unknown) => request('analyze-vision', { method: 'POST', body: JSON.stringify(body) }),
  },
  tasks: {
    list: () => request('tasks'),
  },
  gallery: {
    list: (type?: string) => request(`gallery${type ? `?type=${type}` : ''}`),
  },
  usage: {
    get: (days?: number) => request(`usage${days ? `?days=${days}` : ''}`),
  },
  admin: {
    users: {
      list: () => request('admin/users'),
      create: (body: unknown) => request('admin/users', { method: 'POST', body: JSON.stringify(body) }),
    },
    models: {
      list: () => request('admin/models'),
      create: (body: unknown) => request('admin/models', { method: 'POST', body: JSON.stringify(body) }),
    },
    agents: {
      list: () => request('admin/agents'),
      create: (body: unknown) => request('admin/agents', { method: 'POST', body: JSON.stringify(body) }),
    },
    usageSummary: () => request('admin/usage-summary'),
    settings: {
      list: () => request('admin/settings'),
      update: (key: string, value: string) => request('admin/settings', { method: 'POST', body: JSON.stringify({ key, value }) }),
    },
  },
};
