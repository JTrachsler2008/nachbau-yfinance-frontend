/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Basis-URL des Backends. Ohne Angabe wird `/api` verwendet, was der Vite-Dev-Server auf
   * `http://localhost:8080` weiterleitet. Für einen Deploy auf eine andere Herkunft hier die
   * vollständige Backend-URL setzen (dann braucht das Backend CORS oder einen Reverse Proxy).
   */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
