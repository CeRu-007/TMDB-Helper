/**
 * Media 模块导出
 * 包含图片缓存、预加载和处理相关功能
 */

// 图片缓存服务
export {
  getCachedImageUrl,
  batchCacheImages,
  refreshImageCache,
  invalidateCache,
  buildTMDBImageUrl,
  cacheImagesFromItem,
  preloadImage,
  preloadImages,
  type CacheImageOptions,
  type CacheImageResult,
} from './image-cache-service';

// React Hooks
export { useImageCache, useBatchImageCache } from './hooks/use-image-cache';

// 其他媒体服务
export { imagePreloaderService } from './image-preloader-service';
export { ImageProcessor } from './image-processor-class';
