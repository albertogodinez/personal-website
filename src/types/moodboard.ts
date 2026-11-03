export type ContentType = 'image' | 'gif' | 'video' | 'link' | 'markdown';

export interface MoodboardItem {
  id: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  contentType: ContentType;
  mediaUrl: string;
  youtubeId?: string;
  sourceMetadata: {
    originalUrl: string;
    sourceDomain: string;
    sourcePlatform: 'raindrop' | 'arena';
  };
}

export interface MoodboardManifest {
  items: MoodboardItem[];
  lastSync: string;
}
