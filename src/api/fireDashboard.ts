import { apiFetch } from './client';
import type { FireDashboardData } from './types';

export async function getFireDashboard(token: string) {
  return apiFetch<FireDashboardData>('/fire-dashboard', { method: 'GET', token });
}

