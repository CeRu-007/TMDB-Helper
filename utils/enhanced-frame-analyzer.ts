/**
 * 增强型帧分析器
 * 集成多层级智能筛选策略，优化性能和准确率
 */

export interface FrameAnalysisScore {
  staticScore: number;
  subtitleScore: number;
  peopleScore: number;
  qualityScore: number;
  diversityScore: number;
  overallScore: number;
}

export interface EnhancedFrameAnalysis {
  index: number;
  scores: FrameAnalysisScore;
  features: {
    hasText: boolean;
    hasFaces: boolean;
    colorfulness: number;
    sharpness: number;
    brightness: number;
    contrast: number;
  };
  aiAnalyzed: boolean;
}

export class EnhancedFrameAnalyzer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frameCache: Map<string, EnhancedFrameAnalysis> = new Map();

  constructor() {
    // 延迟初始化Canvas，避免在服务端渲染时出错
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      const ctx = this.canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建Canvas上下文');
      }
      this.ctx = ctx;
    } else {
      // 服务端渲染时的占位符
      this.canvas = null as any;
      this.ctx = null as any;
    }
  }

  /**
   * 确保Canvas已初始化
   */
  private ensureCanvasInitialized(): void {
    if (!this.canvas && typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      const ctx = this.canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建Canvas上下文');
      }
      this.ctx = ctx;
    }
  }

  /**
   * 计算帧的哈希值用于缓存
   */
  private calculateFrameHash(imageData: ImageData): string {
    const { data, width, height } = imageData;
    let hash = '';
    const step = Math.floor(data.length / 100);
    
    for (let i = 0; i < data.length; i += step) {
      hash += data[i].toString(16);
    }
    
    return hash + `_${width}x${height}`;
  }

  /**
   * 第一层：快速像素分析预筛选
   */
  private quickPixelAnalysis(imageData: ImageData): {
    isBlank: boolean;
    hasMovement: boolean;
    basicQuality: number;
  } {
    const { data } = imageData;
    let totalBrightness = 0;
    let edgeCount = 0;
    
    const sampleStep = 4;
    let sampleCount = 0;
    
    for (let i = 0; i < data.length; i += sampleStep * 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      
      if (i + 4 < data.length) {
        const nextR = data[i + 4];
        const diff = Math.abs(r - nextR);
        if (diff > 30) edgeCount++;
      }
      
      sampleCount++;
    }
    
    const avgBrightness = totalBrightness / sampleCount;
    const edgeRatio = edgeCount / sampleCount;
    
    return {
      isBlank: avgBrightness < 10 || avgBrightness > 245,
      hasMovement: edgeRatio > 0.1,
      basicQuality: Math.min(1, edgeRatio * 2)
    };
  }

  /**
   * 检测文本区域
   */
  private detectTextRegions(imageData: ImageData): Array<{ confidence: number }> {
    const { data, width, height } = imageData;
    const regions: Array<{ confidence: number }> = [];
    
    // 检测底部区域（字幕常见位置）
    const bottomStart = Math.floor(height * 0.75);
    let textLikePixels = 0;
    let totalPixels = 0;
    
    for (let y = bottomStart; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // 检测高对比度像素（可能是文字）
        const brightness = (r + g + b) / 3;
        if (brightness > 200 || brightness < 50) {
          textLikePixels++;
        }
        totalPixels++;
      }
    }
    
    const textRatio = textLikePixels / totalPixels;
    if (textRatio > 0.1) {
      regions.push({ confidence: Math.min(1, textRatio * 2) });
    }
    
    return regions;
  }

  /**
   * 检测人脸区域
   */
  private detectFaceRegions(imageData: ImageData): Array<{ confidence: number }> {
    const { data, width, height } = imageData;
    const regions: Array<{ confidence: number }> = [];
    
    let skinPixels = 0;
    let totalPixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      if (this.isSkinColor(r, g, b)) {
        skinPixels++;
      }
      totalPixels++;
    }
    
    const skinRatio = skinPixels / totalPixels;
    if (skinRatio > 0.05) {
      regions.push({ confidence: Math.min(1, skinRatio * 5) });
    }
    
    return regions;
  }

  /**
   * 简化的肤色检测
   */
  private isSkinColor(r: number, g: number, b: number): boolean {
    return (r > 95 && g > 40 && b > 20 && 
            r > g && r > b && 
            r - Math.min(g, b) > 15 && 
            Math.abs(r - g) > 15);
  }

  /**
   * 计算图像清晰度
   */
  private calculateSharpness(imageData: ImageData): number {
    const { data, width, height } = imageData;
    let sharpness = 0;
    let count = 0;
    
    for (let y = 1; y < height - 1; y += 2) {
      for (let x = 1; x < width - 1; x += 2) {
        const idx = (y * width + x) * 4;
        const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        
        const grayLeft = 0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2];
        const grayRight = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
        
        const diff = Math.abs(grayRight - grayLeft);
        sharpness += diff;
        count++;
      }
    }
    
    return count > 0 ? (sharpness / count) / 255 : 0;
  }

  /**
   * 综合分析单帧
   */
  public async analyzeFrame(imageData: ImageData, index: number): Promise<EnhancedFrameAnalysis> {
    this.ensureCanvasInitialized();
    const frameHash = this.calculateFrameHash(imageData);
    
    if (this.frameCache.has(frameHash)) {
      const cached = this.frameCache.get(frameHash)!;
      return { ...cached, index };
    }
    
    const quickAnalysis = this.quickPixelAnalysis(imageData);
    
    if (quickAnalysis.isBlank) {
      const result: EnhancedFrameAnalysis = {
        index,
        scores: {
          staticScore: 0.1,
          subtitleScore: 1.0,
          peopleScore: 0.0,
          qualityScore: 0.1,
          diversityScore: 0.5,
          overallScore: 0.1
        },
        features: {
          hasText: false,
          hasFaces: false,
          colorfulness: 0.1,
          sharpness: 0.1,
          brightness: quickAnalysis.basicQuality,
          contrast: 0.1
        },
        aiAnalyzed: false
      };
      
      this.frameCache.set(frameHash, result);
      return result;
    }
    
    const textRegions = this.detectTextRegions(imageData);
    const faceRegions = this.detectFaceRegions(imageData);
    const sharpness = this.calculateSharpness(imageData);
    
    const hasText = textRegions.length > 0;
    const hasFaces = faceRegions.length > 0;
    const avgTextConfidence = hasText ? 
      textRegions.reduce((sum, region) => sum + region.confidence, 0) / textRegions.length : 0;
    const avgFaceConfidence = hasFaces ?
      faceRegions.reduce((sum, region) => sum + region.confidence, 0) / faceRegions.length : 0;
    
    const scores: FrameAnalysisScore = {
      staticScore: Math.min(1, quickAnalysis.basicQuality + sharpness),
      subtitleScore: 1 - avgTextConfidence,
      peopleScore: avgFaceConfidence,
      qualityScore: (quickAnalysis.basicQuality + sharpness) / 2,
      diversityScore: quickAnalysis.basicQuality,
      overallScore: 0
    };
    
    scores.overallScore = (
      scores.staticScore * 0.2 +
      scores.subtitleScore * 0.3 +
      scores.peopleScore * 0.3 +
      scores.qualityScore * 0.2
    );
    
    const result: EnhancedFrameAnalysis = {
      index,
      scores,
      features: {
        hasText,
        hasFaces,
        colorfulness: quickAnalysis.basicQuality,
        sharpness,
        brightness: quickAnalysis.basicQuality,
        contrast: sharpness
      },
      aiAnalyzed: false
    };
    
    this.frameCache.set(frameHash, result);
    return result;
  }

  /**
   * 批量分析帧
   */
  public async analyzeFrames(frames: ImageData[]): Promise<EnhancedFrameAnalysis[]> {
    const results: EnhancedFrameAnalysis[] = [];
    
    for (let i = 0; i < frames.length; i++) {
      const result = await this.analyzeFrame(frames[i], i);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 清理缓存
   */
  public clearCache(): void {
    this.frameCache.clear();
  }
}