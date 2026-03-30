<template>
  <div class="main">
    <div class="main-container">
      <div class="header">
        <div class="logo">
          <div class="logo-icon">🔥</div>
          <h1>森林火灾检测系统</h1>
        </div>
        <p class="subtitle">利用AI技术实时检测森林火灾，保护生态环境</p>
      </div>
      
      <div class="upload-section">
        <div class="upload-area" @click="triggerFileUpload">
          <div class="upload-icon">📁</div>
          <div class="upload-text">
            <p>点击上传图片或视频</p>
            <p class="upload-hint">支持JPG、PNG、MP4等格式</p>
          </div>
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
      
      <div class="button-section">
        <button class="detect-btn" @click="detectFire" :disabled="!selectedFile">
          <span class="btn-icon">🔍</span>
          开始检测
        </button>
        <button class="map-btn" @click="goToMap">
          <span class="btn-icon">🗺️</span>
          直接进入地图
        </button>
      </div>
      
      <div v-if="isDetecting" class="loading">
        <div class="loading-spinner"></div>
        <p>正在检测中...</p>
      </div>
      
      <div v-if="detectionResult" class="result">
        <div v-if="detectionResult.code === 20000 && detectionResult.data" class="result-success">
          <div class="result-icon" :class="detectionResult.data.fire_probability > 0.5 ? 'fire-icon' : 'no-fire-icon'">
            {{ detectionResult.data.fire_probability > 0.5 ? '🔥' : '✅' }}
          </div>
          <h3>检测结果：{{ detectionResult.data.fire_probability > 0.5 ? '发现火灾' : '未发现火灾' }}</h3>
          <div class="result-details">
            <div class="detail-item">
              <span class="detail-label">火灾概率:</span>
              <span class="detail-value">{{ (detectionResult.data.fire_probability * 100).toFixed(1) }}%</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">风险等级:</span>
              <span class="detail-value" :class="'risk-' + detectionResult.data.risk_level">
                {{ detectionResult.data.risk_level === 'high' ? '高' : detectionResult.data.risk_level === 'medium' ? '中' : '低' }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">火焰数量:</span>
              <span class="detail-value">{{ detectionResult.data.fire_count }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">平均置信度:</span>
              <span class="detail-value">{{ (detectionResult.data.average_confidence * 100).toFixed(1) }}%</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">检测到的目标:</span>
              <span class="detail-value">{{ detectionResult.data.detections.length }}</span>
            </div>
          </div>
          <div v-if="outputFileUrl" class="output-file">
            <h4>分析结果:</h4>
            <div v-if="outputFileUrl.includes('.mp4') || outputFileUrl.includes('.avi') || outputFileUrl.includes('.mov')" class="video-container">
              <video controls :src="outputFileUrl" class="output-video"></video>
            </div>
            <div v-else class="image-container">
              <img :src="outputFileUrl" class="output-image" alt="分析结果">
            </div>
          </div>
          <div class="result-actions">
            <button class="map-btn" @click="goToMap">
              <span class="btn-icon">🗺️</span>
              查看地图
            </button>
            <button class="retry-btn" @click="resetDetection">
              重新检测
            </button>
          </div>
        </div>
        <div v-else class="result-error">
          <div class="result-icon">❌</div>
          <h3>检测失败</h3>
          <p>{{ detectionResult.message }}</p>
          <button class="retry-btn" @click="resetDetection">
            重新检测
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

// 路由实例
const router = useRouter();
// 文件输入引用
const fileInput = ref<HTMLInputElement | null>(null);
// 选中的文件
const selectedFile = ref<File | null>(null);
// 是否正在检测
const isDetecting = ref(false);


// 触发文件上传
const triggerFileUpload = () => {
  fileInput.value?.click();
};

// 处理文件上传
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
    detectionResult.value = null;
  }
};

// 后端API地址
const API_BASE_URL = 'http://localhost:8000/api';

// 检测结果类型
type DetectionResult = {
  code: number;
  message: string;
  data: {
    image_info?: {
      width: number;
      height: number;
      channels: number;
    };
    video_info?: {
      file_size: number;
      duration: number;
      fps: number;
      total_frames: number;
      width: number;
      height: number;
    };
    detections: Array<{
      class: string;
      confidence: number;
      bbox: [number, number, number, number];
      time?: string;
    }>;
    fire_probability: number;
    risk_level: string;
    output_image_path?: string;
    output_video_path?: string;
    fire_count: number;
    average_confidence: number;
    file_url: string;
    file_base64: string;
    file_type: string;
  } | null;
};

// 检测结果
const detectionResult = ref<DetectionResult | null>(null);
// 分析后的文件URL
const outputFileUrl = ref<string | null>(null);

// 上传文件到后端进行检测
const detectFire = async () => {
  if (!selectedFile.value) return;
  
  isDetecting.value = true;
  
  try {
    const formData = new FormData();
    formData.append('file', selectedFile.value);
    
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      body: formData
    });
    
    const result: DetectionResult = await response.json();
    detectionResult.value = result;
    
    // 处理分析结果
    if (result.code === 20000 && result.data) {
      // 使用base64编码显示处理后的文件
      outputFileUrl.value = `data:${result.data.file_type};base64,${result.data.file_base64}`;
    }
  } catch (error) {
    console.error('检测失败:', error);
    detectionResult.value = {
      code: 50000,
      message: '检测失败，请稍后重试',
      data: null
    };
  } finally {
    isDetecting.value = false;
  }
};

// 跳转到地图页面
const goToMap = () => {
  router.push('/map');
};

// 重置检测状态
const resetDetection = () => {
  detectionResult.value = null;
  outputFileUrl.value = null;
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
  detectionResult.value = null;
};
</script>

<style scoped>
.main {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #2c3e50 0%, #4a6b8a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.main-container {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  text-align: center;
  max-width: 550px;
  width: 90%;
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header {
  margin-bottom: 30px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
}

.logo-icon {
  font-size: 32px;
  margin-right: 15px;
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

.logo h1 {
  color: #2c3e50;
  margin: 0;
  font-size: 28px;
  font-weight: 600;
}

.subtitle {
  color: #7f8c8d;
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
}

.upload-section {
  margin-bottom: 30px;
}

.upload-area {
  border: 2px dashed #bdc3c7;
  border-radius: 12px;
  padding: 40px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f9f9f9;
}

.upload-area:hover {
  border-color: #3498db;
  background: #f0f8ff;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 20px;
  color: #95a5a6;
}

.upload-text p {
  margin: 5px 0;
  color: #555;
  font-size: 16px;
}

.upload-hint {
  font-size: 14px !important;
  color: #95a5a6 !important;
}

.file-info {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  margin-top: 15px;
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
  font-size: 24px;
  margin-right: 15px;
  color: #3498db;
}

.file-details {
  flex: 1;
  text-align: left;
}

.file-name {
  margin: 0 0 5px 0;
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  margin: 0;
  font-size: 12px;
  color: #7f8c8d;
}

.remove-file {
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.3s;
}

.remove-file:hover {
  background: #c0392b;
}

.button-section {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.detect-btn,
.map-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 150px;
}

.btn-icon {
  margin-right: 8px;
  font-size: 18px;
}

.detect-btn {
  background: #e74c3c;
  color: white;
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

.detect-btn:hover:not(:disabled) {
  background: #c0392b;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(231, 76, 60, 0.4);
}

.detect-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  box-shadow: none;
}

.map-btn {
  background: #27ae60;
  color: white;
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
}

.map-btn:hover {
  background: #229954;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(39, 174, 96, 0.4);
}

.loading {
  margin-top: 30px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading p {
  color: #555;
  font-size: 16px;
  margin: 0;
}

.result {
  margin-top: 30px;
  padding: 30px;
  border-radius: 12px;
  animation: fadeIn 0.5s ease-in-out;
}

.result-fire {
  background: linear-gradient(135deg, rgba(255, 69, 0, 0.1), rgba(255, 140, 0, 0.1));
  border: 1px solid rgba(255, 69, 0, 0.3);
}

.result-no-fire {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(102, 187, 106, 0.1));
  border: 1px solid rgba(76, 175, 80, 0.3);
}

.result-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.result h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 20px;
}

.result p {
  margin: 0 0 20px 0;
  color: #555;
  font-size: 16px;
}

.result-progress {
  width: 100%;
  height: 8px;
  background: #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  width: 0;
  height: 100%;
  background: #e74c3c;
  border-radius: 4px;
  animation: progress 2s ease-in-out forwards;
}

@keyframes progress {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}

.retry-btn {
  margin-top: 20px;
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
}

.retry-btn:hover {
  background: #2980b9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
}

.result-success {
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.1), rgba(41, 128, 185, 0.1));
  border: 1px solid rgba(52, 152, 219, 0.3);
  padding: 30px;
  border-radius: 12px;
  animation: fadeIn 0.5s ease-in-out;
}

.result-error {
  background: linear-gradient(135deg, rgba(231, 76, 60, 0.1), rgba(192, 57, 43, 0.1));
  border: 1px solid rgba(231, 76, 60, 0.3);
  padding: 30px;
  border-radius: 12px;
  animation: fadeIn 0.5s ease-in-out;
}

.fire-icon {
  color: #e74c3c;
  animation: pulse 2s infinite;
}

.no-fire-icon {
  color: #27ae60;
}

.result-details {
  margin: 20px 0;
  background: rgba(255, 255, 255, 0.8);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ecf0f1;
}

.detail-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.detail-label {
  color: #7f8c8d;
  font-weight: 500;
}

.detail-value {
  color: #2c3e50;
  font-weight: 600;
}

.risk-high {
  color: #e74c3c !important;
  font-weight: 700;
}

.risk-medium {
  color: #f39c12 !important;
  font-weight: 700;
}

.risk-low {
  color: #27ae60 !important;
  font-weight: 700;
}

.output-file {
  margin: 20px 0;
}

.output-file h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 16px;
}

.video-container,
.image-container {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.output-video,
.output-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
}

.result-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
  flex-wrap: wrap;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .main-container {
    padding: 30px 20px;
  }
  
  .logo h1 {
    font-size: 24px;
  }
  
  .upload-area {
    padding: 30px 15px;
  }
  
  .button-section {
    flex-direction: column;
    align-items: center;
  }
  
  .detect-btn,
  .map-btn {
    width: 100%;
    max-width: 250px;
  }
}
</style>