<template>
  <div class="home">
    <aside class="side-panel">
      <div class="panel-header">
        <div class="brand">
          <div class="brand-icon" aria-hidden="true">🔥</div>
          <div class="brand-text">
            <div class="brand-title">森林火灾检测系统</div>
            <div class="brand-subtitle">实时地图监控与定位</div>
          </div>
        </div>
        <button class="back-btn" @click="goToMain">
          <span class="btn-icon" aria-hidden="true">🏠</span>
          返回主页
        </button>
      </div>

      <div class="upload-section">
        <div class="upload-area" @click="triggerFileUpload">
          <div class="upload-icon" aria-hidden="true">📁</div>
          <span>上传图片/视频</span>
          <input 
            type="file" 
            ref="fileInput" 
            accept="image/*,video/*" 
            @change="handleFileUpload"
            style="display: none"
          />
        </div>
        <div v-if="selectedFile" class="file-info">
          <div class="file-icon" aria-hidden="true">📄</div>
          <div class="file-details">
            <p class="file-name">{{ selectedFile.name }}</p>
            <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
          <button class="remove-file" @click="removeFile" aria-label="移除文件">×</button>
        </div>
      </div>

      <div class="location-section">
        <button class="location-select-btn" @click="enableLocationSelect" :disabled="!isMapLoaded">
          <span class="btn-icon" aria-hidden="true">📍</span>
          选择地点
        </button>
        <button class="confirm-btn" @click="confirmFireLocation" :disabled="!selectedLocation">
          <span class="btn-icon" aria-hidden="true">✅</span>
          确认火灾位置
        </button>
        <button class="clear-btn" @click="clearFireMarkers" :disabled="markers.length === 0">
          <span class="btn-icon" aria-hidden="true">🗑️</span>
          清除标记
        </button>
      </div>
      <div class="status-section">
        <div class="status-item">
          <span class="status-label">地图状态:</span>
          <span class="status-value" :class="{ 'status-loaded': isMapLoaded, 'status-loading': !isMapLoaded }">
            {{ isMapLoaded ? '已加载' : '加载中...' }}
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">火灾标记:</span>
          <span class="status-value">{{ markers.length }}</span>
        </div>
      </div>
      <div class="panel-footer">
        <div class="chip">
          <span class="dot" :class="{ ok: isMapLoaded, warn: !isMapLoaded }"></span>
          <span>{{ isMapLoaded ? '地图已就绪' : '地图加载中' }}</span>
        </div>
      </div>
    </aside>

    <div ref="mapContainer" class="map-container"></div>
    <button class="location-btn" @click="locateMe" :disabled="!isMapLoaded">
      <span class="btn-icon" aria-hidden="true">📍</span>
    </button>
    <div v-if="isLocationSelecting" class="selecting-overlay">
      <div class="selecting-hint">
        <div class="hint-icon">🎯</div>
        <p>点击地图选择火灾位置</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMap } from '../composables/useMap';

// 路由实例
const router = useRouter();
// 路由参数
const route = useRoute();
// 地图容器引用
const mapContainer = ref<HTMLElement | null>(null);
// 文件输入引用
const fileInput = ref<HTMLInputElement | null>(null);
// 选中的文件
const selectedFile = ref<File | null>(null);
// 选中的位置
const selectedLocation = ref<any>(null);
// 是否正在选择位置
const isLocationSelecting = ref(false);
// 临时标记
let tempMarker: any = null;

// 使用地图组合式函数
const {
  map,
  getCurrentLocation,
  addFireMarker,
  clearMarkers,
  markers,
  isMapLoaded
} = useMap(mapContainer);

// 触发文件上传
const triggerFileUpload = () => {
  fileInput.value?.click();
};

// 处理文件上传
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
  }
};

// 启用位置选择
const enableLocationSelect = () => {
  if (!map.value) {
    alert('地图尚未加载完成，请稍后再试');
    return;
  }
  isLocationSelecting.value = true;
  // 监听地图点击事件
  map.value.on('click', handleMapClick);
};

// 处理地图点击
const handleMapClick = (event: any) => {
  if (isLocationSelecting.value) {
    selectedLocation.value = event.lnglat;
    // 移除之前的临时标记
    if (tempMarker) {
      tempMarker.remove();
    }
    // 添加临时标记
    const AMap = (window as any).AMap;
    if (AMap && map.value) {
      tempMarker = new AMap.Marker({
        position: event.lnglat,
        map: map.value,
        icon: new AMap.Icon({
          size: new AMap.Size(30, 30),
          image: 'https://a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
          imageSize: new AMap.Size(30, 30)
        })
      });
    }
  }
};

// 确认火灾位置
const confirmFireLocation = () => {
  if (selectedLocation.value) {
    isLocationSelecting.value = false;
    // 移除临时标记
    if (tempMarker) {
      tempMarker.remove();
      tempMarker = null;
    }
    // 移除地图点击事件监听
    if (map.value) {
      map.value.off('click', handleMapClick);
    }
    // 添加火灾标记和动画
    addFireMarker(selectedLocation.value);
    // 显示成功提示
    alert('火灾位置已标记');
    // 重置状态
    selectedFile.value = null;
    selectedLocation.value = null;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
};

// 定位功能
const locateMe = async () => {
  if (!map.value) {
    alert('地图尚未加载完成，请稍后再试');
    return;
  }
  try {
    const result = await getCurrentLocation();
    const lnglat = result.position;
    map.value.setCenter(lnglat);
    map.value.setZoom(15);
  } catch (error) {
    alert('定位失败：' + (error as Error).message);
  }
};

// 返回主页
const goToMain = () => {
  // 清理状态
  isLocationSelecting.value = false;
  if (map.value) {
    map.value.off('click', handleMapClick);
  }
  if (tempMarker) {
    tempMarker.remove();
    tempMarker = null;
  }
  selectedLocation.value = null;
  selectedFile.value = null;
  router.push('/');
};

// 清除所有火灾标记
const clearFireMarkers = () => {
  clearMarkers();
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 移除文件
const removeFile = () => {
  selectedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

// 监听地图加载状态，加载完成后检查是否需要自动标记和定位
watch(isMapLoaded, (loaded) => {
  if (loaded) {
    // 自动更新定位
    const updateLocation = async () => {
      try {
        const result = await getCurrentLocation();
        const lnglat = result.position;
        if (map.value) {
          map.value.setCenter(lnglat);
          map.value.setZoom(15);
        }
      } catch (error) {
        console.error('自动定位失败:', error);
      }
    };
    
    // 执行自动定位
    updateLocation();
    
    // 检查是否需要自动标记火灾点
    if (route.query.detect === 'true') {
      // 延迟一点执行，确保地图完全就绪
      setTimeout(() => {
        getCurrentLocation().then(result => {
          addFireMarker(result.position);
        }).catch(error => {
          console.error('获取位置失败:', error);
        });
      }, 500);
    }
  }
});

// 组件挂载时的初始化
onMounted(() => {
  // 地图初始化已在useMap中处理
  // 自动定位和标记功能已在watch中处理
});
</script>

<style scoped>
.home {
  width: 100%;
  height: 100%;
  position: relative;
  background: transparent;
}

.side-panel {
  position: absolute;
  top: 16px;
  left: 16px;
  bottom: 16px;
  width: 340px;
  max-width: calc(100vw - 32px);
  background: var(--panel-2);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  z-index: 100;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
  animation: slideInLeft 0.5s var(--ease);
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.side-panel::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: var(--radius-xl);
  box-shadow: var(--glow);
  pointer-events: none;
  opacity: 0.5;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.brand-icon {
  font-size: 22px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.brand-text {
  min-width: 0;
}

.brand-title {
  color: var(--text);
  font-weight: 700;
  letter-spacing: 0.2px;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-subtitle {
  color: var(--muted);
  font-size: 12px;
  margin-top: 2px;
}

.back-btn {
  display: flex;
  align-items: center;
  background: rgba(8, 24, 36, 0.6);
  color: var(--text);
  border: 1px solid rgba(32, 214, 255, 0.28);
  padding: 8px 12px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  transition: transform 180ms var(--ease), box-shadow 180ms var(--ease), border-color 180ms var(--ease),
    background 180ms var(--ease);
  box-shadow: 0 0 0 1px rgba(32, 214, 255, 0.08) inset;
  flex: 0 0 auto;
}

.back-btn:hover {
  background: rgba(8, 24, 36, 0.8);
  transform: translateY(-2px);
  border-color: rgba(32, 214, 255, 0.42);
  box-shadow: 0 0 0 1px rgba(32, 214, 255, 0.14) inset, 0 14px 40px rgba(0, 0, 0, 0.35);
}

.btn-icon {
  margin-right: 6px;
  font-size: 16px;
}

.upload-section {
  margin-top: 14px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
}

.upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 14, 22, 0.35);
  border: 2px dashed rgba(32, 214, 255, 0.55);
  border-radius: var(--radius-lg);
  padding: 12px 20px;
  cursor: pointer;
  transition: transform 180ms var(--ease), background 180ms var(--ease), border-color 180ms var(--ease);
  gap: 10px;
}

.upload-area:hover {
  border-color: rgba(0, 255, 168, 0.75);
  background: rgba(6, 16, 26, 0.52);
  transform: translateY(-1px);
}

.upload-icon {
  font-size: 18px;
  color: rgba(160, 220, 240, 0.85);
}

.upload-area span {
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
}

.file-info {
  display: flex;
  align-items: center;
  background: rgba(6, 14, 22, 0.45);
  border-radius: var(--radius-md);
  padding: 12px;
  margin-top: 10px;
  border: 1px solid rgba(32, 214, 255, 0.14);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
  animation: slideIn 0.3s ease-in-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.file-icon {
  font-size: 20px;
  margin-right: 12px;
  color: var(--brand);
}

.file-details {
  flex: 1;
  text-align: left;
}

.file-name {
  margin: 0 0 3px 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.remove-file {
  background: rgba(255, 77, 79, 0.12);
  color: var(--text);
  border: 1px solid rgba(255, 77, 79, 0.35);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.3s;
}

.remove-file:hover {
  background: rgba(255, 77, 79, 0.22);
}

.location-section {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  position: relative;
  z-index: 1;
}

.location-select-btn,
.confirm-btn,
.clear-btn {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: transform 180ms var(--ease), box-shadow 180ms var(--ease), border-color 180ms var(--ease),
    background 180ms var(--ease), opacity 180ms var(--ease);
  border: 1px solid rgba(32, 214, 255, 0.25);
  background: rgba(8, 20, 30, 0.55);
  color: var(--text);
  box-shadow: 0 0 0 1px rgba(32, 214, 255, 0.08) inset;
}

.location-select-btn {
  border-color: rgba(0, 255, 168, 0.55);
}

.location-select-btn:hover:not(:disabled) {
  background: rgba(8, 24, 36, 0.75);
  transform: translateY(-2px);
  box-shadow: 0 0 0 1px rgba(0, 255, 168, 0.18) inset, 0 16px 40px rgba(0, 0, 0, 0.35);
}

.location-select-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.confirm-btn {
  border-color: rgba(32, 214, 255, 0.65);
  background: linear-gradient(180deg, rgba(32, 214, 255, 0.22), rgba(32, 214, 255, 0.12));
  box-shadow: 0 0 0 1px rgba(32, 214, 255, 0.22) inset, 0 0 30px rgba(32, 214, 255, 0.18);
}

.confirm-btn:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(0, 255, 168, 0.18), rgba(32, 214, 255, 0.10));
  transform: translateY(-2px);
  box-shadow: 0 0 0 1px rgba(32, 214, 255, 0.25) inset, 0 0 44px rgba(0, 255, 168, 0.16);
}

.confirm-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.clear-btn {
  border-color: rgba(255, 176, 32, 0.45);
}

.clear-btn:hover:not(:disabled) {
  background: rgba(8, 24, 36, 0.75);
  transform: translateY(-2px);
  box-shadow: 0 0 0 1px rgba(255, 176, 32, 0.16) inset, 0 16px 40px rgba(0, 0, 0, 0.35);
}

.clear-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.status-section {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  padding-top: 15px;
  border-top: 1px solid rgba(160, 220, 240, 0.14);
  position: relative;
  z-index: 1;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.status-label {
  color: var(--muted);
  font-weight: 500;
}

.status-value {
  color: var(--text);
  font-weight: 600;
}

.status-loaded {
  color: var(--brand-2) !important;
}

.status-loading {
  color: var(--warning) !important;
}

.panel-footer {
  margin-top: auto;
  padding-top: 14px;
  position: relative;
  z-index: 1;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid rgba(32, 214, 255, 0.22);
  background: rgba(6, 14, 22, 0.32);
  color: var(--muted);
  font-size: 12px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(160, 220, 240, 0.28);
  box-shadow: 0 0 16px rgba(160, 220, 240, 0.12);
}

.dot.ok {
  background: rgba(0, 255, 168, 0.72);
  box-shadow: 0 0 18px rgba(0, 255, 168, 0.22);
}

.dot.warn {
  background: rgba(255, 176, 32, 0.75);
  box-shadow: 0 0 18px rgba(255, 176, 32, 0.20);
}

.map-container {
  width: 100%;
  height: 100%;
}

.location-btn {
  position: absolute;
  bottom: 30px;
  right: 30px;
  width: 55px;
  height: 55px;
  background: rgba(6, 14, 22, 0.7);
  border: 1px solid rgba(32, 214, 255, 0.45);
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(32, 214, 255, 0.10) inset, 0 18px 50px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--brand);
  transition: transform 180ms var(--ease), box-shadow 180ms var(--ease), border-color 180ms var(--ease),
    background 180ms var(--ease), opacity 180ms var(--ease);
  animation: fadeIn 0.5s var(--ease);
}

.location-btn:hover:not(:disabled) {
  background: rgba(6, 16, 26, 0.82);
  transform: translateY(-3px);
  border-color: rgba(0, 255, 168, 0.6);
  box-shadow: 0 0 0 1px rgba(0, 255, 168, 0.14) inset, 0 22px 60px rgba(0, 0, 0, 0.38);
}

.location-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.selecting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  animation: fadeIn 0.3s ease-in-out;
}

.selecting-hint {
  background: rgba(6, 14, 22, 0.82);
  padding: 30px;
  border-radius: var(--radius-xl);
  text-align: center;
  border: 1px solid rgba(32, 214, 255, 0.18);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
  pointer-events: auto;
  animation: scaleIn 0.3s ease-in-out;
  min-width: 250px;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.hint-icon {
  font-size: 48px;
  margin-bottom: 15px;
  animation: pulse 2s infinite;
}

.selecting-hint p {
  margin: 0;
  font-size: 16px;
  color: var(--text);
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .side-panel {
    width: 300px;
  }
  
  .brand-title {
    font-size: 15px;
  }
  
  .location-section {
    flex-direction: column;
  }
  
  .location-select-btn,
  .confirm-btn,
  .clear-btn {
    width: 100%;
    justify-content: center;
  }
  
  .status-section {
    flex-direction: column;
    gap: 8px;
  }
  
  .status-item {
    justify-content: space-between;
  }
}
</style>