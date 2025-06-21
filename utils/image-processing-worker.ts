// 图像处理Web Worker
// 用于在后台线程中进行计算密集型的图像分析

// 定义消息类型接口
interface WorkerMessage {
  type: 'staticScore' | 'subtitleScore' | 'peopleScore' | 'batchAnalysis';
  imageData: ImageData;
  width: number;
  height: number;
  taskId?: string;
  options?: {
    sampleRate?: number;
    subtitleDetectionStrength?: number;
    staticFrameThreshold?: number;
  };
}

// 定义分析选项接口
interface AnalysisOptions {
  sampleRate?: number;
  subtitleDetectionStrength?: number;
  staticFrameThreshold?: number;
}

// 接收主线程消息
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  try {
    const { type, imageData, width, height, options, taskId } = e.data;
    
    if (!imageData || !width || !height) {
      self.postMessage({ 
        error: '无效的图像数据', 
        taskId 
      });
      return;
    }
    
    switch (type) {
      case 'staticScore':
        try {
          const staticScore = calculateStaticScore(imageData, options?.sampleRate || 1);
          self.postMessage({ type, score: staticScore, taskId });
        } catch (error) {
          console.error('计算静态分数失败:', error);
          self.postMessage({ 
            type, 
            error: '计算静态分数失败', 
            score: 0.5, // 返回默认值
            taskId 
          });
        }
        break;
        
      case 'subtitleScore':
        try {
          const subtitleScore = calculateSubtitleScore(imageData, width, height, options?.subtitleDetectionStrength || 0.8);
          self.postMessage({ type, score: subtitleScore, taskId });
        } catch (error) {
          console.error('计算字幕分数失败:', error);
          self.postMessage({ 
            type, 
            error: '计算字幕分数失败', 
            score: 0.5, // 返回默认值
            taskId 
          });
        }
        break;
        
      case 'peopleScore':
        try {
          const peopleScore = calculatePeopleScore(imageData, options?.sampleRate || 4);
          self.postMessage({ type, score: peopleScore, taskId });
        } catch (error) {
          console.error('计算人物分数失败:', error);
          self.postMessage({ 
            type, 
            error: '计算人物分数失败', 
            score: 0.5, // 返回默认值
            taskId 
          });
        }
        break;
        
      case 'batchAnalysis':
        try {
          // 进行一次性批量分析，减少消息传递开销
          const results = batchAnalyzeImage(imageData, width, height, options);
          self.postMessage({ 
            type, 
            results,
            taskId
          });
        } catch (error) {
          console.error('批量分析失败:', error);
          // 返回默认结果
          self.postMessage({ 
            type, 
            error: '批量分析失败', 
            results: {
              staticScore: 0.5,
              subtitleScore: 0.5,
              peopleScore: 0.5
            },
            taskId 
          });
        }
        break;
        
      default:
        self.postMessage({ error: '不支持的分析类型', taskId });
    }
  } catch (error) {
    console.error('Worker处理消息失败:', error);
    self.postMessage({ 
      error: '处理消息失败: ' + (error instanceof Error ? error.message : String(error)),
      taskId: e.data?.taskId
    });
  }
};

// 批量分析图像
function batchAnalyzeImage(
  imageData: ImageData, 
  width: number, 
  height: number, 
  options?: AnalysisOptions
) {
  const sampleRate = options?.sampleRate || 2;
  const subtitleDetectionStrength = options?.subtitleDetectionStrength || 0.8;
  
  try {
    // 计算各项分数
    const staticScore = calculateStaticScore(imageData, sampleRate);
    const subtitleScore = calculateSubtitleScore(imageData, width, height, subtitleDetectionStrength);
    const peopleScore = calculatePeopleScore(imageData, sampleRate);
    const emptyFrameScore = detectEmptyFrame(imageData, sampleRate);
    
    // 创建分析结果对象
    const results = {
      staticScore,
      subtitleScore,
      peopleScore,
      emptyFrameScore,
      // 额外分析
      edgeMap: generateEdgeMap(imageData, width, height, sampleRate),
      colorProfile: analyzeColorProfile(imageData, sampleRate)
    };
    
    return results;
  } catch (error) {
    console.error('批量分析图像失败:', error);
    // 返回默认结果
    return {
      staticScore: 0.5,
      subtitleScore: 0.5,
      peopleScore: 0.5,
      emptyFrameScore: 0.5
    };
  }
}

// 优化版的静态帧评分函数 - 支持采样率参数
function calculateStaticScore(imageData: ImageData, sampleRate: number = 1): number {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  
  // 分析特征
  const features = {
    edgeDensity: 0,          // 边缘密度
    colorDiversity: 0,       // 颜色多样性
    contentRichness: 0,      // 内容丰富度
    uniformityScore: 0       // 均匀性评分
  };
  
  // 1. 边缘密度分析
  let edgeCount = 0;
  let totalPixels = 0;
  const stride = Math.max(1, Math.floor(4 * sampleRate)); // 考虑每像素4个通道
  
  // 使用2D采样而非1D，更好地捕获图像特征
  for (let y = 0; y < height; y += sampleRate) {
    const rowOffset = y * width * 4;
    let lastBrightness = -1;
    
    for (let x = 0; x < width; x += sampleRate) {
      const pixelOffset = rowOffset + (x * 4);
      if (pixelOffset >= data.length - 4) continue;
      
      const r = data[pixelOffset];
      const g = data[pixelOffset + 1];
      const b = data[pixelOffset + 2];
      
      // 计算像素亮度 - 使用更准确的亮度公式
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // 检测水平边缘
      if (lastBrightness >= 0) {
        if (Math.abs(brightness - lastBrightness) > 25) {
          edgeCount++;
        }
      }
      
      // 更新上一个亮度值
      lastBrightness = brightness;
      totalPixels++;
    }
  }
  
  // 计算边缘密度
  const edgeDensity = edgeCount / totalPixels;
  features.edgeDensity = edgeDensity;
  
  // 2. 颜色多样性分析
  const colorHistogram: {[key: string]: number} = {};
  
  // 采样计算颜色分布
  for (let i = 0; i < data.length; i += 4 * sampleRate * 2) {
    if (i >= data.length - 4) break;
    
    const r = Math.floor(data[i] / 32) * 32;     // 量化为8个区间
    const g = Math.floor(data[i+1] / 32) * 32;
    const b = Math.floor(data[i+2] / 32) * 32;
    
    const colorKey = `${r},${g},${b}`;
    colorHistogram[colorKey] = (colorHistogram[colorKey] || 0) + 1;
  }
  
  // 计算颜色多样性 (熵)
  let entropy = 0;
  const totalColors = Object.values(colorHistogram).reduce((sum, val) => sum + val, 0);
  
  for (const color of Object.values(colorHistogram)) {
    const p = color / totalColors;
    entropy -= p * Math.log2(p);
  }
  
  // 标准化熵值到0-1范围
  features.colorDiversity = Math.min(1, entropy / 3);
  
  // 3. 内容丰富度分析 - 将图像划分为3x3网格
  const gridSize = 3;
  const gridEdgeDensity: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  const gridSamples: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  
  for (let y = 0; y < height; y += sampleRate * 2) {
    for (let x = 0; x < width; x += sampleRate * 2) {
      // 计算网格位置
      const gridX = Math.min(gridSize - 1, Math.floor(x / width * gridSize));
      const gridY = Math.min(gridSize - 1, Math.floor(y / height * gridSize));
      
      const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      // 检测该点是否有边缘
      if (x > 0 && y > 0) {
        const r = data[pixelOffset];
        const g = data[pixelOffset + 1];
        const b = data[pixelOffset + 2];
        
        const leftOffset = pixelOffset - 4;
        const topOffset = pixelOffset - (width * 4);
        
        if (leftOffset >= 0 && topOffset >= 0) {
          const currentBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          
          const leftBrightness = 
            0.299 * data[leftOffset] + 
            0.587 * data[leftOffset + 1] + 
            0.114 * data[leftOffset + 2];
            
          const topBrightness = 
            0.299 * data[topOffset] + 
            0.587 * data[topOffset + 1] + 
            0.114 * data[topOffset + 2];
          
          // 如果与左侧或上方像素有明显差异，认为有边缘
          if (Math.abs(currentBrightness - leftBrightness) > 20 || 
              Math.abs(currentBrightness - topBrightness) > 20) {
            gridEdgeDensity[gridY][gridX]++;
          }
        }
      }
      
      gridSamples[gridY][gridX]++;
    }
  }
  
  // 计算每个网格的边缘密度
  const gridScores = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (gridSamples[y][x] > 0) {
        const score = gridEdgeDensity[y][x] / gridSamples[y][x];
        gridScores.push(score);
      }
    }
  }
  
  // 计算内容丰富度 - 基于网格边缘密度的均值和方差
  if (gridScores.length > 0) {
    // 计算平均边缘密度
    const avgScore = gridScores.reduce((sum, val) => sum + val, 0) / gridScores.length;
    
    // 计算中心区域的边缘密度 (中心区域更重要)
    const centerScore = gridSamples[1][1] > 0 ? 
      gridEdgeDensity[1][1] / gridSamples[1][1] : 0;
    
    // 计算方差 - 内容分布的均匀性
    const variance = gridScores.reduce((sum, val) => sum + Math.pow(val - avgScore, 2), 0) / gridScores.length;
    const uniformity = Math.max(0, 1 - Math.sqrt(variance) / avgScore);
    
    // 内容丰富度综合评分
    features.contentRichness = (avgScore * 0.6 + centerScore * 0.4) * 5; // 缩放到合适范围
    features.uniformityScore = uniformity;
  }
  
  // 4. 综合评分 - 静态帧质量
  // 静态帧的理想特征: 边缘适中、颜色丰富、内容均匀分布
  const staticScore = 
    (1 - features.edgeDensity * 8) * 0.5 +     // 边缘密度适中 (保留原有逻辑)
    features.colorDiversity * 0.2 +            // 颜色多样性高
    features.contentRichness * 0.2 +           // 内容丰富
    features.uniformityScore * 0.1;            // 内容分布均匀
  
  return Math.min(1, Math.max(0, staticScore));
}

// 优化版的字幕评分函数 - 只保留核心计算
function calculateSubtitleScore(
  imageData: ImageData, 
  width: number, 
  height: number,
  detectionStrength: number = 0.8
): number {
  const data = imageData.data;
  
  // ===== 增强版字幕检测算法 v2.0 =====
  // 1. 多区域检测 - 不仅检测底部区域，同时检查顶部和中间
  const regions = [
    { name: "bottom", startY: Math.floor(height * 0.75), endY: height, weight: 0.5 },           // 底部区域(最高权重)
    { name: "top", startY: 0, endY: Math.floor(height * 0.2), weight: 0.3 },                    // 顶部区域(次高权重)
    { name: "middle", startY: Math.floor(height * 0.35), endY: Math.floor(height * 0.65), weight: 0.2 } // 中间区域
  ];
  
  // 2. 特征提取器配置
  const featureExtractors = {
    // 横向边缘分析(文字边缘)
    horizontalEdges: { weight: 0.25 },
    
    // 规则模式分析(文本行特征)
    textPatterns: { weight: 0.25 },
    
    // 亮度对比分析
    contrastAnalysis: { weight: 0.2 },
    
    // 文本行对齐分析
    textAlignment: { weight: 0.15 },
    
    // 颜色聚类分析(字幕通常有固定配色)
    colorClustering: { weight: 0.15 }
  };
  
  // 3. 全局评分聚合器
  const globalScores = {
    horizontalEdgeScore: 0,
    textPatternScore: 0,
    contrastScore: 0,
    alignmentScore: 0,
    colorClusterScore: 0,
    regionScores: new Map<string, number>()
  };
  
  // 4. 字幕文字/背景的颜色特征库
  const subtitleColorFeatures = {
    backgrounds: [
      { r: 0, g: 0, b: 0, alpha: 1.0, name: "纯黑", threshold: 30 },       // 纯黑背景
      { r: 0, g: 0, b: 0, alpha: 0.5, name: "半透明黑", threshold: 40 },   // 半透明黑背景
      { r: 255, g: 255, b: 255, alpha: 1.0, name: "纯白", threshold: 30 }, // 纯白背景
      { r: 0, g: 0, b: 128, alpha: 0.7, name: "深蓝", threshold: 50 },     // 深蓝背景
    ],
    text: [
      { r: 255, g: 255, b: 255, name: "白色", threshold: 30 },  // 白色文字
      { r: 255, g: 255, b: 0, name: "黄色", threshold: 40 },    // 黄色文字
      { r: 0, g: 255, b: 255, name: "青色", threshold: 40 }     // 青色文字
    ]
  };
  
  // 中文字幕特征定义 - 比英文更密集、笔画更复杂
  const chineseSubtitleFeatures = {
    // 中文字符通常更密集，行间距趋于一致
    lineSpacing: { min: 1.0, max: 1.5, ideal: 1.2, weight: 0.3 },
    // 中文字符通常宽度接近一致(方块字特征)
    charWidthVariance: { threshold: 0.2, weight: 0.3 },
    // 中文字符通常笔画密度更高
    strokeDensity: { threshold: 0.05, weight: 0.4 }
  };
  
  // 5. 为每个区域分别计算特征
  for (const region of regions) {
    // 该区域的特征分数
    const regionFeatures = {
      horizontalEdges: 0,
      textPatterns: 0,
      contrastPixels: 0,
      alignmentScore: 0,
      colorEvidence: 0,
      
      // 行特征存储
      lineFeatures: [] as Array<{
        edgeCount: number,
        brightPixels: number,
        darkPixels: number,
        edgePositions: number[],
        colorCounts: Map<string, number>,
        complexity: number,
        chineseTextEvidence: number
      }>,
      
      // 统计数据
      totalLines: 0,
      validTextLines: 0,
      totalPixels: 0
    };
    
    // 记录相邻行特征相似度，用于检测字幕的规则排列
    let lastLineFeature = null;
    let consecutiveSimilarLines = 0;
    
    // 颜色聚类分析变量
    const colorClusters = new Map<string, number>();
    
    // 扫描该区域的每一行
    for (let y = region.startY; y < region.endY; y++) {
    let horizontalEdgeCount = 0;
    let brightPixels = 0;
    let darkPixels = 0;
      let mediumPixels = 0;
      let lastPixelBrightness = -1;
      const edgePositions: number[] = [];
      const rowColorCounts = new Map<string, number>();
      
      // 扫描该行的每个像素
      for (let x = 0; x < width; x++) {
        const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      const r = data[pixelOffset];
      const g = data[pixelOffset + 1];
      const b = data[pixelOffset + 2];
        const a = data[pixelOffset + 3];
      
        // 计算亮度 - 使用感知亮度公式
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      
        // 亮度分类
        if (brightness > 180) brightPixels++;
        else if (brightness < 60) darkPixels++;
        else mediumPixels++;
        
        // 颜色量化和聚类 (简化为64种颜色)
        const colorKey = `${Math.floor(r/32)},${Math.floor(g/32)},${Math.floor(b/32)},${Math.floor(a/128)}`;
        rowColorCounts.set(colorKey, (rowColorCounts.get(colorKey) || 0) + 1);
        colorClusters.set(colorKey, (colorClusters.get(colorKey) || 0) + 1);
        
        // 检测水平边缘(字幕文本的关键特征)
        if (lastPixelBrightness >= 0) {
          const edgeMagnitude = Math.abs(brightness - lastPixelBrightness);
          // 自适应阈值：根据区域平均亮度调整
          const edgeThreshold = 35;
          if (edgeMagnitude > edgeThreshold) {
            horizontalEdgeCount++;
            edgePositions.push(x);
          }
        }
        
        // 检测特定颜色属于字幕文字或背景的可能性
        // 检查是否匹配已知的字幕颜色特征
        for (const textColor of subtitleColorFeatures.text) {
          if (
            Math.abs(r - textColor.r) <= textColor.threshold &&
            Math.abs(g - textColor.r) <= textColor.threshold &&
            Math.abs(b - textColor.r) <= textColor.threshold
          ) {
            regionFeatures.colorEvidence += 0.1;
            break;
          }
        }
        
        lastPixelBrightness = brightness;
        regionFeatures.totalPixels++;
      }
      
      // 分析该行的特征
      const lineComplexity = horizontalEdgeCount / width; // 边缘密度作为复杂度指标
      const hasValidBrightnessDistribution = brightPixels > 0 && darkPixels > 0;
      
      // 中文字幕特征分析 - 检测方块字特征
      // 分析边缘的间距规律性 - 中文汉字通常有较高的笔画密度和规律的间距
      let chineseTextEvidence = 0;
      if (edgePositions.length > 5) {
        // 1. 计算相邻边缘之间的间距
        const edgeSpacings = [];
        for (let i = 1; i < edgePositions.length; i++) {
          edgeSpacings.push(edgePositions[i] - edgePositions[i-1]);
        }
        
        // 2. 分析间距的规律性
        if (edgeSpacings.length > 0) {
          // 计算方差和平均值
          const avgSpacing = edgeSpacings.reduce((sum, s) => sum + s, 0) / edgeSpacings.length;
          const variance = edgeSpacings.reduce((sum, s) => sum + Math.pow(s - avgSpacing, 2), 0) / edgeSpacings.length;
          const stdDev = Math.sqrt(variance);
          
          // 计算变异系数 (标准差/平均值) - 越小越规律
          const variationCoef = stdDev / avgSpacing;
          
          // 中文字符笔画特征：变异系数通常较小(规律)，且边缘密度较高
          if (variationCoef < chineseSubtitleFeatures.charWidthVariance.threshold && 
              lineComplexity > chineseSubtitleFeatures.strokeDensity.threshold) {
            chineseTextEvidence = 1 - variationCoef; // 越规律分数越高
            regionFeatures.colorEvidence += 0.1; // 加分
          }
        }
      }
      
      // 记录该行的特征
      const currentLineFeature = {
        edgeCount: horizontalEdgeCount,
        brightPixels,
        darkPixels,
        edgePositions,
        colorCounts: rowColorCounts,
        complexity: lineComplexity,
        chineseTextEvidence
      };
      regionFeatures.lineFeatures.push(currentLineFeature);
      
      // 分析是否为可能的文本行
      const isTextLine = horizontalEdgeCount >= 3 && // 最低边缘数
                         hasValidBrightnessDistribution && // 具有明暗对比
                         lineComplexity > 0.01 && lineComplexity < 0.2; // 合理的复杂度范围
      
      if (isTextLine) {
        regionFeatures.horizontalEdges++;
        regionFeatures.validTextLines++;
        
        // 分析相邻行的相似性(文本行通常有相似的特征)
        if (lastLineFeature !== null) {
          const complexityDiff = Math.abs(currentLineFeature.complexity - lastLineFeature.complexity);
          const edgeCountDiff = Math.abs(currentLineFeature.edgeCount - lastLineFeature.edgeCount) / Math.max(1, lastLineFeature.edgeCount);
          const isSimilar = complexityDiff < 0.05 && edgeCountDiff < 0.3;
          
          // 检查中文字幕的行间距特征
          if (isSimilar && currentLineFeature.chineseTextEvidence > 0 && lastLineFeature.chineseTextEvidence > 0) {
            // 中文字幕证据加分
            regionFeatures.colorEvidence += 0.05;
            
            // 分析行间距 - 中文字幕通常行间距较为固定
            // 这里简化处理，仅检测连续行的相似性
            consecutiveSimilarLines += 0.5; // 额外加分
          }
          
          if (isSimilar) {
            consecutiveSimilarLines++;
            // 分析边缘对齐程度(字幕文字通常在多行间对齐)
            let alignedEdges = 0;
            for (const pos of currentLineFeature.edgePositions) {
              for (const lastPos of lastLineFeature.edgePositions) {
                if (Math.abs(pos - lastPos) <= 2) { // 允许2像素的误差
                  alignedEdges++;
                  break;
                }
              }
            }
            
            const alignmentRatio = alignedEdges / Math.max(1, currentLineFeature.edgePositions.length);
            if (alignmentRatio > 0.2) {
              regionFeatures.alignmentScore += alignmentRatio;
            }
          } else {
            consecutiveSimilarLines = 0;
          }
        }
        
        // 分析对比度(字幕通常有高对比度)
    if (brightPixels > 0 && darkPixels > 0) {
      const minCount = Math.min(brightPixels, darkPixels);
      const maxCount = Math.max(brightPixels, darkPixels);
          // 检查明暗像素的比例是否合理
          if (minCount / maxCount > 0.05) {
            regionFeatures.contrastPixels += (brightPixels + darkPixels);
          }
        }
      }
      
      // 更新文本模式特征
      if (consecutiveSimilarLines >= 2) {
        regionFeatures.textPatterns += Math.min(1, consecutiveSimilarLines / 5);
      }
      
      lastLineFeature = currentLineFeature;
      regionFeatures.totalLines++;
    }
    
    // 分析颜色聚类结果(字幕通常有2-3种主要颜色)
    const sortedClusters = Array.from(colorClusters.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // 取前5种颜色
      
    // 计算前两种颜色占比
    if (sortedClusters.length >= 2) {
      const total = sortedClusters.reduce((sum, [_, count]) => sum + count, 0);
      const topTwoRatio = (sortedClusters[0][1] + sortedClusters[1][1]) / total;
      // 字幕通常有明显的前景色和背景色，占比较高
      if (topTwoRatio > 0.7) {
        regionFeatures.colorEvidence += topTwoRatio - 0.7;
      }
    }
    
    // 标准化区域特征值
    const normalizedEdges = regionFeatures.totalLines > 0 ? 
      regionFeatures.horizontalEdges / regionFeatures.totalLines : 0;
    
    const normalizedPatterns = regionFeatures.totalLines > 0 ? 
      regionFeatures.textPatterns / (regionFeatures.totalLines / 2) : 0;
    
    const normalizedContrast = regionFeatures.totalPixels > 0 ? 
      regionFeatures.contrastPixels / regionFeatures.totalPixels : 0;
    
    const normalizedAlignment = regionFeatures.validTextLines > 0 ? 
      regionFeatures.alignmentScore / regionFeatures.validTextLines : 0;
    
    const normalizedColor = regionFeatures.colorEvidence / 5; // 根据收集的证据标准化
    
    // 计算该区域的综合分数
    const regionScore = 
      normalizedEdges * featureExtractors.horizontalEdges.weight +
      normalizedPatterns * featureExtractors.textPatterns.weight +
      normalizedContrast * featureExtractors.contrastAnalysis.weight +
      normalizedAlignment * featureExtractors.textAlignment.weight +
      normalizedColor * featureExtractors.colorClustering.weight;
    
    // 记录该区域的分数
    globalScores.regionScores.set(region.name, regionScore);
    
    // 累加到全局特征 (加权)
    globalScores.horizontalEdgeScore += normalizedEdges * region.weight;
    globalScores.textPatternScore += normalizedPatterns * region.weight;
    globalScores.contrastScore += normalizedContrast * region.weight;
    globalScores.alignmentScore += normalizedAlignment * region.weight;
    globalScores.colorClusterScore += normalizedColor * region.weight;
  }
  
  // 分析每个区域分数，找出最可能包含字幕的区域
  let maxRegionScore = 0;
  let bestRegion = "";
  for (const [regionName, score] of globalScores.regionScores.entries()) {
    if (score > maxRegionScore) {
      maxRegionScore = score;
      bestRegion = regionName;
    }
  }
  
  // 单一区域的高分比分散在多个区域更可能是字幕
  const regionBoost = maxRegionScore > 0.6 ? 0.2 : 0;
  
  // 6. 计算最终字幕分数 (整合所有特征)
  let finalScore = 
    globalScores.horizontalEdgeScore * featureExtractors.horizontalEdges.weight +
    globalScores.textPatternScore * featureExtractors.textPatterns.weight +
    globalScores.contrastScore * featureExtractors.contrastAnalysis.weight +
    globalScores.alignmentScore * featureExtractors.textAlignment.weight +
    globalScores.colorClusterScore * featureExtractors.colorClustering.weight +
    regionBoost; // 区域奖励分
  
  // 应用检测强度参数
  finalScore *= detectionStrength;
  
  // 非线性变换，增强高可信度区域的分数
  if (finalScore > 0.6) {
    finalScore = 0.6 + (finalScore - 0.6) * 1.5;
  }
  
  // 确保分数在[0,1]范围内
  return Math.min(1, Math.max(0, finalScore));
}

// 优化版的人物检测评分函数
function calculatePeopleScore(imageData: ImageData, sampleRate: number = 4): number {
  const { data, width, height } = imageData;
  let skinColorPixels = 0;
  let totalPixels = 0;
  
  // 将图像划分为3x3网格，分别计算每个区域的肤色比例
  const gridSize = 3;
  const gridScores: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  const gridCounts: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  
  // 使用更高效的采样方式
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      const r = data[pixelOffset];
      const g = data[pixelOffset + 1];
      const b = data[pixelOffset + 2];
      
      // 计算网格位置
      const gridX = Math.min(gridSize - 1, Math.floor(x / width * gridSize));
      const gridY = Math.min(gridSize - 1, Math.floor(y / height * gridSize));
      gridCounts[gridY][gridX]++;
      
      // 改进的肤色检测 - 结合RGB和YCbCr模型
      // RGB模型检测
      const isSkinRGB = (
        r > 95 && g > 40 && b > 20 && // 基本亮度要求
        r > g && r > b && // 红色分量最大
        Math.abs(r - g) > 15 && // 红绿差异明显
        r - g > 15 && // 红色明显大于绿色
        r - b > 15 // 红色明显大于蓝色
      );
      
      // YCbCr模型检测
      const yColor = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const isSkinYCbCr = (
        yColor > 80 && // 足够亮
        cb > 85 && cb < 135 && // Cb在肤色范围内
        cr > 135 && cr < 180 // Cr在肤色范围内
      );
      
      // 综合两种模型的结果
      if (isSkinRGB || isSkinYCbCr) {
      skinColorPixels++;
        gridScores[gridY][gridX]++;
    }
    
    totalPixels++;
    }
  }
  
  // 计算基础肤色分数
  const skinRatio = skinColorPixels / totalPixels;
  let peopleScore = Math.min(1, skinRatio * 5); // 基础分数
  
  // 人脸特征检测 - 基于肤色区域分布
  // 1. 中心区域权重更高（人脸通常在中心）
  const centerWeight = 1.5;
  const centerX = 1, centerY = 1; // 3x3网格的中心
  
  // 2. 计算加权的区域肤色分数
  let weightedRegionScore = 0;
  let totalWeight = 0;
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      // 计算与中心的距离作为权重
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const weight = 1 / (1 + distance) * (distance < 1 ? centerWeight : 1);
      
      // 计算该区域的肤色比例
      const regionRatio = gridCounts[y][x] > 0 ? gridScores[y][x] / gridCounts[y][x] : 0;
      
      weightedRegionScore += regionRatio * weight;
      totalWeight += weight;
    }
  }
  
  // 标准化加权分数
  const normalizedRegionScore = totalWeight > 0 ? weightedRegionScore / totalWeight : 0;
  
  // 3. 检测人脸特征的可能性 - 基于区域分布模式
  // 人脸通常在上半部分有较高的肤色比例
  const topHalfSkinRatio = (
    gridScores[0][0] + gridScores[0][1] + gridScores[0][2] +
    gridScores[1][0] + gridScores[1][1] + gridScores[1][2]
  ) / (
    gridCounts[0][0] + gridCounts[0][1] + gridCounts[0][2] +
    gridCounts[1][0] + gridCounts[1][1] + gridCounts[1][2] || 1
  );
  
  // 中心区域通常有更高的肤色比例
  const centerSkinRatio = gridCounts[1][1] > 0 ? gridScores[1][1] / gridCounts[1][1] : 0;
  
  // 检测面部对称性 - 左右区域肤色比例相近
  const leftSkinRatio = (
    gridScores[0][0] + gridScores[1][0] + gridScores[2][0]
  ) / (
    gridCounts[0][0] + gridCounts[1][0] + gridCounts[2][0] || 1
  );
  
  const rightSkinRatio = (
    gridScores[0][2] + gridScores[1][2] + gridScores[2][2]
  ) / (
    gridCounts[0][2] + gridCounts[1][2] + gridCounts[2][2] || 1
  );
  
  // 对称性分数 - 左右肤色比例差异越小，对称性越高
  const symmetryScore = 1 - Math.min(1, Math.abs(leftSkinRatio - rightSkinRatio) * 3);
  
  // 4. 综合多种特征，计算最终的人脸分数
  // 肤色比例、区域分布、对称性综合评分
  const faceScore = (
    normalizedRegionScore * 0.4 + // 区域分布权重
    centerSkinRatio * 0.3 + // 中心区域肤色权重
    topHalfSkinRatio * 0.2 + // 上半部分肤色权重
    symmetryScore * 0.1 // 对称性权重
  );
  
  // 5. 结合基础人物分数和人脸分数
  // 如果检测到较强的人脸特征，提升总分
  if (faceScore > 0.4) {
    peopleScore = Math.max(peopleScore, faceScore);
  }
  
  // 应用非线性变换，使高分更突出
  peopleScore = Math.pow(peopleScore, 0.8);
  
  return peopleScore;
}

// 生成边缘图 - 用于高级分析
function generateEdgeMap(imageData: ImageData, width: number, height: number, sampleRate: number = 2): Uint8Array {
  const edgeMap = new Uint8Array(Math.ceil(width / sampleRate) * Math.ceil(height / sampleRate));
  const data = imageData.data;
  
  let mapIndex = 0;
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      // 检测边缘
      let isEdge = false;
      
      // 检查右边像素
      if (x + sampleRate < width) {
        const rightOffset = pixelOffset + (sampleRate * 4);
        if (rightOffset < data.length) {
          const currentBrightness = 
            0.299 * data[pixelOffset] + 
            0.587 * data[pixelOffset + 1] + 
            0.114 * data[pixelOffset + 2];
          
          const rightBrightness = 
            0.299 * data[rightOffset] + 
            0.587 * data[rightOffset + 1] + 
            0.114 * data[rightOffset + 2];
            
          if (Math.abs(currentBrightness - rightBrightness) > 30) {
            isEdge = true;
          }
        }
      }
      
      // 检查下方像素
      if (!isEdge && y + sampleRate < height) {
        const downOffset = pixelOffset + (width * sampleRate * 4);
        if (downOffset < data.length) {
          const currentBrightness = 
            0.299 * data[pixelOffset] + 
            0.587 * data[pixelOffset + 1] + 
            0.114 * data[pixelOffset + 2];
            
          const downBrightness = 
            0.299 * data[downOffset] + 
            0.587 * data[downOffset + 1] + 
            0.114 * data[downOffset + 2];
            
          if (Math.abs(currentBrightness - downBrightness) > 30) {
            isEdge = true;
          }
        }
      }
      
      edgeMap[mapIndex++] = isEdge ? 255 : 0;
    }
  }
  
  return edgeMap;
}

// 分析颜色分布
function analyzeColorProfile(imageData: ImageData, sampleRate: number = 4): {dominantColors: number[], colorVariety: number} {
  const data = imageData.data;
  const colorHistogram: {[key: string]: number} = {};
  let totalSamples = 0;
  
  // 采样计算颜色分布
  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    if (i >= data.length - 4) break;
    
    const r = Math.floor(data[i] / 32) * 32;     // 量化为8个区间
    const g = Math.floor(data[i+1] / 32) * 32;
    const b = Math.floor(data[i+2] / 32) * 32;
    
    const colorKey = `${r},${g},${b}`;
    colorHistogram[colorKey] = (colorHistogram[colorKey] || 0) + 1;
    totalSamples++;
  }
  
  // 排序找出主要颜色
  const sortedColors = Object.entries(colorHistogram)
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({
      color,
      percentage: count / totalSamples
    }));
  
  // 提取前5个主要颜色的百分比
  const dominantColors = sortedColors
    .slice(0, 5)
    .map(entry => entry.percentage);
    
  // 计算颜色多样性 (熵)
  let entropy = 0;
  for (const color of Object.values(colorHistogram)) {
    const p = color / totalSamples;
    entropy -= p * Math.log2(p);
  }
  
  // 标准化熵值到0-1范围
  const normalizedEntropy = Math.min(1, entropy / 3);
  
  return {
    dominantColors,
    colorVariety: normalizedEntropy
  };
}

// 检测空镜头、纯色背景和转场
function detectEmptyFrame(imageData: ImageData, sampleRate: number = 2): number {
  const { data, width, height } = imageData;
  
  // 分析特征
  const features = {
    colorDiversity: 0,       // 颜色多样性
    dominantColorRatio: 0,   // 主色占比
    edgeDensity: 0,          // 边缘密度
    contentDistribution: 0,  // 内容分布均匀性
    brightnessDistribution: 0, // 亮度分布
    blurScore: 0,            // 模糊度
    gradientScore: 0         // 渐变特征
  };
  
  // 1. 颜色分析
  const colorHistogram: {[key: string]: number} = {};
  let totalSamples = 0;
  
  // 采样计算颜色分布
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      const r = Math.floor(data[pixelOffset] / 16) * 16;     // 量化为16个区间
      const g = Math.floor(data[pixelOffset + 1] / 16) * 16;
      const b = Math.floor(data[pixelOffset + 2] / 16) * 16;
      
      const colorKey = `${r},${g},${b}`;
      colorHistogram[colorKey] = (colorHistogram[colorKey] || 0) + 1;
      totalSamples++;
    }
  }
  
  // 排序找出主要颜色
  const sortedColors = Object.entries(colorHistogram)
    .sort((a, b) => b[1] - a[1]);
  
  // 计算主色占比
  if (sortedColors.length > 0) {
    features.dominantColorRatio = sortedColors[0][1] / totalSamples;
  }
  
  // 计算颜色多样性 (熵)
  let entropy = 0;
  for (const color of Object.values(colorHistogram)) {
    const p = color / totalSamples;
    entropy -= p * Math.log2(p);
  }
  
  // 标准化熵值到0-1范围 (值越低表示颜色多样性越低)
  features.colorDiversity = Math.min(1, entropy / 4);
  
  // 2. 边缘密度分析
  let edgeCount = 0;
  
  for (let y = 0; y < height; y += sampleRate) {
    const rowOffset = y * width * 4;
    let lastBrightness = -1;
    
    for (let x = 0; x < width; x += sampleRate) {
      const pixelOffset = rowOffset + (x * 4);
      if (pixelOffset >= data.length - 4) continue;
      
      const r = data[pixelOffset];
      const g = data[pixelOffset + 1];
      const b = data[pixelOffset + 2];
      
      // 计算亮度
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // 检测水平边缘
      if (lastBrightness >= 0) {
        if (Math.abs(brightness - lastBrightness) > 20) {
          edgeCount++;
        }
      }
      
      lastBrightness = brightness;
    }
  }
  
  // 计算边缘密度 (值越低表示边缘越少)
  features.edgeDensity = Math.min(1, edgeCount / (totalSamples * 0.1));
  
  // 3. 内容分布分析 - 将图像划分为3x3网格
  const gridSize = 3;
  const gridContent: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  const gridSamples: number[][] = Array(gridSize).fill(0).map(() => Array(gridSize).fill(0));
  
  for (let y = 0; y < height; y += sampleRate) {
    for (let x = 0; x < width; x += sampleRate) {
      const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      // 计算网格位置
      const gridX = Math.min(gridSize - 1, Math.floor(x / width * gridSize));
      const gridY = Math.min(gridSize - 1, Math.floor(y / height * gridSize));
      
      // 检测该点是否有内容 (简化为边缘检测)
      if (x > 0 && y > 0) {
        const r = data[pixelOffset];
        const g = data[pixelOffset + 1];
        const b = data[pixelOffset + 2];
        
        const leftOffset = pixelOffset - 4;
        const topOffset = pixelOffset - (width * 4);
        
        if (leftOffset >= 0 && topOffset >= 0) {
          const currentBrightness = 0.299 * r + 0.587 * g + 0.114 * b;
          
          const leftBrightness = 
            0.299 * data[leftOffset] + 
            0.587 * data[leftOffset + 1] + 
            0.114 * data[leftOffset + 2];
            
          const topBrightness = 
            0.299 * data[topOffset] + 
            0.587 * data[topOffset + 1] + 
            0.114 * data[topOffset + 2];
          
          // 如果与左侧或上方像素有明显差异，认为有内容
          if (Math.abs(currentBrightness - leftBrightness) > 20 || 
              Math.abs(currentBrightness - topBrightness) > 20) {
            gridContent[gridY][gridX]++;
          }
        }
      }
      
      gridSamples[gridY][gridX]++;
    }
  }
  
  // 计算内容分布均匀性
  let contentVariance = 0;
  const gridContentRatios = [];
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (gridSamples[y][x] > 0) {
        const ratio = gridContent[y][x] / gridSamples[y][x];
        gridContentRatios.push(ratio);
      }
    }
  }
  
  // 计算内容分布的变异系数
  if (gridContentRatios.length > 0) {
    const avg = gridContentRatios.reduce((sum, val) => sum + val, 0) / gridContentRatios.length;
    if (avg > 0) {
      const variance = gridContentRatios.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / gridContentRatios.length;
      const stdDev = Math.sqrt(variance);
      features.contentDistribution = Math.min(1, stdDev / avg);
    }
  }
  
  // 4. 亮度分布分析
  const brightnessHistogram = new Array(10).fill(0);
  
  for (let i = 0; i < data.length; i += 4 * sampleRate) {
    if (i >= data.length - 4) break;
    
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    const binIndex = Math.min(9, Math.floor(brightness / 25.6)); // 0-255 -> 0-9
    brightnessHistogram[binIndex]++;
  }
  
  // 标准化亮度直方图
  const totalBrightnessSamples = brightnessHistogram.reduce((sum, val) => sum + val, 0);
  const normalizedBrightnessHistogram = brightnessHistogram.map(count => count / totalBrightnessSamples);
  
  // 计算亮度分布的均匀性 - 使用熵
  let brightnessEntropy = 0;
  for (const p of normalizedBrightnessHistogram) {
    if (p > 0) {
      brightnessEntropy -= p * Math.log2(p);
    }
  }
  
  // 标准化亮度熵 (值越低表示亮度分布越不均匀)
  features.brightnessDistribution = Math.min(1, brightnessEntropy / Math.log2(10));
  
  // 5. 模糊度检测 - 使用拉普拉斯算子的简化版本
  let sharpnessScore = 0;
  let sharpnessCount = 0;
  
  for (let y = 1; y < height - 1; y += sampleRate) {
    for (let x = 1; x < width - 1; x += sampleRate) {
      const centerOffset = (y * width + x) * 4;
      if (centerOffset >= data.length - 4) continue;
      
      const leftOffset = ((y) * width + (x - 1)) * 4;
      const rightOffset = ((y) * width + (x + 1)) * 4;
      const topOffset = ((y - 1) * width + (x)) * 4;
      const bottomOffset = ((y + 1) * width + (x)) * 4;
      
      if (leftOffset < 0 || rightOffset >= data.length || 
          topOffset < 0 || bottomOffset >= data.length) continue;
      
      // 计算中心像素亮度
      const centerBrightness = 
        0.299 * data[centerOffset] + 
        0.587 * data[centerOffset + 1] + 
        0.114 * data[centerOffset + 2];
      
      // 计算周围像素亮度
      const leftBrightness = 
        0.299 * data[leftOffset] + 
        0.587 * data[leftOffset + 1] + 
        0.114 * data[leftOffset + 2];
        
      const rightBrightness = 
        0.299 * data[rightOffset] + 
        0.587 * data[rightOffset + 1] + 
        0.114 * data[rightOffset + 2];
        
      const topBrightness = 
        0.299 * data[topOffset] + 
        0.587 * data[topOffset + 1] + 
        0.114 * data[topOffset + 2];
        
      const bottomBrightness = 
        0.299 * data[bottomOffset] + 
        0.587 * data[bottomOffset + 1] + 
        0.114 * data[bottomOffset + 2];
      
      // 简化的拉普拉斯算子
      const laplacian = Math.abs(4 * centerBrightness - leftBrightness - rightBrightness - topBrightness - bottomBrightness);
      sharpnessScore += laplacian;
      sharpnessCount++;
    }
  }
  
  // 计算平均锐度 (值越低表示越模糊)
  if (sharpnessCount > 0) {
    const avgSharpness = sharpnessScore / sharpnessCount;
    features.blurScore = Math.min(1, avgSharpness / 50);
  }
  
  // 6. 渐变检测 - 检查亮度是否线性变化
  let gradientScore = 0;
  
  // 水平方向渐变检测
  for (let y = 0; y < height; y += sampleRate * 2) {
    const brightnessSamples = [];
    
    for (let x = 0; x < width; x += sampleRate * 2) {
      const pixelOffset = (y * width + x) * 4;
      if (pixelOffset >= data.length - 4) continue;
      
      const r = data[pixelOffset];
      const g = data[pixelOffset + 1];
      const b = data[pixelOffset + 2];
      
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      brightnessSamples.push(brightness);
    }
    
    // 检测线性变化
    if (brightnessSamples.length > 5) {
      let linearityScore = 0;
      
      // 计算一阶差分
      const diffs = [];
      for (let i = 1; i < brightnessSamples.length; i++) {
        diffs.push(brightnessSamples[i] - brightnessSamples[i-1]);
      }
      
      // 计算差分的标准差 (值越小表示越线性)
      const avgDiff = diffs.reduce((sum, val) => sum + val, 0) / diffs.length;
      const diffVariance = diffs.reduce((sum, val) => sum + Math.pow(val - avgDiff, 2), 0) / diffs.length;
      const diffStdDev = Math.sqrt(diffVariance);
      
      // 标准化线性度分数
      if (Math.abs(avgDiff) > 0.5) { // 有明显的亮度变化
        linearityScore = Math.max(0, 1 - (diffStdDev / Math.abs(avgDiff) / 0.5));
        gradientScore = Math.max(gradientScore, linearityScore);
      }
    }
  }
  
  features.gradientScore = gradientScore;
  
  // 7. 综合评分 - 空镜头可能性
  // 权重可以根据实际效果调整
  const emptyFrameScore = 
    (1 - features.colorDiversity) * 0.25 +      // 颜色多样性低
    features.dominantColorRatio * 0.25 +        // 主色占比高
    (1 - features.edgeDensity) * 0.2 +          // 边缘密度低
    features.contentDistribution * 0.1 +        // 内容分布不均匀
    (1 - features.brightnessDistribution) * 0.1 + // 亮度分布不均匀
    (1 - features.blurScore) * 0.05 +           // 模糊度高
    features.gradientScore * 0.05;              // 渐变特征明显
  
  return Math.min(1, Math.max(0, emptyFrameScore));
}

// 声明类型，使TypeScript在Web Worker中正常工作
export {}; 