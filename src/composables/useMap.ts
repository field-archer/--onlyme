import { ref, onMounted, onUnmounted, Ref } from 'vue';

// 地图实例类型
type MapInstance = any;
// 定位控件类型
type GeolocationInstance = any;
// 标记实例类型
type MarkerInstance = any;
// 坐标类型
type LngLat = [number, number];

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
  let markerData: { [key: string]: { marker: any, circle: any, interval: any } } = {};

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
        plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.Geolocation']
      });

      if (!mapContainer.value) {
        throw new Error('地图容器不存在');
      }

      // 如果地图已存在，先销毁
      if (map.value) {
        map.value.destroy();
      }

      // 创建地图实例
      const mapInstance = new AMap.Map(mapContainer.value, {
        viewMode: '3D',
        zoom: 11,
        center: [116.397428, 39.90923]
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
  const getCurrentLocation = (): Promise<{ position: LngLat }> => {
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
   * 添加火灾标记
   * @param position 位置坐标
   */
  const addFireMarker = (position: LngLat) => {
    if (!map.value) return;

    const AMap = (window as any).AMap;
    if (!AMap) return;

    // 创建火灾标记
    const fireMarker = new AMap.Marker({
      position: position,
      map: map.value,
      icon: new AMap.Icon({
        size: new AMap.Size(40, 40),
        image: 'https://a.amap.com/jsapi_demos/static/demo-center/icons/fire.png',
        imageSize: new AMap.Size(40, 40)
      }),
      animation: 'AMAP_ANIMATION_BOUNCE'
    });

    // 添加热力效果（使用Circle模拟）
    const circle = new AMap.Circle({
      center: position,
      radius: 100,
      fillColor: 'rgba(255, 69, 0, 0.3)',
      strokeColor: 'rgba(255, 69, 0, 0.6)',
      strokeWeight: 2
    });
    circle.setMap(map.value);

    // 动画效果
    let radius = 100;
    const animationInterval = setInterval(() => {
      if (!map.value) {
        clearInterval(animationInterval);
        return;
      }
      radius = radius === 100 ? 150 : 100;
      circle.setRadius(radius);
    }, 1000);

    // 生成唯一ID
    const markerId = `marker_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 存储标记相关的对象
    markerData[markerId] = {
      marker: fireMarker,
      circle: circle,
      interval: animationInterval
    };

    // 添加点击事件
    fireMarker.on('click', () => {
      if (confirm('确定要删除这个火灾标记吗？')) {
        fireMarker.remove();
        circle.remove();
        clearInterval(animationInterval);
        // 从标记数组中移除
        const index = markers.value.indexOf(fireMarker);
        if (index > -1) {
          markers.value.splice(index, 1);
        }
        // 从markerData中移除
        delete markerData[markerId];
      }
    });

    // 调整地图视角
    map.value.setCenter(position);
    map.value.setZoom(15);

    // 保存标记实例
    markers.value.push(fireMarker);
  };

  /**
   * 清除所有标记
   */
  const clearMarkers = () => {
    // 清除所有标记和相关对象
    Object.values(markerData).forEach(data => {
      data.marker.remove();
      data.circle.remove();
      clearInterval(data.interval);
    });
    markerData = {};
    markers.value = [];
  };

  /**
   * 销毁地图
   */
  const destroyMap = () => {
    if (map.value) {
      map.value.destroy();
      map.value = null;
      geolocation.value = null;
      isMapLoaded.value = false;
      markers.value = [];
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
    addFireMarker,
    clearMarkers,
    destroyMap
  };
}