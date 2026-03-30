<template>
  <div class="home">
    <div class="map-header">
      <div class="header-top">
        <div class="logo">
          <div class="logo-icon">🔥</div>
          <h1>森林火灾检测系统</h1>
        </div>
        <button class="back-btn" @click="goToMain">
          <span class="btn-icon">🏠</span>
          返回主页
        </button>
      </div>
      <p class="subtitle">实时地图监控与定位</p>
      <div class="upload-section">
        <div class="upload-area" @click="triggerFileUpload">
          <div class="upload-icon">📁</div>
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
          <div class="file-icon">📄</div>
          <div class="file-details">
            <p class="file-name">{{ selectedFile.name }}</p>
            <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
          <button class="remove-file" @click="removeFile">×</button>
        </div>
      </div>
      <div class="location-section">
        <button class="location-select-btn" @click="enableLocationSelect" :disabled="!isMapLoaded">
          <span class="btn-icon">📍</span>
          选择地点
        </button>
        <button class="confirm-btn" @click="confirmFireLocation" :disabled="!selectedLocation">
          <span class="btn-icon">✅</span>
          确认火灾位置
        </button>
        <button class="clear-btn" @click="clearFireMarkers" :disabled="markers.length === 0">
          <span class="btn-icon">🗑️</span>
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
    </div>
    <div ref="mapContainer" class="map-container"></div>
    <button class="location-btn" @click="locateMe" :disabled="!isMapLoaded">
      <span class="btn-icon">📍</span>
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
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.map-header {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 320px;
  max-width: 400px;
  animation: slideInLeft 0.5s ease-in-out;
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

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.logo {
  display: flex;
  align-items: center;
}

.logo-icon {
  font-size: 24px;
  margin-right: 10px;
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

.map-header h1 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
  font-weight: 600;
}

.subtitle {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #7f8c8d;
  line-height: 1.4;
}

.back-btn {
  display: flex;
  align-items: center;
  background: #34495e;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(52, 73, 94, 0.3);
}

.back-btn:hover {
  background: #2c3e50;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 73, 94, 0.4);
}

.btn-icon {
  margin-right: 6px;
  font-size: 16px;
}

.upload-section {
  margin-bottom: 20px;
}

.upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border: 2px dashed #bdc3c7;
  border-radius: 8px;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  gap: 10px;
}

.upload-area:hover {
  border-color: #3498db;
  background: #f0f8ff;
}

.upload-icon {
  font-size: 18px;
  color: #95a5a6;
}

.upload-area span {
  color: #555;
  font-size: 14px;
  font-weight: 500;
}

.file-info {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-top: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  color: #3498db;
}

.file-details {
  flex: 1;
  text-align: left;
}

.file-name {
  margin: 0 0 3px 0;
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  margin: 0;
  font-size: 11px;
  color: #7f8c8d;
}

.remove-file {
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.3s;
}

.remove-file:hover {
  background: #c0392b;
}

.location-section {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.location-select-btn,
.confirm-btn,
.clear-btn {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.location-select-btn {
  background: #27ae60;
  color: white;
  box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3);
}

.location-select-btn:hover:not(:disabled) {
  background: #229954;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
}

.location-select-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  box-shadow: none;
}

.confirm-btn {
  background: #e74c3c;
  color: white;
  box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
}

.confirm-btn:hover:not(:disabled) {
  background: #c0392b;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

.confirm-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  box-shadow: none;
}

.clear-btn {
  background: #f39c12;
  color: white;
  box-shadow: 0 2px 8px rgba(243, 156, 18, 0.3);
}

.clear-btn:hover:not(:disabled) {
  background: #e67e22;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(243, 156, 18, 0.4);
}

.clear-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  box-shadow: none;
}

.status-section {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  padding-top: 15px;
  border-top: 1px solid #ecf0f1;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.status-label {
  color: #7f8c8d;
  font-weight: 500;
}

.status-value {
  color: #2c3e50;
  font-weight: 600;
}

.status-loaded {
  color: #27ae60 !important;
}

.status-loading {
  color: #f39c12 !important;
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
  background: white;
  border: none;
  border-radius: 50%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #1e88e5;
  transition: all 0.3s ease;
  animation: fadeIn 0.5s ease-in-out;
}

.location-btn:hover:not(:disabled) {
  background: #f8f9fa;
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.location-btn:disabled {
  background: #e0e0e0;
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
  background: rgba(255, 255, 255, 0.95);
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
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
  color: #2c3e50;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .map-header {
    min-width: 280px;
    padding: 15px;
  }
  
  .logo h1 {
    font-size: 18px;
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