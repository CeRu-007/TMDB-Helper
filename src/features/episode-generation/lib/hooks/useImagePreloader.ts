/**
 * 图片预加载 Hook（剧集生成模块专用）
 * 使用新的图片缓存服务（数据库缓存层）
 */

import { useEffect } from 'react';
import { preloadImage } from '@/lib/media/image-cache-service';

interface UseImagePreloaderOptions {
  urls: string[];
  priority?: number;
  onProgress?: (loaded: number, total: number) => void;
}

export function useImagePreloader({ urls, priority = 1, onProgress }: UseImagePreloaderOptions) {
  useEffect(() => {
    if (!urls.length) return;

    let loaded = 0;
    const total = urls.length;

    const preloadImages = async () => {
      const delay = (priority - 1) * 1000;

      setTimeout(async () => {
        for (const url of urls) {
          try {
            await preloadImage(url);
            loaded++;
            onProgress?.(loaded, total);
          } catch {
            loaded++;
            onProgress?.(loaded, total);
          }
        }
      }, delay);
    };

    preloadImages();
  }, [urls, priority, onProgress]);
}

export async function preloadImages(urls: string[]): Promise<number> {
  let successCount = 0;

  for (const url of urls) {
    const success = await preloadImage(url);
    if (success) {
      successCount++;
    }
  }

  return successCount;
}

export function getImageUrlsFromPage(): string[] {
  if (typeof window === 'undefined') return [];

  const images: string[] = [];
  const imgElements = document.querySelectorAll('img');

  imgElements.forEach((img) => {
    const src = img.src;
    if (src && !src.startsWith('data:') && !images.includes(src)) {
      images.push(src);
    }
  });

  return images;
}
