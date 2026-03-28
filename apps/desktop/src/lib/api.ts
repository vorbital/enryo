const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {},
  token: string | null = null
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
}

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  topic: string | null;
  position: number;
}

export interface MessageWithAuthor {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  is_pertinent: boolean;
  parent_id: string | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

export interface WorkspaceSettings {
  primary_hue?: number;
  primary_saturation?: number;
  secondary_hue?: number;
  secondary_saturation?: number;
}

export const api = {
  auth: {
    register: (email: string, password: string, displayName: string) =>
      fetchWithAuth<{ token: string; user_id: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, display_name: displayName }),
      }),
    login: (email: string, password: string) =>
      fetchWithAuth<{ token: string; user_id: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
  },
  workspaces: {
    list: (token: string) =>
      fetchWithAuth<Workspace[]>('/workspaces', {}, token),
    get: (token: string, slug: string) =>
      fetchWithAuth<Workspace>(`/workspaces/${slug}`, {}, token),
    create: (token: string, name: string, slug: string) =>
      fetchWithAuth<Workspace>('/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name, slug }),
      }, token),
    channels: (token: string, slug: string) =>
      fetchWithAuth<Channel[]>(`/workspaces/${slug}/channels`, {}, token),
    createChannel: (token: string, slug: string, name: string, topic?: string) =>
      fetchWithAuth<Channel>(`/workspaces/${slug}/channels`, {
        method: 'POST',
        body: JSON.stringify({ name, topic }),
      }, token),
    updateChannel: (token: string, channelId: string, data: { name?: string; topic?: string }) =>
      fetchWithAuth<Channel>(`/channels/${channelId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, token),
    getSettings: (token: string, slug: string) =>
      fetchWithAuth<WorkspaceSettings>(`/workspaces/${slug}/settings`, {}, token),
    updateSettings: (token: string, slug: string, settings: Partial<WorkspaceSettings>) =>
      fetchWithAuth<WorkspaceSettings>(`/workspaces/${slug}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(settings),
      }, token),
  },
  channels: {
    get: (token: string, id: string) =>
      fetchWithAuth<Channel>(`/channels/${id}`, {}, token),
    messages: (token: string, channelId: string, before?: string, limit = 50) => {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      if (before) params.set('before', before);
      return fetchWithAuth<MessageWithAuthor[]>(`/channels/${channelId}/messages?${params}`, {}, token);
    },
    createMessage: (token: string, channelId: string, content: string) =>
      fetchWithAuth<MessageWithAuthor>(`/channels/${channelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }, token),
    deleteMessage: (token: string, channelId: string, messageId: string) =>
      fetchWithAuth<void>(`/channels/${channelId}/messages/${messageId}`, {
        method: 'DELETE',
      }, token),
  },
};
