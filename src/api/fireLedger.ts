import { apiFetch } from './client';
import type { FireLedgerListData } from './types';

export async function listFireLedger(
  token: string,
  params?: { page?: number; page_size?: number }
) {
  const q = new URLSearchParams();
  if (params?.page != null) q.set('page', String(params.page));
  if (params?.page_size != null) q.set('page_size', String(params.page_size));
  const qs = q.toString();
  return apiFetch<FireLedgerListData>(
    `/fire-ledger${qs ? `?${qs}` : ''}`,
    { method: 'GET', token }
  );
}

