import { ref, onMounted, onUnmounted, Ref } from 'vue';
import { notifyGeoServiceError } from '../utils/geoApiError';

// 地图实例类型
type MapInstance = any;
// 定位控件类型
type GeolocationInstance = any;
// 标记实例类型
type MarkerInstance = any;
/** 坐标：[lng,lat] 或高德 LngLat 对象 */
export type LngLatInput =
  | [number, number]
  | { getLng: () => number; getLat: () => number }
  | { lng: number; lat: number };

/** 添加火点标记时的展示与同步选项（见《前端对接-用户与火点标记.md》） */
export type AddFireMarkerOptions = {
  serverId?: number;
  fireCount: number;
  markedAt?: string;
  onRemoteDelete?: (serverId: number) => Promise<void>;
  /** 火焰等级：低/中/高（用于前端展示差异化样式） */
  level?: 'low' | 'medium' | 'high';
  /** 火灾原因（用于前端展示/标题） */
  cause?: 'human' | 'lightning' | 'farming' | 'unknown';
  /**
   * 自定义点击标记的行为（例如：更改状态）。提供则不会走默认“点击删除”逻辑。
   */
  onMarkerClick?: (ctx: {
    serverId?: number;
    fireCount: number;
    markedAt?: string;
    marker: any;
    circle: any;
  }) => void | Promise<void>;
};

/** 地名搜索结果类型见 `src/api/geo.ts`（由后端代理检索，不在此文件重复定义） */

/** 高德 JSAPI Key + 安全密钥（通常来自 GET /api/geo/map-config） */
export type MapCredentials = {
  jsapiKey: string;
  securityJsCode: string;
};

export type UseMapOptions = {
  /** 登录后由服务端下发 Key；未提供时仅开发可用 .env 回退 */
  fetchMapCredentials?: () => Promise<MapCredentials>;
};

/**
 * 火点图标（内联 SVG），避免对图商 CDN 发起 HTTP。
 * 原高德 demo PNG 在同样 imageSize 下四周留白较多，主图形更小；这里对图形做约 0.72 倍居中缩放，观感接近旧版占比。
 */
const FIRE_MARKER_ICON =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
      '<g transform="translate(24 24) scale(0.72) translate(-24 -24)">' +
      '<path fill="#ff5722" stroke="rgba(255,255,255,0.9)" stroke-width="1.75" d="M24 8c-1.5 6-6 10-6 17a6 6 0 1012 0c0-5-3-9-6-17zm0 22a4 4 0 110-.01z"/>' +
      '</g></svg>'
  );

function normalizeLngLat(AMap: any, position: LngLatInput): any {
  let lng: number;
  let lat: number;
  if (Array.isArray(position)) {
    lng = Number(position[0]);
    lat = Number(position[1]);
  } else if (typeof (position as any).getLng === 'function') {
    lng = (position as any).getLng();
    lat = (position as any).getLat();
  } else {
    lng = (position as { lng: number }).lng;
    lat = (position as { lat: number }).lat;
  }
  return new AMap.LngLat(lng, lat);
}

// 全局变量，用于判断地图脚本是否已加载
let isScriptLoaded = false;
let scriptLoadPromise: Promise<any> | null = null;

/**
 * 地图相关的组合式函数
 */
export function useMap(mapContainer: Ref<HTMLElement | null>, mapOptions?: UseMapOptions) {
  /** 防止 onMounted 与外部 watch 并发重复 init（每个 useMap 实例独立） */
  let initMapMutex: Promise<unknown> | null = null;
  // 地图实例
  const map = ref<MapInstance | null>(null);
  // 定位控件实例
  const geolocation = ref<GeolocationInstance | null>(null);
  // 标记实例
  const markers = ref<MarkerInstance[]>([]);
  // 地图加载状态
  const isMapLoaded = ref(false);
  /** 地图初始化失败时的可读说明（含服务端未配置 Key 等） */
  const mapInitError = ref('');
  // 存储标记相关的对象
  let markerData: {
    [key: string]: {
      marker: any;
      circle: any;
      serverId?: number;
    };
  } = {};
  /**
   * 加载高德地图脚本
   */
  const loadAMapScript = (): Promise<any> => {
    // 如果已经在加载中，返回现有的Promise
    if (scriptLoadPromise) {
      return scriptLoadPromise;
    }

    // 如果已经加载完成，直接返回resolved的Promise
    if (isScriptLoaded && (window as any).AMap) {
      return Promise.resolve((window as any).AMap);
    }

    // 创建新的加载Promise（须在调用前设置 window._AMapSecurityConfig）
    scriptLoadPromise = new Promise((resolve, reject) => {
      // 检查是否已存在脚本标签
      const existingScript = document.querySelector('script[src="https://webapi.amap.com/loader.js"]');
      if (existingScript) {
        // 脚本已存在，等待加载完成
        const checkAMap = () => {
          if ((window as any).AMapLoader) {
            isScriptLoaded = true;
            resolve((window as any).AMapLoader);
          } else {
            setTimeout(checkAMap, 100);
          }
        };
        checkAMap();
        return;
      }

      // 加载高德地图脚本
      const script = document.createElement('script');
      script.src = 'https://webapi.amap.com/loader.js';
      script.onload = () => {
        isScriptLoaded = true;
        resolve((window as any).AMapLoader);
      };
      script.onerror = () => {
        scriptLoadPromise = null;
        reject(new Error('地图脚本加载失败'));
      };
      document.head.appendChild(script);
    });

    return scriptLoadPromise;
  };

  /**
   * 初始化地图
   */
  const initMap = async () => {
    if (initMapMutex) {
      return await initMapMutex;
    }
    initMapMutex = (async () => {
    mapInitError.value = '';
    try {
      let jsapiKey = '';
      let securityJsCode = '';
      if (mapOptions?.fetchMapCredentials) {
        const c = await mapOptions.fetchMapCredentials();
        jsapiKey = (c.jsapiKey || '').trim();
        securityJsCode = (c.securityJsCode || '').trim();
      } else {
        jsapiKey = (import.meta.env.VITE_AMAP_KEY || '').trim();
        securityJsCode = (import.meta.env.VITE_AMAP_SECURITY_CODE || '').trim();
      }

      if (!jsapiKey) {
        throw new Error(
          '地图 Key 未配置：请登录后由服务端 GET /api/geo/map-config 下发 jsapi_key，或在本地 .env 设置 VITE_AMAP_KEY（仅供调试）。'
        );
      }

      (window as any)._AMapSecurityConfig = {
        securityJsCode: securityJsCode || ''
      };

      const AMapLoader = await loadAMapScript();

      const AMap = await AMapLoader.load({
        key: jsapiKey,
        version: '2.0',
        plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geolocation']
      });

      // 确保全局可用：HomeView/useMap 的覆盖物逻辑依赖 window.AMap
      (window as any).AMap = AMap;

      if (!mapContainer.value) {
        throw new Error('地图容器不存在');
      }

      if (map.value) {
        map.value.destroy();
      }

      const satelliteLayer = new AMap.TileLayer.Satellite({ zIndex: 5 });
      const roadNetLayer = new AMap.TileLayer.RoadNet({ zIndex: 10 });

      const mapInstance = new AMap.Map(mapContainer.value, {
        viewMode: '2D',
        zoom: 11,
        center: [116.397428, 39.90923],
        layers: [satelliteLayer, roadNetLayer]
      });

      mapInstance.addControl(new AMap.Scale());
      mapInstance.addControl(new AMap.ToolBar());

      const geolocationInstance = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        buttonPosition: 'RB',
        buttonOffset: new AMap.Pixel(10, 20),
        zoomToAccuracy: true
      });

      mapInstance.addControl(geolocationInstance);

      map.value = mapInstance;
      geolocation.value = geolocationInstance;
      isMapLoaded.value = true;
      mapInitError.value = '';

      return mapInstance;
    } catch (error: unknown) {
      console.error('地图初始化失败:', error);
      notifyGeoServiceError(error);
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : '地图初始化失败';
      mapInitError.value = msg;
      throw error;
    }
    })();
    try {
      return await initMapMutex;
    } finally {
      initMapMutex = null;
    }
  };

  /**
   * 获取当前位置
   */
  const getCurrentLocation = (): Promise<{ position: LngLatInput }> => {
    return new Promise((resolve, reject) => {
      if (!geolocation.value) {
        reject(new Error('定位控件未初始化'));
        return;
      }

      geolocation.value.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete') {
          resolve(result);
        } else {
          reject(new Error(result.info));
        }
      });
    });
  };

  /** 将地图中心移到该点并放大（用于搜索选中后的预览，4b） */
  const focusMapOn = (position: LngLatInput) => {
    if (!map.value) return;
    const AMap = (window as any).AMap;
    if (!AMap) return;
    const center = normalizeLngLat(AMap, position);
    map.value.setCenter(center);
    map.value.setZoom(15);
  };

  /**
   * 添加火灾标记（展示火焰数、标记时间；可绑定服务端 id 与删除同步）
   */
  const addFireMarker = (position: LngLatInput, options?: AddFireMarkerOptions) => {
    if (!map.value) return;

    const AMap = (window as any).AMap;
    if (!AMap) return;

    const fireCount = Math.max(1, Math.floor(options?.fireCount ?? 1));
    const serverId = options?.serverId;
    const markedAt = options?.markedAt ?? '';
    const onRemoteDelete = options?.onRemoteDelete;
    const onMarkerClick = options?.onMarkerClick;
    const level = options?.level ?? 'low';
    const cause = options?.cause ?? 'unknown';

    const center = normalizeLngLat(AMap, position);

    const lvText = level === 'high' ? '高' : level === 'medium' ? '中' : '低';
    const causeText =
      cause === 'human' ? '人为' : cause === 'lightning' ? '雷击' : cause === 'farming' ? '农事' : '未知';
    const titleParts = [`火焰 ${fireCount} 处`, `等级${lvText}`, `原因${causeText}`];
    if (markedAt) {
      try {
        titleParts.push(new Date(markedAt).toLocaleString('zh-CN', { hour12: false }));
      } catch {
        titleParts.push(markedAt);
      }
    }
    const markerTitle = titleParts.join(' · ');

    const styleByLevel =
      level === 'high'
        ? { size: 46, radius: 160, fill: 'rgba(245, 63, 63, 0.18)', stroke: 'rgba(245, 63, 63, 0.80)' }
        : level === 'medium'
          ? { size: 42, radius: 130, fill: 'rgba(255, 125, 0, 0.18)', stroke: 'rgba(255, 125, 0, 0.82)' }
          : { size: 40, radius: 110, fill: 'rgba(255, 214, 0, 0.16)', stroke: 'rgba(255, 200, 60, 0.88)' };

    const fireMarker = new AMap.Marker({
      position: center,
      map: map.value,
      anchor: 'center',
      offset: new AMap.Pixel(0, 0),
      zIndex: 120,
      title: markerTitle,
      icon: new AMap.Icon({
        size: new AMap.Size(styleByLevel.size, styleByLevel.size),
        image: FIRE_MARKER_ICON,
        imageSize: new AMap.Size(styleByLevel.size, styleByLevel.size)
      })
    });

    const circle = new AMap.Circle({
      center,
      radius: styleByLevel.radius,
      fillColor: styleByLevel.fill,
      strokeColor: styleByLevel.stroke,
      strokeWeight: 2,
      bubble: true,
      zIndex: 50
    });
    circle.setMap(map.value);

    const markerId = `marker_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    markerData[markerId] = {
      marker: fireMarker,
      circle,
      serverId
    };

    fireMarker.on('click', async () => {
      if (onMarkerClick) {
        await onMarkerClick({ serverId, fireCount, markedAt, marker: fireMarker, circle });
        return;
      }
      const timeLabel = markedAt
        ? (() => {
            try {
              return new Date(markedAt).toLocaleString('zh-CN', { hour12: false });
            } catch {
              return markedAt;
            }
          })()
        : '—';
      const msg = `确定删除该火点标记？\n\n火焰数量：${fireCount}\n标记时间：${timeLabel}`;
      if (!confirm(msg)) return;

      if (serverId != null && onRemoteDelete) {
        try {
          await onRemoteDelete(serverId);
        } catch (e: any) {
          alert(e?.message || '服务器删除失败');
          return;
        }
      }

      fireMarker.remove();
      circle.remove();
      const index = markers.value.indexOf(fireMarker);
      if (index > -1) {
        markers.value.splice(index, 1);
      }
      delete markerData[markerId];
    });

    markers.value.push(fireMarker);
  };

  /** 当前地图上所有已同步到服务端的火点 id（用于批量删除等） */
  const collectServerMarkerIds = (): number[] => {
    const ids = new Set<number>();
    Object.values(markerData).forEach((d) => {
      if (d.serverId != null) ids.add(d.serverId);
    });
    return [...ids];
  };

  /**
   * 清除所有标记
   */
  const clearMarkers = () => {
    // 清除所有标记和相关对象
    Object.values(markerData).forEach(data => {
      data.marker.remove();
      data.circle.remove();
    });
    markerData = {};
    markers.value = [];
  };

  /**
   * 销毁地图
   */
  const destroyMap = () => {
    Object.values(markerData).forEach((data) => {
      try {
        data.marker.remove();
        data.circle.remove();
      } catch {
        /* ignore */
      }
    });
    markerData = {};
    markers.value = [];
    if (map.value) {
      map.value.destroy();
      map.value = null;
      geolocation.value = null;
      isMapLoaded.value = false;
    }
  };

  // 组件挂载时初始化地图
  onMounted(() => {
    initMap().catch(error => {
      console.error('地图初始化失败:', error);
    });
  });

  // 组件卸载时销毁地图
  onUnmounted(() => {
    destroyMap();
  });

  return {
    map,
    geolocation,
    markers,
    isMapLoaded,
    mapInitError,
    initMap,
    getCurrentLocation,
    focusMapOn,
    addFireMarker,
    collectServerMarkerIds,
    clearMarkers,
    destroyMap
  };
}