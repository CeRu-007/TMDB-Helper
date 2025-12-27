/**
 * 音频转写工具类
 * 提供视频下载、音频提取、语音识别等功能
 */

export interface VideoAnalysisOptions {
  apiKey: string;
  maxDuration?: number; // 最大视频时长（秒）
  maxFrames?: number; // 最大提取帧数
  frameInterval?: number; // 帧提取间隔（秒）
  speechRecognitionModel?: string; // 语音识别模型
}

export interface VideoFrame {
  timestamp: number;
  description: string;
  confidence: number;
  imageUrl?: string;
}

export interface AudioSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

export interface VideoAnalysisResult {
  videoInfo: {
    title: string;
    duration: number;
    url: string;
  };
  audioAnalysis: {
    transcript: string;
    segments: AudioSegment[];
    summary: string;
  };
  structuredContent: {
    markdown: string;
    srt: string;
    text: string;
  };
}

export class VideoAnalyzer {
  private apiKey: string;
  private options: VideoAnalysisOptions;

  constructor(apiKey: string, options: Partial<VideoAnalysisOptions> = {}) {
    this.apiKey = apiKey;
    this.options = {
      maxDuration: 3600, // 1小时
      maxFrames: 20,
      frameInterval: 30,
      ...options
    };
  }

  /**
   * 分析视频URL
   */
  async analyzeVideo(videoUrl: string): Promise<VideoAnalysisResult> {
    try {
      const response = await fetch('/api/media/video-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          apiKey: this.apiKey,
          speechRecognitionModel: this.options.speechRecognitionModel,
          options: this.options
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '音频转写失败');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '音频转写失败');
      }

      return result.data;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * 验证视频URL是否支持
   */
  static validateVideoUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);

      // 只支持HTTP和HTTPS协议
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // 支持的视频平台域名
      const supportedDomains = [
        'youtube.com', 'youtu.be', 'www.youtube.com',
        'bilibili.com', 'www.bilibili.com', 'b23.tv',
        'vimeo.com', 'www.vimeo.com',
        'dailymotion.com', 'www.dailymotion.com'
      ];

      // 支持的视频文件扩展名
      const supportedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v'];

      // 检查是否为支持的平台
      const isPlatformSupported = supportedDomains.some(domain =>
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );

      // 检查是否为媒体服务器URL（优先级高于直链检查）
      const isMediaServerUrl = this.isMediaServerUrl(urlObj);

      // 检查是否为媒体服务器路径（即使没有认证参数）
      const isMediaServerPath = this.isMediaServerPath(urlObj);

      // 检查是否为直链视频文件（仅当不是媒体服务器路径时）
      const isDirectVideoLink = !isMediaServerPath && supportedExtensions.some(ext =>
        urlObj.pathname.toLowerCase().includes(ext)
      );

      return isPlatformSupported || isDirectVideoLink || isMediaServerUrl;
    } catch {
      return false;
    }
  }

  /**
   * 检查是否为媒体服务器URL
   */
  private static isMediaServerUrl(urlObj: URL): boolean {
    const path = urlObj.pathname.toLowerCase();
    const searchParams = urlObj.searchParams;

    // Emby服务器特征
    if (path.includes('/emby/') && path.includes('/stream')) {
      return searchParams.has('api_key') || searchParams.has('ApiKey');
    }

    // Jellyfin服务器特征
    if (path.includes('/jellyfin/') && path.includes('/stream')) {
      return searchParams.has('api_key') || searchParams.has('ApiKey');
    }

    // Plex服务器特征
    if (path.includes('/library/') && path.includes('/parts/')) {
      return searchParams.has('X-Plex-Token');
    }

    // 通用媒体服务器特征：包含stream关键字且有认证参数
    if (path.includes('stream')) {
      return searchParams.has('api_key') ||
             searchParams.has('ApiKey') ||
             searchParams.has('token') ||
             searchParams.has('X-Plex-Token');
    }

    // 检查是否为常见的媒体服务器端口和路径模式（需要有认证参数）
    const commonMediaServerPorts = ['8096', '8920', '32400', '8080', '9096'];
    const isCommonPort = commonMediaServerPorts.includes(urlObj.port);
    const hasMediaPath = /\/(videos?|media|stream|download)\//.test(path);
    const hasAuthParam = searchParams.has('api_key') ||
                        searchParams.has('ApiKey') ||
                        searchParams.has('token') ||
                        searchParams.has('X-Plex-Token');

    return isCommonPort && hasMediaPath && hasAuthParam;
  }

  /**
   * 检查是否为媒体服务器路径（不要求认证参数）
   */
  private static isMediaServerPath(urlObj: URL): boolean {
    const path = urlObj.pathname.toLowerCase();

    // Emby/Jellyfin服务器路径特征
    if ((path.includes('/emby/') || path.includes('/jellyfin/')) && path.includes('/stream')) {
      return true;
    }

    // Plex服务器路径特征
    if (path.includes('/library/') && path.includes('/parts/')) {
      return true;
    }

    return false;
  }

  /**
   * 获取支持的视频平台列表
   */
  static getSupportedPlatforms(): Array<{name: string, domains: string[], example: string}> {
    return [
      {
        name: 'YouTube',
        domains: ['youtube.com', 'youtu.be'],
        example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      },
      {
        name: 'Bilibili',
        domains: ['bilibili.com', 'b23.tv'],
        example: 'https://www.bilibili.com/video/BV1xx411c7mu'
      },
      {
        name: 'Vimeo',
        domains: ['vimeo.com'],
        example: 'https://vimeo.com/123456789'
      },
      {
        name: 'Emby服务器',
        domains: ['任意域名:8096', '任意域名:9096'],
        example: 'http://server:8096/emby/videos/123/stream.mkv?api_key=xxx'
      },
      {
        name: 'Jellyfin服务器',
        domains: ['任意域名:8096', '任意域名:8920'],
        example: 'http://server:8096/jellyfin/videos/123/stream.mp4?api_key=xxx'
      },
      {
        name: 'Plex服务器',
        domains: ['任意域名:32400'],
        example: 'http://server:32400/library/parts/123/file.mp4?X-Plex-Token=xxx'
      },
      {
        name: '直链视频',
        domains: ['任意域名'],
        example: 'https://example.com/video.mp4'
      }
    ];
  }

  /**
   * 将音频转写结果转换为简介生成所需的格式
   */
  static convertToEpisodeContent(analysis: VideoAnalysisResult, format: 'markdown' | 'srt' | 'text' = 'text'): string {
    // 根据格式返回相应的结构化内容
    if (typeof analysis.structuredContent === 'object') {
      switch (format) {
        case 'markdown':
          return analysis.structuredContent.markdown || analysis.audioAnalysis.transcript;
        case 'srt':
          return analysis.structuredContent.srt || '';
        case 'text':
        default:
          return analysis.structuredContent.text || analysis.audioAnalysis.transcript;
      }
    }
    // 兼容旧格式
    return analysis.structuredContent || analysis.audioAnalysis.transcript;
  }

  /**
   * 估算分析时间
   */
  static estimateAnalysisTime(duration: number): number {
    // 基础时间：下载 + 处理
    const baseTime = 60; // 1分钟基础时间
    
    // 视频时长影响（每分钟视频增加10秒处理时间）
    const durationFactor = Math.min(duration / 60 * 10, 300); // 最多5分钟
    
    // AI分析时间（每帧2秒）
    const frameCount = Math.min(20, Math.floor(duration / 30));
    const aiTime = frameCount * 2;
    
    return Math.ceil(baseTime + durationFactor + aiTime);
  }

  /**
   * 格式化时间显示
   */
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * 检查API密钥是否配置
   */
  static checkApiKey(apiKey?: string): boolean {
    return !!(apiKey && apiKey.trim().length > 0);
  }
}

/**
 * 音频转写错误类
 */
export class VideoAnalysisError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VideoAnalysisError';
  }
}

/**
 * 常见错误代码
 */
export const VIDEO_ANALYSIS_ERRORS = {
  INVALID_URL: 'INVALID_URL',
  UNSUPPORTED_PLATFORM: 'UNSUPPORTED_PLATFORM',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  AI_ANALYSIS_FAILED: 'AI_ANALYSIS_FAILED',
  API_KEY_MISSING: 'API_KEY_MISSING',
  DURATION_TOO_LONG: 'DURATION_TOO_LONG',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

/**
 * 获取错误信息的用户友好描述
 */
export function getErrorMessage(error: VideoAnalysisError | Error): string {
  if (error instanceof VideoAnalysisError) {
    switch (error.code) {
      case VIDEO_ANALYSIS_ERRORS.INVALID_URL:
        return '视频链接格式不正确，请检查URL是否有效';
      case VIDEO_ANALYSIS_ERRORS.UNSUPPORTED_PLATFORM:
        return '暂不支持该视频平台，请使用YouTube、Bilibili等支持的平台';
      case VIDEO_ANALYSIS_ERRORS.DOWNLOAD_FAILED:
        return '视频下载失败，请检查链接是否可访问或稍后重试';
      case VIDEO_ANALYSIS_ERRORS.PROCESSING_FAILED:
        return '视频处理失败，可能是格式不支持或文件损坏';
      case VIDEO_ANALYSIS_ERRORS.AI_ANALYSIS_FAILED:
        return 'AI分析失败，请检查API密钥或稍后重试';
      case VIDEO_ANALYSIS_ERRORS.API_KEY_MISSING:
        return '请先配置硅基流动API密钥';
      case VIDEO_ANALYSIS_ERRORS.DURATION_TOO_LONG:
        return '视频时长超过限制，请使用较短的视频';
      case VIDEO_ANALYSIS_ERRORS.NETWORK_ERROR:
        return '网络连接失败，请检查网络连接后重试';
      default:
        return error.message;
    }
  }
  
  return error.message || '未知错误';
}
