import { ref, onMounted, onUnmounted, Ref } from 'vue';

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

/** 地名搜索结果（供侧栏列表展示） */
export interface PlaceSearchPoiItem {
  id: string;
  name: string;
  address: string;
  location: [number, number];
}

function poiLocationToTuple(poi: any): [number, number] | null {
  const loc = poi?.location;
  if (!loc) return null;
  if (Array.isArray(loc) && loc.length >= 2) {
    return [Number(loc[0]), Number(loc[1])];
  }
  if (typeof loc.getLng === 'function') {
    return [loc.getLng(), loc.getLat()];
  }
  if (typeof loc.lng === 'number' && typeof loc.lat === 'number') {
    return [loc.lng, loc.lat];
  }
  return null;
}

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
export function useMap(mapContainer: Ref<HTMLElement | null>) {
  // 地图实例
  const map = ref<MapInstance | null>(null);
  // 定位控件实例
  const geolocation = ref<GeolocationInstance | null>(null);
  // 标记实例
  const markers = ref<MarkerInstance[]>([]);
  // 地图加载状态
  const isMapLoaded = ref(false);
  // 存储标记相关的对象
  let markerData: {
    [key: string]: {
      marker: any;
      circle: any;
      serverId?: number;
    };
  } = {};
  let placeSearchInstance: any = null;

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

    // 创建新的加载Promise
    scriptLoadPromise = new Promise((resolve, reject) => {
      // 安全密钥配置
      (window as any)._AMapSecurityConfig = {
        securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE || '您的安全密钥',
      };

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
    try {
      // 等待地图脚本加载
      const AMapLoader = await loadAMapScript();
      
      // 加载地图和插件
      const AMap = await AMapLoader.load({
        key: import.meta.env.VITE_AMAP_KEY || '您的Web端开发者Key',
        version: '2.0',
        plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geolocation', 'AMap.PlaceSearch']
      });

      // 确保全局可用：HomeView/useMap 的覆盖物逻辑依赖 window.AMap
      (window as any).AMap = AMap;

      if (!mapContainer.value) {
        throw new Error('地图容器不存在');
      }

      // 如果地图已存在，先销毁
      if (map.value) {
        map.value.destroy();
      }

      // 方案 A：卫星影像 + 路网，便于野外/林相辨识；路网叠在影像之上
      const satelliteLayer = new AMap.TileLayer.Satellite({ zIndex: 5 });
      const roadNetLayer = new AMap.TileLayer.RoadNet({ zIndex: 10 });

      // 2D 俯视图：与 Circle 等矢量覆盖物对齐稳定
      const mapInstance = new AMap.Map(mapContainer.value, {
        viewMode: '2D',
        zoom: 11,
        center: [116.397428, 39.90923],
        layers: [satelliteLayer, roadNetLayer]
      });

      // 添加控件
      mapInstance.addControl(new AMap.Scale());
      mapInstance.addControl(new AMap.ToolBar());

      // 初始化定位控件
      const geolocationInstance = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        buttonPosition: 'RB',
        buttonOffset: new AMap.Pixel(10, 20),
        zoomToAccuracy: true
      });

      mapInstance.addControl(geolocationInstance);

      // 不绑定 map/panel，仅回调取数，由 Vue 侧自绘列表
      placeSearchInstance = new AMap.PlaceSearch({
        pageSize: 15,
        pageIndex: 1
      });

      // 更新状态
      map.value = mapInstance;
      geolocation.value = geolocationInstance;
      isMapLoaded.value = true;

      return mapInstance;
    } catch (error) {
      console.error('地图初始化失败:', error);
      throw error;
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

  /**
   * 关键字搜索 POI（全国，不限制城市）
   */
  const searchPlaces = (keyword: string): Promise<PlaceSearchPoiItem[]> => {
    const kw = keyword.trim();
    if (!kw) return Promise.resolve([]);

    return new Promise((resolve) => {
      if (!placeSearchInstance) {
        resolve([]);
        return;
      }
      placeSearchInstance.search(kw, (status: string, result: any) => {
        if (status !== 'complete' || !result?.poiList?.pois?.length) {
          resolve([]);
          return;
        }
        const items: PlaceSearchPoiItem[] = [];
        result.poiList.pois.forEach((poi: any, i: number) => {
          const tuple = poiLocationToTuple(poi);
          if (!tuple) return;
          const addr = [poi.pname, poi.cityname, poi.adname, poi.address].filter(Boolean).join('');
          items.push({
            id: poi.id != null && poi.id !== '' ? String(poi.id) : `poi-${i}`,
            name: poi.name || '未命名地点',
            address: addr || poi.address || '',
            location: tuple
          });
        });
        resolve(items);
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
          : { size: 40, radius: 110, fill: 'rgba(0, 150, 136, 0.16)', stroke: 'rgba(0, 150, 136, 0.82)' };

    const fireMarker = new AMap.Marker({
      position: center,
      map: map.value,
      anchor: 'center',
      offset: new AMap.Pixel(0, 0),
      zIndex: 120,
      title: markerTitle,
      icon: new AMap.Icon({
        size: new AMap.Size(styleByLevel.size, styleByLevel.size),
        image: 'https://a.amap.com/jsapi_demos/static/demo-center/icons/fire.png',
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
    placeSearchInstance = null;
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
    initMap,
    getCurrentLocation,
    searchPlaces,
    focusMapOn,
    addFireMarker,
    collectServerMarkerIds,
    clearMarkers,
    destroyMap
  };
}