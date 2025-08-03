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
    keyInformation: {
      entities: {
        people: string[];
        places: string[];
        terms: string[];
      };
      keywords: string[];
      summary: string;
    };
    structuredContent: {
      markdown: string;
      srt: string;
      text: string;
    };
    combinedSummary: string;
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
    console.warn('清理临时文件失败:', error);
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
    console.error('ffmpeg不可用:', error);
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
    console.log('开始从URL提取音频...');
    const command = `ffmpeg -i "${videoUrl}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${audioPath}"`;
    const { stdout, stderr } = await execAsync(command, {
      timeout: 1800000, // 30分钟超时，支持长视频
      maxBuffer: 1024 * 1024 * 50 // 50MB buffer，支持更大的音频文件
    });

    console.log('音频提取完成');

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
    console.error('音频提取失败:', error);

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

// 关键信息抽取
async function extractKeyInformation(text: string, apiKey: string): Promise<{
  entities: {
    people: string[];
    places: string[];
    terms: string[];
  };
  keywords: string[];
  summary: string;
}> {
  try {
    const prompt = `请分析以下文本，提取关键信息：

文本内容：
${text}

请按照以下JSON格式返回结果：
{
  "entities": {
    "people": ["人名1", "人名2"],
    "places": ["地点1", "地点2"],
    "terms": ["专业术语1", "专业术语2"]
  },
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "summary": "简要总结"
}

要求：
1. 提取所有出现的人名、地点名、专业术语
2. 识别5-10个最重要的关键词
3. 生成50字以内的简要总结
4. 严格按照JSON格式返回，不要添加其他内容`;

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
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`关键信息抽取API调用失败: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content || '{}';

    try {
      const parsed = JSON.parse(content);
      return {
        entities: {
          people: parsed.entities?.people || [],
          places: parsed.entities?.places || [],
          terms: parsed.entities?.terms || []
        },
        keywords: parsed.keywords || [],
        summary: parsed.summary || '无法生成摘要'
      };
    } catch (parseError) {
      console.warn('解析关键信息抽取结果失败，使用默认值:', parseError);
      return {
        entities: { people: [], places: [], terms: [] },
        keywords: [],
        summary: '关键信息抽取失败'
      };
    }
  } catch (error) {
    console.error('关键信息抽取失败:', error);
    return {
      entities: { people: [], places: [], terms: [] },
      keywords: [],
      summary: '关键信息抽取失败'
    };
  }
}

// 语音转文字（使用硅基流动SenseVoice-Small语音识别）
async function transcribeAudio(audioPath: string, apiKey: string, audioDuration: number = 0): Promise<{
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
    formData.append('model', 'FunAudioLLM/SenseVoiceSmall');
    formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'audio.wav');

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

    console.log(`语音识别完成，文本长度: ${transcriptText.length}字符`);

    // 改进的分段处理，根据实际音频时长计算时间戳
    const sentences = transcriptText.split(/[。！？.!?]+/).filter(s => s.trim().length > 0);
    const totalDuration = audioDuration > 0 ? audioDuration : sentences.length * 5; // 如果没有时长信息，估算
    const avgSentenceDuration = totalDuration / sentences.length;

    const segments = sentences.map((sentence, index) => ({
      start: Math.round(index * avgSentenceDuration * 100) / 100,
      end: Math.round((index + 1) * avgSentenceDuration * 100) / 100,
      text: sentence.trim(),
      confidence: 0.8 // SenseVoice通常有较高的准确率
    }));

    return {
      text: transcriptText,
      segments
    };
  } catch (error) {
    console.error('语音转文字失败:', error);

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

// 生成SRT格式的音频内容（包含关键信息）
async function generateStructuredContent(
  audioTranscriptResult: { text: string; segments: any[] },
  videoInfo: { title: string; duration: number; url: string },
  keyInfo: any
): Promise<{
  srt: string;
}> {
  const audioSegments = audioTranscriptResult.segments;

  // 构建关键信息字符串
  const keyInfoParts = [];

  if (keyInfo.entities.people.length > 0) {
    keyInfoParts.push(`人物: ${keyInfo.entities.people.join('、')}`);
  }

  if (keyInfo.entities.places.length > 0) {
    keyInfoParts.push(`地点: ${keyInfo.entities.places.join('、')}`);
  }

  if (keyInfo.entities.terms.length > 0) {
    keyInfoParts.push(`术语: ${keyInfo.entities.terms.join('、')}`);
  }

  if (keyInfo.keywords.length > 0) {
    keyInfoParts.push(`关键词: ${keyInfo.keywords.join('、')}`);
  }

  const keyInfoText = keyInfoParts.length > 0
    ? `【关键信息】${keyInfoParts.join(' | ')}`
    : '【关键信息】暂无识别到的关键信息';

  // 生成SRT格式，第一行为关键信息
  const srtLines = [];

  // 第一行：关键信息（时间从0开始到第一个音频段开始）
  const firstSegmentStart = audioSegments.length > 0 ? audioSegments[0].start : 5;
  srtLines.push(
    '1',
    `${formatSRTTime(0)} --> ${formatSRTTime(Math.max(firstSegmentStart - 0.1, 2))}`,
    keyInfoText,
    ''
  );

  // 后续行：音频转录内容
  audioSegments.forEach((segment, index) => {
    const srtIndex = index + 2; // 从2开始，因为第1行是关键信息
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

// 生成综合总结
async function generateCombinedSummary(
  audioTranscript: string,
  keyInfo: any,
  apiKey: string
): Promise<string> {
  try {
    const prompt = `基于以下音频分析结果，生成一个简洁的分集简介：

音频转录内容：
${audioTranscript}

关键信息：
人物: ${keyInfo.entities.people.join(', ') || '无'}
地点: ${keyInfo.entities.places.join(', ') || '无'}
术语: ${keyInfo.entities.terms.join(', ') || '无'}
关键词: ${keyInfo.keywords.join(', ') || '无'}

内容摘要：
${keyInfo.summary}

请生成一个120-200字的分集简介，要求：
1. 基于音频转录内容作为主要信息源
2. 结合关键信息和摘要
3. 突出主要情节和看点
4. 语言生动有趣，符合影视剧简介风格
5. 避免剧透关键结局
6. 重点体现对话和情节发展`;

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
    
    // 1. 直接从URL提取音频
    console.log('开始从URL提取音频...');
    const audioInfo = await extractAudioFromUrl(videoUrl, sessionId);

    // 2. 语音转文字
    console.log('进行语音识别...');
    const audioTranscriptResult = await transcribeAudio(audioInfo.audioPath, apiKey, audioInfo.duration);
    const audioTranscript = audioTranscriptResult.text;

    // 3. 关键信息抽取
    console.log('提取关键信息...');
    const keyInfo = await extractKeyInformation(audioTranscript, apiKey);

    // 4. 生成综合总结和结构化内容
    console.log('生成综合总结...');
    const videoInfo = {
      title: audioInfo.title,
      duration: audioInfo.duration,
      url: videoUrl
    };

    const [combinedSummary, structuredContentResult] = await Promise.all([
      generateCombinedSummary(audioTranscript, keyInfo, apiKey),
      generateStructuredContent(audioTranscriptResult, videoInfo, keyInfo)
    ]);

    // 5. 构建返回结果
    const result: VideoAnalysisResult = {
      success: true,
      data: {
        videoInfo,
        audioAnalysis: {
          transcript: audioTranscript,
          segments: audioTranscriptResult.segments,
          summary: audioTranscript.length > 200 ? audioTranscript.substring(0, 200) + '...' : audioTranscript
        },
        keyInformation: keyInfo,
        structuredContent: {
          srt: structuredContentResult.srt,
          markdown: '', // 不再生成
          text: ''      // 不再生成
        },
        combinedSummary
      }
    };

    // 6. 立即清理临时文件（处理完成后不再需要）
    await cleanupTempFiles(sessionId);
    console.log('临时音频文件已清理');

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
