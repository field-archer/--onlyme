import type { FireLevel, FireStatus } from '../api/types';

export function statusText(s: FireStatus): string {
  if (s === 'pending') return '未处置';
  if (s === 'handling') return '处置中';
  return '已扑灭';
}

export function levelText(lv: FireLevel): string {
  if (lv === 'low') return '低';
  if (lv === 'medium') return '中';
  return '高';
}

export function formatIsoTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

