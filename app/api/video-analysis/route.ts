import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
// 移除字幕提取器导入，现在只专注于音频分析

const execAsync = promisify(exec);

// 视频分析结果接口（简化为音频分析）
interface VideoAnalysisResult {
  success: boolean;
  data?: {
    videoInfo: {
      title: string;
      duration: number;
      url: string;
    };
    audioAnalysis: {
      transcript: string;
      segments: Array<{
        start: number;
        end: number;
        text: string;
        confidence?: number;
      }>;
      summary: string;
    };
    structuredContent: {
      markdown: string;
      srt: string;
      text: string;
    };
  };
  error?: string;
  progress?: number;
}

// 临时文件目录（使用data文件夹）
const TEMP_DIR = path.join(process.cwd(), 'data', 'temp', 'audio-analysis');

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
    
  }
}

// 简化的URL验证（只需要基本的URL格式验证）
function validateVideoUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // 只支持HTTP和HTTPS协议
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// 移除了视频下载和帧提取相关函数，现在只专注于音频处理

// 检查ffmpeg是否可用
async function checkFFmpegAvailability(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version', { timeout: 5000 });
    return true;
  } catch (error) {
    
    return false;
  }
}

// 直接从URL提取音频（不下载视频文件）
async function extractAudioFromUrl(videoUrl: string, sessionId: string): Promise<{
  audioPath: string;
  duration: number;
  title: string;
}> {
  // 检查ffmpeg是否可用
  const ffmpegAvailable = await checkFFmpegAvailability();
  if (!ffmpegAvailable) {
    throw new Error('ffmpeg未安装或不可用。在Docker环境中，请确保Dockerfile包含ffmpeg安装指令。');
  }

  const sessionDir = path.join(TEMP_DIR, sessionId);
  await fs.mkdir(sessionDir, { recursive: true });

  const audioPath = path.join(sessionDir, 'audio.wav');

  try {
    // 使用ffmpeg直接从URL提取音频，不下载视频文件
    
    const command = `ffmpeg -i "${videoUrl}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`;
    const { stdout, stderr } = await execAsync(command, {
      timeout: 1800000, // 30分钟超时，支持长视频
      maxBuffer: 1024 * 1024 * 50 // 50MB buffer，支持更大的音频文件
    });

    // 获取音频信息
    const probeCommand = `ffprobe -v quiet -print_format json -show_format "${audioPath}"`;
    const { stdout: probeOutput } = await execAsync(probeCommand);
    const audioInfo = JSON.parse(probeOutput);

    const duration = parseFloat(audioInfo.format.duration) || 0;
    const title = audioInfo.format.tags?.title || '未知标题';

    console.log(`音频提取成功 - 时长: ${duration.toFixed(2)}秒 (${Math.floor(duration/60)}分${Math.floor(duration%60)}秒)`);

    return {
      audioPath,
      duration,
      title
    };
  } catch (error) {
    
    // 提供更详细的错误信息
    let errorMessage = '音频提取失败';
    if (error instanceof Error) {
      if (error.message.includes('ffmpeg')) {
        errorMessage = 'ffmpeg执行失败，请检查视频URL是否有效或网络连接是否正常';
      } else if (error.message.includes('timeout')) {
        errorMessage = '音频提取超时，视频可能过长或网络较慢';
      } else {
        errorMessage = `音频提取失败: ${error.message}`;
      }
    }

    throw new Error(errorMessage);
  }
}

// 移除了视觉分析函数，现在只专注于音频分析

// 根据模型获取默认置信度
function getModelConfidence(model: string): number {
  if (model.includes('SenseVoiceLarge')) return 0.9;
  if (model.includes('SenseVoiceSmall')) return 0.8;
  if (model.includes('CosyVoice-300M-SFT')) return 0.85;
  if (model.includes('CosyVoice-300M-Instruct')) return 0.82;
  if (model.includes('CosyVoice-300M')) return 0.75;
  if (model.includes('SpeechT5')) return 0.7;
  return 0.8; // 默认置信度
}

// 语音转文字（使用硅基流动语音识别模型）
async function transcribeAudio(audioPath: string, apiKey: string, audioDuration: number = 0, model: string = 'FunAudioLLM/SenseVoiceSmall'): Promise<{
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
    confidence?: number;
  }>;
}> {
  try {
    // 读取音频文件
    const audioBuffer = await fs.readFile(audioPath);
    const fileSizeMB = audioBuffer.length / (1024 * 1024);

    console.log(`音频文件大小: ${fileSizeMB.toFixed(2)}MB, 时长: ${audioDuration.toFixed(2)}秒`);

    // 检查文件大小限制（硅基流动API通常有25MB限制）
    if (fileSizeMB > 25) {
      console.warn(`音频文件过大 (${fileSizeMB.toFixed(2)}MB)，可能需要分段处理`);
    }

    // 创建FormData
    const formData = new FormData();
    formData.append('model', model);
    formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'audio.wav');

    // 根据模型类型添加优化参数
    if (model.includes('SenseVoice')) {
      // SenseVoice模型支持语言检测和时间戳
      formData.append('language', 'auto'); // 自动检测语言
      formData.append('timestamp_granularities[]', 'segment'); // 获取分段时间戳
    }

    console.log(`使用语音识别模型: ${model}，文件大小: ${fileSizeMB.toFixed(2)}MB`);

    // 调用硅基流动语音识别API，增加超时时间
    const response = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
      signal: AbortSignal.timeout(300000) // 5分钟超时
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`语音识别API调用失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    const transcriptText = result.text || '';

    console.log('API响应结构:', Object.keys(result));

    // 处理不同模型的响应格式
    let segments: Array<{start: number; end: number; text: string; confidence?: number}> = [];

    // 如果API返回了分段信息，优先使用
    if (result.segments && Array.isArray(result.segments)) {
      segments = result.segments.map((segment: any) => ({
        start: segment.start || 0,
        end: segment.end || 0,
        text: segment.text || '',
        confidence: segment.confidence || 0.8
      }));
      
    } else {
      // 回退到基于句子的分段处理
      const sentences = transcriptText.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
      const totalDuration = audioDuration > 0 ? audioDuration : sentences.length * 5;
      const avgSentenceDuration = totalDuration / sentences.length;

      segments = sentences.map((sentence, index) => ({
        start: Math.round(index * avgSentenceDuration * 100) / 100,
        end: Math.round((index + 1) * avgSentenceDuration * 100) / 100,
        text: sentence.trim(),
        confidence: getModelConfidence(model) // 根据模型设置置信度
      }));
      
    }

    return {
      text: transcriptText,
      segments
    };
  } catch (error) {
    
    // 提供更详细的错误信息
    let errorMessage = '语音转文字失败';
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = '语音识别超时，音频文件可能过长或网络较慢';
      } else if (error.message.includes('413') || error.message.includes('too large')) {
        errorMessage = '音频文件过大，请尝试较短的视频片段';
      } else {
        errorMessage = `语音转文字失败: ${error.message}`;
      }
    }

    return {
      text: errorMessage,
      segments: []
    };
  }
}

// 生成SRT格式的音频内容
async function generateStructuredContent(
  audioTranscriptResult: { text: string; segments: any[] },
  videoInfo: { title: string; duration: number; url: string }
): Promise<{
  srt: string;
}> {
  const audioSegments = audioTranscriptResult.segments;

  // 生成SRT格式，直接从音频转录内容开始
  const srtLines = [];

  // 音频转录内容
  audioSegments.forEach((segment, index) => {
    const srtIndex = index + 1; // 从1开始
    const startTime = formatSRTTime(segment.start);
    const endTime = formatSRTTime(segment.end);

    srtLines.push(
      srtIndex.toString(),
      `${startTime} --> ${endTime}`,
      segment.text,
      ''
    );
  });

  const srtContent = srtLines.join('\n');

  return {
    srt: srtContent
  };
}

// SRT时间格式化函数
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export async function POST(request: NextRequest) {
  const sessionId = uuidv4();
  
  try {
    await ensureTempDir();
    
    const body = await request.json();
    const { videoUrl, apiKey, speechRecognitionModel } = body;
    
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
    
    // 1. 直接从URL提取音频
    
    const audioInfo = await extractAudioFromUrl(videoUrl, sessionId);

    // 2. 语音转文字
    
    const selectedModel = speechRecognitionModel || 'FunAudioLLM/SenseVoiceSmall';
    const audioTranscriptResult = await transcribeAudio(audioInfo.audioPath, apiKey, audioInfo.duration, selectedModel);
    const audioTranscript = audioTranscriptResult.text;

    // 3. 生成结构化内容
    
    const videoInfo = {
      title: audioInfo.title,
      duration: audioInfo.duration,
      url: videoUrl
    };

    const structuredContentResult = await generateStructuredContent(audioTranscriptResult, videoInfo);

    // 4. 构建返回结果
    const result: VideoAnalysisResult = {
      success: true,
      data: {
        videoInfo,
        audioAnalysis: {
          transcript: audioTranscript,
          segments: audioTranscriptResult.segments,
          summary: audioTranscript.length > 200 ? audioTranscript.substring(0, 200) + '...' : audioTranscript
        },
        structuredContent: {
          srt: structuredContentResult.srt,
          markdown: '', // 不再生成
          text: ''      // 不再生成
        }
      }
    };

    // 5. 立即清理临时文件（处理完成后不再需要）
    await cleanupTempFiles(sessionId);
    
    return NextResponse.json(result);
    
  } catch (error) {
    
    // 清理临时文件
    await cleanupTempFiles(sessionId);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '视频分析失败'
    }, { status: 500 });
  }
}
