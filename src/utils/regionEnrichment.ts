import { geoReverseDistrict } from '../api/geo';
import type { FireLedgerItem, FireLevel, FireMarkerItem, FireStatus } from '../api/types';
import { notifyGeoServiceError } from './geoApiError';

const PLACEHOLDER_REGIONS = new Set(['', '未知', '—', '-']);

export function isPlaceholderRegion(r: string | null | undefined): boolean {
  if (r == null) return true;
  const t = String(r).trim();
  return t.length === 0 || PLACEHOLDER_REGIONS.has(t);
}

export function coordKey(lng: number, lat: number): string {
  return `${Number(lng).toFixed(6)},${Number(lat).toFixed(6)}`;
}

const districtCache = new Map<string, string>();

/** 从逆地理接口 data 中抽取展示用区县/地址（兼容多种后端字段名） */
function pickDistrict(raw: unknown): string {
  if (raw == null || typeof raw !== 'object') return '';
  const r = raw as Record<string, unknown>;
  const tryStr = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  for (const key of ['district', 'region', 'county', 'district_name', 'area', 'adname']) {
    const s = tryStr(r[key]);
    if (s) return s;
  }
  for (const key of ['formatted_address', 'address', 'full_address']) {
    const s = tryStr(r[key]);
    if (s) return s;
  }
  return '';
}

export async function getDistrictForCoords(
  token: string,
  lng: number,
  lat: number
): Promise<string> {
  const k = coordKey(lng, lat);
  if (districtCache.has(k)) return districtCache.get(k)!;
  try {
    const res = await geoReverseDistrict(token, lng, lat);
    const d = pickDistrict(res);
    const val = d.length > 0 ? d : '未解析区县';
    // 仅缓存成功解析结果，避免后端修好接口后仍命中旧「未解析区县」
    if (d.length > 0) districtCache.set(k, val);
    return val;
  } catch (e) {
    notifyGeoServiceError(e);
    return '未解析区县';
  }
}

/** 并发小批量逆地理，避免一次打满连接 */
export async function getDistrictMany(
  token: string,
  pairs: Array<[number, number]>
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (pairs.length === 0) return out;
  const unique = new Map<string, [number, number]>();
  for (const [lng, lat] of pairs) {
    const k = coordKey(lng, lat);
    unique.set(k, [lng, lat]);
  }
  const entries = [...unique.entries()];
  const chunk = 5;
  for (let i = 0; i < entries.length; i += chunk) {
    const slice = entries.slice(i, i + chunk);
    await Promise.all(
      slice.map(async ([k, [lng, lat]]) => {
        const d = await getDistrictForCoords(token, lng, lat);
        out.set(k, d);
      })
    );
  }
  return out;
}

/** 按当前火点列表聚合成各区县数量（缺 region 时走后端逆地理） */
export async function buildRegionBarFromMarkers(
  token: string,
  markers: FireMarkerItem[]
): Promise<Array<{ name: string; value: number }>> {
  if (!markers.length) return [];
  const needRegeo: Array<[number, number]> = [];
  for (const m of markers) {
    if (isPlaceholderRegion(m.region)) {
      needRegeo.push([m.longitude, m.latitude]);
    }
  }
  const llMap = await getDistrictMany(token, needRegeo);
  const counts = new Map<string, number>();
  for (const m of markers) {
    let name: string;
    if (!isPlaceholderRegion(m.region)) {
      name = m.region!.trim();
    } else {
      name = llMap.get(coordKey(m.longitude, m.latitude)) || '未解析区县';
    }
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** 服务端 region_bar 是否已有可用的区县维度数据 */
export function isServerRegionBarUseful(
  bar: Array<{ name: string; value: number }> | undefined | null
): boolean {
  if (!bar?.length) return false;
  return bar.some((x) => x.value > 0 && !isPlaceholderRegion(x.name));
}

/** 用火点主表 region 补全台账；仍占位时用坐标走后端逆地理 */
export async function enrichLedgerItems(
  token: string,
  items: FireLedgerItem[],
  markersById: Map<number, FireMarkerItem>
): Promise<FireLedgerItem[]> {
  const sync = items.map((it) => {
    if (!isPlaceholderRegion(it.region)) return it;
    if (it.marker_id != null) {
      const m = markersById.get(it.marker_id);
      if (m && !isPlaceholderRegion(m.region)) {
        return { ...it, region: m.region!.trim() };
      }
    }
    return it;
  });

  const coordsFor: Array<{ idx: number; lng: number; lat: number }> = [];
  sync.forEach((it, idx) => {
    if (!isPlaceholderRegion(it.region)) return;
    let lng: number | undefined;
    let lat: number | undefined;
    if (it.marker_id != null) {
      const m = markersById.get(it.marker_id);
      if (m) {
        lng = m.longitude;
        lat = m.latitude;
      }
    }
    if ((lng == null || lat == null) && it.longitude != null && it.latitude != null) {
      lng = it.longitude;
      lat = it.latitude;
    }
    if (lng != null && lat != null) coordsFor.push({ idx, lng, lat });
  });

  if (coordsFor.length === 0) return sync;

  const pairs = coordsFor.map((c) => [c.lng, c.lat] as [number, number]);
  const llMap = await getDistrictMany(token, pairs);
  const out = [...sync];
  for (const { idx, lng, lat } of coordsFor) {
    const name = llMap.get(coordKey(lng, lat));
    if (!name) continue;
    out[idx] = { ...out[idx], region: name };
  }
  return out;
}

export function markersToIdMap(markers: FireMarkerItem[]): Map<number, FireMarkerItem> {
  return new Map(markers.map((m) => [m.id, m]));
}

const SYNTHETIC_LEDGER_ID_BASE = 1_000_000_000;

/**
 * 将「地图上已存在、但 fire-ledger 尚无对应事件」的火点补进台账列表（时间倒序合并）。
 * 去重：优先用台账行的 marker_id；若无 marker_id，则用台账行上的经纬度与火点坐标（coordKey）比对，避免「有台账但从不带 marker_id」时新火点永远不出现。
 */
export async function mergeLedgerWithPendingMarkers(
  token: string,
  ledgerItems: FireLedgerItem[],
  markers: FireMarkerItem[],
  reporterFallback: string
): Promise<FireLedgerItem[]> {
  const inLedgerById = new Set(
    ledgerItems.map((it) => it.marker_id).filter((x): x is number => x != null)
  );

  const coordKeysFromLedger = new Set(
    ledgerItems
      .filter((it) => it.longitude != null && it.latitude != null)
      .map((it) => coordKey(it.longitude as number, it.latitude as number))
  );

  const pending = markers.filter((m) => {
    if (inLedgerById.has(m.id)) return false;
    const mk = coordKey(m.longitude, m.latitude);
    if (coordKeysFromLedger.has(mk)) return false;
    return true;
  });
  if (pending.length === 0) return ledgerItems;

  const needRegeo: Array<[number, number]> = [];
  for (const m of pending) {
    if (isPlaceholderRegion(m.region)) needRegeo.push([m.longitude, m.latitude]);
  }
  const llMap = await getDistrictMany(token, needRegeo);

  const extras: FireLedgerItem[] = pending.map((m) => {
    const rk = coordKey(m.longitude, m.latitude);
    const region =
      !isPlaceholderRegion(m.region) && m.region
        ? m.region.trim()
        : llMap.get(rk) || '未解析区县';
    return {
      id: -(SYNTHETIC_LEDGER_ID_BASE + m.id),
      marker_id: m.id,
      longitude: m.longitude,
      latitude: m.latitude,
      region,
      status: (m.status ?? 'pending') as FireStatus,
      level: (m.level ?? 'low') as FireLevel,
      updated_at: m.marked_at || m.created_at,
      reporter_username: (m.reporter_username && m.reporter_username.trim()) || reporterFallback
    };
  });

  const merged = [...ledgerItems, ...extras];
  merged.sort((a, b) => {
    const ta = Date.parse(a.updated_at);
    const tb = Date.parse(b.updated_at);
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
  return merged;
}
