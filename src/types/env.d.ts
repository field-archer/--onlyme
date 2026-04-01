interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_AMAP_KEY: string
  readonly VITE_AMAP_SECURITY_CODE: string
  /** 后端 API 根路径，如 http://localhost:8000/api */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}