/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_PRODUCTION_BACKEND?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
