import { API_BASE_URL } from '../config/api';
import type { ApiEnvelope } from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly httpStatus: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchOptions = RequestInit & {
  token?: string | null;
  skipJson?: boolean;
};

/**
 * 调用统一 JSON 接口；成功时返回 data，失败抛出 ApiError
 */
export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(options.headers);

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (options.skipJson) {
    return undefined as T;
  }

  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (body.code !== 20000) {
    throw new ApiError(body.message || '请求失败', body.code ?? 0, res.status);
  }

  return body.data as T;
}
