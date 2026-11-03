import type { ContentType, MoodboardItem } from '../../types/moodboard';
import raindropData from '../../content/moodboard/raindrop-collection.json';

const EXPIRED_MEDIA_HOSTS = ['cdninstagram.com'];

const YOUTUBE_ID_PATTERNS = [
  /[?&]v=([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/,
  /\/embed\/([\w-]{11})/,
  /\/shorts\/([\w-]{11})/,
];

function hasExpiredMedia(cover: string): boolean {
  return EXPIRED_MEDIA_HOSTS.some((host) => cover.includes(host));
}

function extractYoutubeId(link: string): string | undefined {
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = link.match(pattern);
    if (match) return match[1];
  }
  return undefined;
}

function inferContentType(
  raindropType: string,
  cover: string,
  link: string,
  youtubeId: string | undefined
): ContentType {
  if (youtubeId || raindropType === 'video') return 'video';
  if (/\.gif(\?|$)/i.test(cover) || /\.gif(\?|$)/i.test(link)) return 'gif';
  if (raindropType === 'link' || raindropType === 'article') return 'link';
  return 'image';
}

function youtubeThumbnail(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function getMoodboardItems(): MoodboardItem[] {
  return (raindropData as any[])
    .filter((item) => item.cover && !hasExpiredMedia(item.cover))
    .map((item) => {
      const link = item.link ?? '';
      const youtubeId = extractYoutubeId(link);
      const contentType = inferContentType(item.type, item.cover, link, youtubeId);

      return {
        id: `raindrop:${item._id}`,
        title: item.title || 'Untitled',
        description: item.excerpt || '',
        date: item.created,
        tags: item.tags ?? [],
        contentType,
        mediaUrl: youtubeId ? youtubeThumbnail(youtubeId) : item.cover,
        youtubeId,
        sourceMetadata: {
          originalUrl: link,
          sourceDomain: item.domain ?? '',
          sourcePlatform: 'raindrop' as const,
        },
      };
    });
}
