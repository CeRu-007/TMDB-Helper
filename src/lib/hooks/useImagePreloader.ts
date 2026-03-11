/**
 * 图片预加载 Hook
 * 使用新的图片缓存服务（数据库缓存层）
 */

import { useEffect } from 'react';
import { preloadImage } from '@/lib/media/image-cache-service';

interface UseImagePreloaderOptions {
  urls: string[];
  priority?: number; // 优先级，数字越小优先级越高
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * 图片预加载 Hook
 * 预加载指定 URL 列表中的图片
 *
 * @example
 * useImagePreloader({
 *   urls: ['https://image.tmdb.org/...', 'https://image.tmdb.org/...'],
 *   priority: 1,
 *   onProgress: (loaded, total) => console.log(`${loaded}/${total}`)
 * })
 */
export function useImagePreloader({ urls, priority = 1, onProgress }: UseImagePreloaderOptions) {
  useEffect(() => {
    if (!urls.length) return;

    let loaded = 0;
    const total = urls.length;

    const preloadImages = async () => {
      // 根据优先级延迟执行
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

/**
 * 批量预加载工具函数
 * @param urls 图片 URL 列表
 * @returns 成功加载的数量
 */
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

/**
 * 获取页面中所有图片URL（用于预加载）
 */
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
