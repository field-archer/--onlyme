import { ApiError } from '../api/client';

/** 高德/第三方配置类错误（如 50002、Key 类型错误），用于在 UI 上提示用户 */
export function notifyGeoServiceError(e: unknown) {
  if (e instanceof ApiError && e.code === 50002) {
    window.dispatchEvent(
      new CustomEvent('forestfire-geo-service', {
        bubbles: true,
        detail: { message: e.message || '地图或地理服务配置异常，请联系运维检查服务端高德 Key。' }
      })
    );
  }
}
