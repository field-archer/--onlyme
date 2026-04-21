interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  /** 可选：未配置时须登录后使用 GET /api/geo/map-config */
  readonly VITE_AMAP_KEY?: string
  readonly VITE_AMAP_SECURITY_CODE?: string
  /** 后端 API 根路径，如 http://localhost:8000/api */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}