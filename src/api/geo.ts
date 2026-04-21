import { apiFetch } from './client';

/** 登录后由服务端下发 JS API Key 与安全码（勿把 Key 写死进仓库） */
export type GeoMapConfigData = {
  jsapi_key: string;
  security_js_code: string;
};

export async function fetchGeoMapConfig(token: string) {
  return apiFetch<GeoMapConfigData>('/geo/map-config', {
    method: 'GET',
    token
  });
}

/** 地名搜索 POI（由后端代理高德等图商，前端不直连外网业务接口） */
export type GeoPlaceSearchItem = {
  id: string;
  name: string;
  address: string;
  location: [number, number];
};

export async function geoPlaceSearch(token: string, keyword: string) {
  const q = new URLSearchParams();
  q.set('q', keyword.trim());
  return apiFetch<GeoPlaceSearchItem[]>(`/geo/place-search?${q.toString()}`, {
    method: 'GET',
    token
  });
}

/** 逆地理：区县级名称（后端代理高德 Web 服务，仅存服务端 Key；可多字段兼容） */
export type GeoReverseDistrictData = {
  district?: string;
  region?: string;
  county?: string;
  formatted_address?: string;
  address?: string;
  [key: string]: unknown;
};

export async function geoReverseDistrict(token: string, longitude: number, latitude: number) {
  const q = new URLSearchParams();
  q.set('longitude', String(longitude));
  q.set('latitude', String(latitude));
  return apiFetch<GeoReverseDistrictData>(`/geo/reverse-geocode?${q.toString()}`, {
    method: 'GET',
    token
  });
}
