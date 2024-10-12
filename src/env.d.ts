/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly CLOUDINARY_URL: string;
  readonly PUBLIC_CLOUDINARY_CLOUD_NAME: string;
  readonly CLOUDINARY_API_SECRET: string;
  readonly NETLIFY_BUILD_TIME: string;
  readonly RAINDROP_MULTIPLE_ENDPOINT: string;
  readonly RAINDROP_SINGLE_ENDPOINT: string;
  readonly RAINDROP_TOKEN: string;
  readonly RAINDROP_MOODBOARD_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
