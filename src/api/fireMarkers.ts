import { apiFetch } from './client';
import type { FireCause, FireLevel, FireMarkerItem, FireMarkerListData, FireStatus } from './types';

export type CreateFireMarkerBody = {
  longitude: number;
  latitude: number;
  marked_at?: string;
  fire_count: number;
  source?: string;
  note?: string | null;
  status?: FireStatus;
  level?: 'low' | 'medium' | 'high';
  cause?: 'human' | 'lightning' | 'farming' | 'unknown';
  region?: string | null;
};

export async function listFireMarkers(
  token: string,
  params?: { page?: number; page_size?: number }
) {
  const q = new URLSearchParams();
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.page_size != null) q.set('page_size', String(params.page_size));
  const qs = q.toString();
  return apiFetch<FireMarkerListData>(
    `/fire-markers${qs ? `?${qs}` : ''}`,
    { method: 'GET', token }
  );
}

export async function createFireMarker(token: string, body: CreateFireMarkerBody) {
  return apiFetch<FireMarkerItem>('/fire-markers', {
    method: 'POST',
    token,
    body: JSON.stringify(body)
  });
}

export async function deleteFireMarker(token: string, id: number) {
  return apiFetch<null>(`/fire-markers/${id}`, {
    method: 'DELETE',
    token
  });
}

export async function updateFireMarkerStatus(
  token: string,
  id: number,
  body: { status: FireStatus }
) {
  return apiFetch<FireMarkerItem>(`/fire-markers/${id}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(body)
  });
}

export async function updateFireMarker(
  token: string,
  id: number,
  body: {
    status?: FireStatus;
    level?: FireLevel;
    cause?: FireCause;
    /** 须与 latitude 成对传，服务端逆地理刷新区县 */
    longitude?: number;
    latitude?: number;
  }
) {
  return apiFetch<FireMarkerItem>(`/fire-markers/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(body)
  });
}
