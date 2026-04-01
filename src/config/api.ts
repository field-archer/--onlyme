/** 与《前端对接-用户与火点标记.md》一致，可用 VITE_API_BASE_URL 覆盖 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8000/api';
