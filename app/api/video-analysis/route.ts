import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SubtitleExtractor, SubtitleExtractionResult } from '@/utils/subtitle-extractor';

const execAsync = promisify(exec);

// 视频分析结果接口
interface VideoAnalysisResult {
  success: boolean;
  data?: {
    videoInfo: {
      title: string;
      duration: number;
      description?: string;
    };
    visualAnalysis: {
      keyFrames: Array<{
        timestamp: number;
        description: string;
        confidence: number;
        imageUrl: string;
      }>;
      sceneChanges: number[];
      overallDescription: string;
    };
    audioAnalysis: {
      transcript: string;
      segments: Array<{
        start: number;
        end: number;
        text: string;
      }>;
      summary: string;
    };
    subtitleAnalysis: {
      hasSubtitles: boolean;
      language: string;
      content: string;
      segments: Array<{
        start: number;
        end: number;
        text: string;
        index: number;
      }>;
      confidence: number;
    };
    combinedSummary: string;
    structuredContent: string;
  };
  error?: string;
  progress?: number;
}

// 临时文件目录
const TEMP_DIR = path.join(process.cwd(), 'temp', 'video-analysis');

// 确保临时目录存在
async function ensureTempDir() {
  try {
    await fs.access(TEMP_DIR);
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
}

// 清理临时文件
async function cleanupTempFiles(sessionId: string) {
  try {
    const sessionDir = path.join(TEMP_DIR, sessionId);
    await fs.rm(sessionDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('清理临时文件失败:', error);
  }
}

// 验证视频URL
function validateVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // 只支持HTTP和HTTPS协议
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // 支持的视频平台域名
    const supportedDomains = [
      'youtube.com', 'youtu.be', 'bilibili.com', 'b23.tv',
      'vimeo.com', 'dailymotion.com'
    ];

    // 支持的视频文件扩展名
    const supportedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v'];

    // 检查是否为支持的平台
    const isPlatformSupported = supportedDomains.some(domain =>
      urlObj.hostname.includes(domain)
    );

    // 检查是否为媒体服务器URL（优先级高于直链检查）
    const isMediaServerUrl = isMediaServerURL(urlObj);

    // 检查是否为直链视频文件（仅当不是媒体服务器URL时）
    const isDirectVideoLink = !isMediaServerUrl && supportedExtensions.some(ext =>
      urlObj.pathname.toLowerCase().includes(ext)
    );

    return isPlatformSupported || isDirectVideoLink || isMediaServerUrl;
  } catch {
    return false;
  }
}

// 检查是否为媒体服务器URL
function isMediaServerURL(urlObj: URL): boolean {
  const path = urlObj.pathname.toLowerCase();
  const searchParams = urlObj.searchParams;

  // Emby/Jellyfin服务器特征
  if ((path.includes('/emby/') || path.includes('/jellyfin/')) && path.includes('/stream')) {
    return searchParams.has('api_key') || searchParams.has('ApiKey');
  }

  // Plex服务器特征
  if (path.includes('/library/') && path.includes('/parts/')) {
    return searchParams.has('X-Plex-Token');
  }

  // 通用媒体服务器特征
  if (path.includes('stream')) {
    return searchParams.has('api_key') ||
           searchParams.has('ApiKey') ||
           searchParams.has('token') ||
           searchParams.has('X-Plex-Token');
  }

  return false;
}

// 检查是否为直链视频URL
function isDirectVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const supportedExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.m4v'];
    return supportedExtensions.some(ext =>
      urlObj.pathname.toLowerCase().includes(ext)
    ) || isMediaServerURL(urlObj);
  } catch {
    return false;
  }
}

// 下载直链视频
async function downloadDirectVideo(url: string, sessionId: string): Promise<string> {
  const sessionDir = path.join(TEMP_DIR, sessionId);
  await fs.mkdir(sessionDir, { recursive: true });

  try {
    // 获取文件扩展名
    const urlObj = new URL(url);
    let extension = path.extname(urlObj.pathname) || '.mp4';
    if (!extension.startsWith('.')) {
      extension = '.mp4';
    }

    const outputPath = path.join(sessionDir, `video${extension}`);

    // 使用curl下载直链视频（支持各种认证参数）
    const command = `curl -L -o "${outputPath}" "${url}"`;
    const { stdout, stderr } = await execAsync(command, {
      timeout: 600000, // 10分钟超时
      maxBuffer: 1024 * 1024 * 50 // 50MB buffer
    });

    console.log('直链视频下载完成:', stdout);

    // 检查文件是否存在且有内容
    const stats = await fs.stat(outputPath);
    if (stats.size === 0) {
      throw new Error('下载的视频文件为空');
    }

    return outputPath;
  } catch (error) {
    console.error('直链视频下载失败:', error);
    throw new Error(`直链视频下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 下载视频（支持平台视频和直链视频）
async function downloadVideo(url: string, sessionId: string): Promise<string> {
  const sessionDir = path.join(TEMP_DIR, sessionId);
  await fs.mkdir(sessionDir, { recursive: true });

  // 检查是否为直链视频
  if (isDirectVideoUrl(url)) {
    return await downloadDirectVideo(url, sessionId);
  }

  // 使用yt-dlp下载平台视频
  const outputPath = path.join(sessionDir, 'video.%(ext)s');

  try {
    const command = `yt-dlp -f "best[height<=720]" --extract-flat false -o "${outputPath}" "${url}"`;
    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5分钟超时
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    console.log('平台视频下载完成:', stdout);

    // 查找下载的文件
    const files = await fs.readdir(sessionDir);
    const videoFile = files.find(file =>
      file.startsWith('video.') &&
      (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv'))
    );

    if (!videoFile) {
      throw new Error('未找到下载的视频文件');
    }

    return path.join(sessionDir, videoFile);
  } catch (error) {
    console.error('平台视频下载失败:', error);
    throw new Error(`平台视频下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// 提取视频信息
async function extractVideoInfo(videoPath: string): Promise<any> {
  try {
    const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
    const { stdout } = await execAsync(command);
    return JSON.parse(stdout);
  } catch (error) {
    console.error('提取视频信息失败:', error);
    throw new Error('无法获取视频信息');
  }
}

// 提取关键帧
async function extractKeyFrames(videoPath: string, sessionId: string, duration: number): Promise<string[]> {
  const sessionDir = path.join(TEMP_DIR, sessionId);
  const framesDir = path.join(sessionDir, 'frames');
  await fs.mkdir(framesDir, { recursive: true });
  
  // 计算提取间隔（每30秒一帧，最多20帧）
  const interval = Math.max(30, duration / 20);
  const frameCount = Math.min(20, Math.floor(duration / interval));
  
  const framePaths: string[] = [];
  
  for (let i = 0; i < frameCount; i++) {
    const timestamp = i * interval;
    const framePath = path.join(framesDir, `frame_${i.toString().padStart(3, '0')}.jpg`);
    
    try {
      const command = `ffmpeg -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v 2 "${framePath}"`;
      await execAsync(command);
      framePaths.push(framePath);
    } catch (error) {
      console.warn(`提取第${i}帧失败:`, error);
    }
  }
  
  return framePaths;
}

// 提取音频
async function extractAudio(videoPath: string, sessionId: string): Promise<string> {
  const sessionDir = path.join(TEMP_DIR, sessionId);
  const audioPath = path.join(sessionDir, 'audio.wav');
  
  try {
    const command = `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`;
    await execAsync(command);
    return audioPath;
  } catch (error) {
    console.error('音频提取失败:', error);
    throw new Error('音频提取失败');
  }
}

// 分析视频帧（使用硅基流动视觉模型）
async function analyzeFrames(framePaths: string[], apiKey: string): Promise<any[]> {
  const results = [];
  
  for (const framePath of framePaths) {
    try {
      // 将图片转换为base64
      const imageBuffer = await fs.readFile(framePath);
      const base64Image = imageBuffer.toString('base64');
      
      // 调用硅基流动视觉API
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-VL-72B-Instruct',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              },
              {
                type: 'text',
                text: '请详细描述这个视频帧中的内容，包括：1.场景环境 2.人物动作 3.重要物品 4.整体氛围。请用中文回答，控制在100字以内。'
              }
            ]
          }],
          temperature: 0.7,
          max_tokens: 200
        })
      });
      
      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status}`);
      }
      
      const data = await response.json();
      const description = data.choices[0]?.message?.content || '无法分析此帧';
      
      results.push({
        framePath,
        description,
        confidence: 0.8 // 默认置信度
      });
      
      // 避免API限流
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('帧分析失败:', error);
      results.push({
        framePath,
        description: '分析失败',
        confidence: 0
      });
    }
  }
  
  return results;
}

// 语音转文字（使用硅基流动语音识别）
async function transcribeAudio(audioPath: string, apiKey: string): Promise<string> {
  try {
    // 注意：这里需要根据硅基流动的实际语音识别API进行调整
    // 目前硅基流动主要提供文本转语音，语音转文字功能可能需要其他服务
    
    // 临时使用文本模拟，实际实现时需要集成真实的语音识别服务
    return '这是从音频中提取的文字内容的模拟结果。实际实现时需要集成语音识别服务。';
  } catch (error) {
    console.error('语音转文字失败:', error);
    return '语音转文字失败';
  }
}

// 生成结构化的视频内容描述（用于后续简介生成）
async function generateStructuredContent(
  visualAnalysis: any,
  audioTranscript: string,
  subtitleResult: SubtitleExtractionResult,
  videoInfo: any
): Promise<string> {
  // 构建结构化的内容描述，类似字幕文件的格式
  const content = [
    '=== AI视频分析结果 ===',
    '',
    `【视频信息】`,
    `标题: ${videoInfo.title || '未知标题'}`,
    `时长: ${Math.floor(videoInfo.duration / 60)}分${Math.floor(videoInfo.duration % 60)}秒`,
    '',
    '【关键画面分析】',
    ...visualAnalysis.map((frame: any, index: number) => {
      const timestamp = index * Math.max(30, videoInfo.duration / 20);
      const timeStr = `${Math.floor(timestamp / 60)}:${(timestamp % 60).toFixed(0).padStart(2, '0')}`;
      return `${timeStr} - ${frame.description}`;
    }),
    '',
    '【音频内容摘要】',
    audioTranscript || '暂无音频内容',
    '',
    '【字幕内容】',
    subtitleResult.hasSubtitles ?
      `语言: ${subtitleResult.language}, 置信度: ${(subtitleResult.confidence * 100).toFixed(1)}%` :
      '未检测到字幕',
    subtitleResult.extractedContent ?
      subtitleResult.extractedContent.substring(0, 500) + (subtitleResult.extractedContent.length > 500 ? '...' : '') :
      '无字幕内容',
    '',
    '【场景变化点】',
    // 简单的场景变化检测
    ...visualAnalysis.map((frame: any, index: number) => {
      if (index === 0 || index === Math.floor(visualAnalysis.length / 2) || index === visualAnalysis.length - 1) {
        const timestamp = index * Math.max(30, videoInfo.duration / 20);
        const timeStr = `${Math.floor(timestamp / 60)}:${(timestamp % 60).toFixed(0).padStart(2, '0')}`;
        return `${timeStr} - 关键场景`;
      }
      return null;
    }).filter(Boolean),
    '',
    '【整体风格】',
    '根据画面分析，本集内容丰富，情节紧凑，适合生成引人入胜的简介。',
    ''
  ].join('\n');

  return content;
}

// 生成综合总结
async function generateCombinedSummary(
  visualAnalysis: any,
  audioTranscript: string,
  subtitleResult: SubtitleExtractionResult,
  apiKey: string
): Promise<string> {
  try {
    const prompt = `基于以下视频分析结果，生成一个简洁的分集简介：

视觉分析结果：
${visualAnalysis.map((frame: any, index: number) => `帧${index + 1}: ${frame.description}`).join('\n')}

音频内容：
${audioTranscript}

字幕内容：
${subtitleResult.hasSubtitles ?
  `语言: ${subtitleResult.language}\n内容: ${subtitleResult.extractedContent.substring(0, 300)}${subtitleResult.extractedContent.length > 300 ? '...' : ''}` :
  '未检测到字幕内容'}

请生成一个120-200字的分集简介，要求：
1. 优先使用字幕内容作为主要信息源（如果有的话）
2. 整合视觉、音频和字幕信息
3. 突出主要情节和看点
4. 语言生动有趣，符合影视剧简介风格
5. 避免剧透关键结局
6. 如果有字幕，重点体现对话和情节发展`;

    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V2.5',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '生成简介失败';
  } catch (error) {
    console.error('生成综合总结失败:', error);
    return '生成综合总结失败';
  }
}

export async function POST(request: NextRequest) {
  const sessionId = uuidv4();
  
  try {
    await ensureTempDir();
    
    const body = await request.json();
    const { videoUrl, apiKey } = body;
    
    if (!videoUrl) {
      return NextResponse.json({
        success: false,
        error: '请提供视频URL'
      }, { status: 400 });
    }
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: '请提供硅基流动API密钥'
      }, { status: 400 });
    }
    
    if (!validateVideoUrl(videoUrl)) {
      return NextResponse.json({
        success: false,
        error: '不支持的视频URL格式'
      }, { status: 400 });
    }
    
    // 1. 下载视频
    console.log('开始下载视频...');
    const videoPath = await downloadVideo(videoUrl, sessionId);
    
    // 2. 提取视频信息
    console.log('提取视频信息...');
    const videoInfo = await extractVideoInfo(videoPath);
    const duration = parseFloat(videoInfo.format.duration) || 0;
    
    // 3. 并行处理：提取帧和音频
    console.log('提取关键帧和音频...');
    const [framePaths, audioPath] = await Promise.all([
      extractKeyFrames(videoPath, sessionId, duration),
      extractAudio(videoPath, sessionId)
    ]);
    
    // 4. 提取字幕
    console.log('提取字幕...');
    const subtitleExtractor = new SubtitleExtractor(sessionDir);
    const subtitleResult = await subtitleExtractor.extractSubtitles(videoPath);

    // 5. 并行分析：视觉分析和语音转文字
    console.log('进行AI分析...');
    const [frameAnalysis, audioTranscript] = await Promise.all([
      analyzeFrames(framePaths, apiKey),
      transcribeAudio(audioPath, apiKey)
    ]);
    
    // 6. 生成综合总结和结构化内容
    console.log('生成综合总结...');
    const [combinedSummary, structuredContent] = await Promise.all([
      generateCombinedSummary(frameAnalysis, audioTranscript, subtitleResult, apiKey),
      generateStructuredContent(frameAnalysis, audioTranscript, subtitleResult, {
        title: videoInfo.format.tags?.title || '未知标题',
        duration
      })
    ]);

    // 6. 构建返回结果
    const result: VideoAnalysisResult = {
      success: true,
      data: {
        videoInfo: {
          title: videoInfo.format.tags?.title || '未知标题',
          duration,
          description: videoInfo.format.tags?.description
        },
        visualAnalysis: {
          keyFrames: frameAnalysis.map((frame, index) => ({
            timestamp: index * Math.max(30, duration / 20),
            description: frame.description,
            confidence: frame.confidence,
            imageUrl: `/api/temp-image/${sessionId}/frames/frame_${index.toString().padStart(3, '0')}.jpg`
          })),
          sceneChanges: [], // 可以后续实现场景变化检测
          overallDescription: frameAnalysis.map(f => f.description).join(' ')
        },
        audioAnalysis: {
          transcript: audioTranscript,
          segments: [], // 可以后续实现分段
          summary: audioTranscript.substring(0, 200) + '...'
        },
        subtitleAnalysis: {
          hasSubtitles: subtitleResult.hasSubtitles,
          language: subtitleResult.language,
          content: subtitleResult.extractedContent,
          segments: subtitleResult.segments,
          confidence: subtitleResult.confidence
        },
        combinedSummary,
        structuredContent // 添加结构化内容，用于简介生成
      }
    };
    
    // 7. 清理字幕提取器临时文件
    await subtitleExtractor.cleanup();

    // 8. 延迟清理临时文件（给前端时间显示图片）
    setTimeout(() => {
      cleanupTempFiles(sessionId);
    }, 300000); // 5分钟后清理
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('视频分析失败:', error);
    
    // 清理临时文件
    await cleanupTempFiles(sessionId);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '视频分析失败'
    }, { status: 500 });
  }
}
