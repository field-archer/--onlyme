import { apiFetch } from './client';
import type { FireMarkerItem, FireMarkerListData } from './types';

export type CreateFireMarkerBody = {
  longitude: number;
  latitude: number;
  marked_at?: string;
  fire_count: number;
  source?: string;
  note?: string | null;
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
