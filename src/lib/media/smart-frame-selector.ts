/**
 * 智能帧选择器
 * 整合多层级分析策略，优化帧选择效果
 */

import type { EnhancedFrameAnalysis } from './enhanced-frame-analyzer';
import { SiliconFlowAPI, FrameAnalysisResult } from '@/lib/utils/siliconflow-api';

export interface SmartSelectionOptions {
  targetCount: number;
  preferences: {
    prioritizeStatic: boolean;
    avoidSubtitles: boolean;
    preferPeople: boolean;
    preferFaces: boolean;
    enhanceDiversity: boolean;
  };
  aiAnalysis: {
    enabled: boolean;
    apiKey?: string;
    model?: string;
    maxAIFrames?: number; // 最多用AI分析的帧数
    confidenceThreshold?: number; // AI分析的置信度阈值
  };
  performance: {
    maxProcessingTime?: number; // 最大处理时间（毫秒）
    enableCaching?: boolean;
    batchSize?: number;
  };
}

export interface SmartSelectionResult {
  selectedFrames: Array<{
    index: number;
    originalIndex: number;
    scores: EnhancedFrameAnalysis['scores'];
    features: EnhancedFrameAnalysis['features'];
    aiAnalyzed: boolean;
    aiResult?: FrameAnalysisResult;
  }>;
  statistics: {
    totalFrames: number;
    analyzedFrames: number;
    aiAnalyzedFrames: number;
    processingTime: number;
    cacheHits: number;
  };
}

export class SmartFrameSelector {
  private enhancedAnalyzer: any = null;
  private siliconFlowAPI: SiliconFlowAPI | null = null;
  private processingStartTime: number = 0;

  constructor() {
    // 延迟初始化，避免在服务端渲染时出错
    this.enhancedAnalyzer = null;
  }

  /**
   * 确保分析器已初始化
   */
  private async ensureAnalyzerInitialized(): Promise<void> {
    if (!this.enhancedAnalyzer) {
      // 动态导入避免构造函数问题
      const { EnhancedFrameAnalyzer } = await import('./enhanced-frame-analyzer');
      this.enhancedAnalyzer = new EnhancedFrameAnalyzer();
    }
  }

  /**
   * 配置AI分析
   */
  public configureAI(apiKey: string, model?: string): void {
    this.siliconFlowAPI = new SiliconFlowAPI({
      apiKey,
      model: model || 'Qwen/Qwen2.5-VL-32B-Instruct'
    });
  }

  /**
   * 智能选择最佳帧
   */
  public async selectBestFrames(
    frames: ImageData[],
    options: SmartSelectionOptions
  ): Promise<SmartSelectionResult> {
    await this.ensureAnalyzerInitialized();
    this.processingStartTime = Date.now();

    const statistics = {
      totalFrames: frames.length,
      analyzedFrames: 0,
      aiAnalyzedFrames: 0,
      processingTime: 0,
      cacheHits: 0
    };

    // 第一阶段：本地快速分析所有帧
    
    const localAnalysis = await this.enhancedAnalyzer.analyzeFrames(frames);
    statistics.analyzedFrames = localAnalysis.length;

    // 第二阶段：基于本地分析结果进行初步筛选
    
    const candidates = this.selectCandidateFrames(localAnalysis, options);
    
    // 第三阶段：AI精确分析（如果启用且有必要）
    let finalAnalysis = candidates;
    if (options.aiAnalysis.enabled && this.siliconFlowAPI && candidates.length > options.targetCount) {
      
      finalAnalysis = await this.performAIAnalysis(candidates, frames, options);
      statistics.aiAnalyzedFrames = finalAnalysis.filter(f => f.aiAnalyzed).length;
    }

    // 第四阶段：最终选择和多样性优化
    
    const selectedFrames = this.performFinalSelection(finalAnalysis, options);

    statistics.processingTime = Date.now() - this.processingStartTime;

    return {
      selectedFrames: selectedFrames.map(frame => ({
        index: frame.index,
        originalIndex: frame.index,
        scores: frame.scores,
        features: frame.features,
        aiAnalyzed: frame.aiAnalyzed,
        aiResult: (frame as any).aiResult
      })),
      statistics
    };
  }

  /**
   * 基于本地分析选择候选帧
   */
  private selectCandidateFrames(
    analysis: EnhancedFrameAnalysis[],
    options: SmartSelectionOptions
  ): EnhancedFrameAnalysis[] {
    // 应用用户偏好过滤
    let candidates = analysis.filter(frame => {
      // 基本质量过滤
      if (frame.scores.qualityScore < 0.3) return false;
      
      // 字幕过滤
      if (options.preferences.avoidSubtitles && frame.features.hasText) {
        return frame.scores.subtitleScore > 0.7; // 只保留字幕置信度低的
      }
      
      // 人物偏好
      if (options.preferences.preferPeople && !frame.features.hasFaces) {
        return frame.scores.peopleScore > 0.3; // 给没有明显人脸但可能有人物的帧一些机会
      }
      
      return true;
    });

    // 如果过滤后候选帧太少，放宽条件
    if (candidates.length < options.targetCount * 2) {
      
      candidates = analysis.filter(frame => frame.scores.qualityScore > 0.2);
    }

    // 按综合评分排序
    candidates.sort((a, b) => b.scores.overallScore - a.scores.overallScore);
    
    // 选择前N个候选帧（通常是目标数量的2-3倍）
    const candidateCount = Math.min(
      candidates.length,
      Math.max(options.targetCount * 2, options.aiAnalysis.maxAIFrames || 20)
    );
    
    return candidates.slice(0, candidateCount);
  }

  /**
   * 执行AI分析
   */
  private async performAIAnalysis(
    candidates: EnhancedFrameAnalysis[],
    frames: ImageData[],
    options: SmartSelectionOptions
  ): Promise<EnhancedFrameAnalysis[]> {
    if (!this.siliconFlowAPI) return candidates;

    const maxAIFrames = options.aiAnalysis.maxAIFrames || 10;
    const framesToAnalyze = candidates.slice(0, Math.min(maxAIFrames, candidates.length));

    // 批量AI分析
    const batchSize = 3; // 减少并发请求数
    const aiResults: Array<EnhancedFrameAnalysis & { aiResult?: FrameAnalysisResult }> = [];

    for (let i = 0; i < framesToAnalyze.length; i += batchSize) {
      const batch = framesToAnalyze.slice(i, i + batchSize);
      const batchPromises = batch.map(async (candidate) => {
        try {
          const aiResult = await this.siliconFlowAPI!.analyzeFrame(frames[candidate.index]);
          
          // 融合AI分析结果
          const enhancedCandidate = this.mergeAIAnalysis(candidate, aiResult);
          return { ...enhancedCandidate, aiResult };
        } catch (error) {
          
          return candidate; // 返回原始分析结果
        }
      });

      const batchResults = await Promise.all(batchPromises);
      aiResults.push(...batchResults);
      
      // 添加延迟避免API限流
      if (i + batchSize < framesToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 合并AI分析的帧和未分析的帧
    const remainingCandidates = candidates.slice(framesToAnalyze.length);
    return [...aiResults, ...remainingCandidates];
  }

  /**
   * 融合AI分析结果
   */
  private mergeAIAnalysis(
    localAnalysis: EnhancedFrameAnalysis,
    aiResult: FrameAnalysisResult
  ): EnhancedFrameAnalysis {
    // 融合字幕检测结果
    const subtitleScore = aiResult.hasSubtitles ? 
      Math.min(localAnalysis.scores.subtitleScore, 1 - aiResult.confidence) :
      Math.max(localAnalysis.scores.subtitleScore, aiResult.confidence);

    // 融合人物检测结果
    const peopleScore = aiResult.hasPeople ?
      Math.max(localAnalysis.scores.peopleScore, aiResult.confidence) :
      Math.min(localAnalysis.scores.peopleScore, 1 - aiResult.confidence);

    // 重新计算综合评分
    const newScores = {
      ...localAnalysis.scores,
      subtitleScore,
      peopleScore
    };

    newScores.overallScore = (
      newScores.staticScore * 0.2 +
      newScores.subtitleScore * 0.3 +
      newScores.peopleScore * 0.3 +
      newScores.qualityScore * 0.2
    );

    return {
      ...localAnalysis,
      scores: newScores,
      features: {
        ...localAnalysis.features,
        hasText: aiResult.hasSubtitles || localAnalysis.features.hasText,
        hasFaces: aiResult.hasPeople || localAnalysis.features.hasFaces
      },
      aiAnalyzed: true
    };
  }

  /**
   * 执行最终选择和多样性优化
   */
  private performFinalSelection(
    candidates: EnhancedFrameAnalysis[],
    options: SmartSelectionOptions
  ): EnhancedFrameAnalysis[] {
    if (candidates.length <= options.targetCount) {
      return candidates;
    }

    // 按评分排序
    candidates.sort((a, b) => b.scores.overallScore - a.scores.overallScore);

    if (!options.preferences.enhanceDiversity) {
      // 不需要多样性优化，直接返回前N个
      return candidates.slice(0, options.targetCount);
    }

    // 多样性优化选择
    const selected: EnhancedFrameAnalysis[] = [];
    const remaining = [...candidates];

    // 首先选择评分最高的帧
    selected.push(remaining.shift()!);

    // 使用贪心算法选择剩余帧，平衡评分和多样性
    while (selected.length < options.targetCount && remaining.length > 0) {
      let bestCandidate = remaining[0];
      let bestScore = -1;

      for (const candidate of remaining) {
        // 计算与已选择帧的多样性
        const diversityScore = this.calculateDiversityScore(candidate, selected);
        
        // 综合评分：原始评分 + 多样性奖励
        const combinedScore = candidate.scores.overallScore * 0.7 + diversityScore * 0.3;
        
        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestCandidate = candidate;
        }
      }

      selected.push(bestCandidate);
      remaining.splice(remaining.indexOf(bestCandidate), 1);
    }

    return selected;
  }

  /**
   * 计算多样性评分
   */
  private calculateDiversityScore(
    candidate: EnhancedFrameAnalysis,
    selected: EnhancedFrameAnalysis[]
  ): number {
    if (selected.length === 0) return 1;

    let totalSimilarity = 0;
    
    for (const selectedFrame of selected) {
      // 基于特征计算相似度
      const colorSimilarity = Math.abs(candidate.features.colorfulness - selectedFrame.features.colorfulness);
      const brightnessSimilarity = Math.abs(candidate.features.brightness - selectedFrame.features.brightness);
      const sharpnessSimilarity = Math.abs(candidate.features.sharpness - selectedFrame.features.sharpness);
      
      // 位置相似度（时间上的距离）
      const positionSimilarity = Math.abs(candidate.index - selectedFrame.index) / 100; // 归一化
      
      const similarity = (colorSimilarity + brightnessSimilarity + sharpnessSimilarity) / 3 + 
                        Math.min(1, positionSimilarity);
      
      totalSimilarity += similarity;
    }

    // 返回多样性评分（相似度越低，多样性越高）
    return Math.min(1, totalSimilarity / selected.length);
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    if (this.enhancedAnalyzer && this.enhancedAnalyzer.clearCache) {
      this.enhancedAnalyzer.clearCache();
    }
  }
}