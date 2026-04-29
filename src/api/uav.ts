import { apiFetch } from './client';
import type { UavMissionStartBody, UavMissionStartData } from './types';

export async function startUavMission(token: string, body: UavMissionStartBody) {
  return apiFetch<UavMissionStartData>('/uav/missions', {
    method: 'POST',
    token,
    body: JSON.stringify(body)
  });
}

