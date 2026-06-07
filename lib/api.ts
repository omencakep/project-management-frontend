const baseURL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:3000';

export function setAuthToken(_token?: string | null) {
  return _token;
}

export async function apiFetch<T>(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    token?: string | null;
  },
) {
  const response = await fetch(`${baseURL}${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed');
  }
  return payload as T;
}
