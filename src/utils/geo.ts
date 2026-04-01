import type { LngLatInput } from '../composables/useMap';

export function lngLatInputToCoords(loc: LngLatInput): [number, number] {
  if (Array.isArray(loc)) {
    return [Number(loc[0]), Number(loc[1])];
  }
  const o = loc as { getLng?: () => number; getLat?: () => number; lng?: number; lat?: number };
  if (typeof o.getLng === 'function') {
    return [o.getLng(), o.getLat!()];
  }
  return [o.lng!, o.lat!];
}

export function formatMarkedAtDisplay(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}
