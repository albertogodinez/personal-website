/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly CLOUDINARY_URL: string;
  readonly PUBLIC_CLOUDINARY_CLOUD_NAME: string;
  readonly CLOUDINARY_API_SECRET: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
