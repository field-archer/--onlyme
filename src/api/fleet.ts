import { apiFetch } from './client';

export type FleetTelemetryBody = {
  longitude: number;
  latitude: number;
};

/**
 * 车队（或单车）定位上报：前端周期性上报经纬度给后端。
 * 后端可用于模拟/联调/转发到 ROS 或其他调度系统。
 */
export async function reportFleetTelemetry(token: string, body: FleetTelemetryBody) {
  return apiFetch<null>('/fleet/telemetry', {
    method: 'POST',
    token,
    body: JSON.stringify(body)
  });
}

