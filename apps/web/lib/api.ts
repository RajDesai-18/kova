const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiOptions extends RequestInit {
  json?: unknown;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { json, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (json) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers,
    body: json ? JSON.stringify(json) : undefined,
    ...rest,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      data?.error?.code || 'UNKNOWN_ERROR',
      data?.error?.message || 'Something went wrong',
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
