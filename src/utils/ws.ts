import { API_BASE_URL } from '../config/api';

export function apiBaseToWsBase(apiBaseUrl: string) {
  // apiBaseUrl example: http://localhost:8000/api
  const u = new URL(apiBaseUrl);
  const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${u.host}`;
}

export function buildWsUrl(path: string, params?: Record<string, string>) {
  const base = apiBaseToWsBase(API_BASE_URL);
  const u = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v);
    }
  }
  return u.toString();
}

