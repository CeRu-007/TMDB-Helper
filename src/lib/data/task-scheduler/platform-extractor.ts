/**
 * PlatformExtractor
 * 负责从播出平台抓取剧集数据
 */

import { TMDBItem } from '../storage';

export interface PlatformExtractionResult {
  success: boolean;
  csvPath?: string;
  error?: string;
}

export interface PlatformExtractionOptions {
  platformUrl: string;
  seasonNumber: number;
  itemId: string;
}

/**
 * 平台数据提取器
 * 从指定的播出平台抓取剧集数据并生成CSV文件
 */
export class PlatformExtractor {
  /**
   * 执行平台数据提取
   */
  public async extractPlatformData(
    options: PlatformExtractionOptions,
  ): Promise<PlatformExtractionResult> {
    try {
      const response = await fetch('/api/tasks/execute-platform-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = {};
        }
        throw new Error(
          `API请求失败 (${response.status}): ${errorData.error || response.statusText}`,
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '播出平台抓取失败');
      }

      return {
        success: true,
        csvPath: result.csvPath,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 验证平台URL
   */
  public validatePlatformUrl(url: string): boolean {
    if (!url) {
      return false;
    }

    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 从TMDBItem中提取平台提取选项
   */
  public extractOptionsFromItem(
    item: TMDBItem,
    seasonNumber: number,
  ): PlatformExtractionOptions {
    return {
      platformUrl: item.platformUrl || '',
      seasonNumber: seasonNumber,
      itemId: item.id,
    };
  }
}