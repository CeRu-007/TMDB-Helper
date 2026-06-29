/**
 * 字幕提取工具类
 * 支持从视频中提取内嵌字幕和外挂字幕文件
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { mediaLogger } from '@/lib/utils/logger';

const execAsync = promisify(exec);

export interface SubtitleTrack {
  index: number;
  language: string;
  title?: string;
  codec: string;
  type: 'embedded' | 'external';
  filePath?: string;
}

export interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
  index: number;
}

export interface SubtitleExtractionResult {
  tracks: SubtitleTrack[];
  segments: SubtitleSegment[];
  totalDuration: number;
  extractedContent: string;
  language: string;
  confidence: number;
}

export class SubtitleExtractor {
  private sessionDir: string;

  constructor(sessionDir: string) {
    this.sessionDir = sessionDir;
  }

  /**
   * 检测视频中的字幕轨道
   */
  async detectSubtitleTracks(videoPath: string): Promise<SubtitleTrack[]> {
    try {
      const command = `ffprobe -v quiet -print_format json -show_streams "${videoPath}"`;
      const { stdout } = await execAsync(command);
      const data = JSON.parse(stdout);

      const subtitleTracks: SubtitleTrack[] = [];

      if (data.streams) {
        data.streams.forEach(
          (
            stream: {
              index: number;
              codec_type: string;
              codec_name: string;
              tags?: { language?: string; title?: string };
            },
            index: number
          ) => {
            if (stream.codec_type === 'subtitle') {
              subtitleTracks.push({
                index: stream.index,
                language: stream.tags?.language || 'unknown',
                title: stream.tags?.title,
                codec: stream.codec_name,
                type: 'embedded',
              });
            }
          }
        );
      }

      mediaLogger.info(
        `[SubtitleExtractor] 检测到 ${subtitleTracks.length} 个字幕轨道: ${videoPath}`
      );
      return subtitleTracks;
    } catch (error) {
      mediaLogger.warn(
        `[SubtitleExtractor] 检测字幕轨道失败: ${videoPath}`,
        error instanceof Error ? error : String(error)
      );
      return [];
    }
  }

  /**
   * 提取内嵌字幕
   */
  async extractEmbeddedSubtitles(videoPath: string, trackIndex?: number): Promise<string | null> {
    try {
      const outputPath = path.join(this.sessionDir, `subtitles_${trackIndex || 0}.srt`);

      // 使用ffmpeg提取字幕
      const streamSelector = trackIndex !== undefined ? `0:s:${trackIndex}` : '0:s:0';
      const command = `ffmpeg -i "${videoPath}" -map ${streamSelector} -c:s srt "${outputPath}"`;

      await execAsync(command, { timeout: 120000 }); // 2分钟超时

      // 读取提取的字幕文件
      const subtitleContent = await fs.readFile(outputPath, 'utf-8');
      mediaLogger.info(
        `[SubtitleExtractor] 内嵌字幕提取成功: 轨道 ${trackIndex ?? 0}, ${subtitleContent.length} 字符`
      );
      return subtitleContent;
    } catch (error) {
      mediaLogger.warn(
        `[SubtitleExtractor] 内嵌字幕提取失败: 轨道 ${trackIndex ?? 0}`,
        error instanceof Error ? error : String(error)
      );
      return null;
    }
  }

  /**
   * 查找外挂字幕文件
   */
  async findExternalSubtitles(videoPath: string): Promise<SubtitleTrack[]> {
    try {
      const videoDir = path.dirname(videoPath);
      const videoName = path.basename(videoPath, path.extname(videoPath));

      const files = await fs.readdir(videoDir);
      const subtitleExtensions = ['.srt', '.vtt', '.ass', '.ssa', '.sub'];
      const externalTracks: SubtitleTrack[] = [];

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (subtitleExtensions.includes(ext)) {
          // 检查文件名是否与视频文件匹配
          const fileName = path.basename(file, ext);
          if (fileName.includes(videoName) || videoName.includes(fileName)) {
            const filePath = path.join(videoDir, file);

            // 尝试从文件名中提取语言信息
            const language = this.extractLanguageFromFilename(fileName);

            externalTracks.push({
              index: externalTracks.length,
              language,
              codec: ext.substring(1), // 移除点号
              type: 'external',
              filePath,
            });
          }
        }
      }

      return externalTracks;
    } catch (error) {
      mediaLogger.warn(
        `[SubtitleExtractor] 查找外挂字幕失败: ${videoPath}`,
        error instanceof Error ? error : String(error)
      );
      return [];
    }
  }

  /**
   * 从文件名中提取语言信息
   */
  private extractLanguageFromFilename(filename: string): string {
    const lowerName = filename.toLowerCase();

    // 常见语言标识
    const languageMap: { [key: string]: string } = {
      zh: 'chinese',
      cn: 'chinese',
      chs: 'chinese',
      cht: 'chinese',
      chinese: 'chinese',
      中文: 'chinese',
      简体: 'chinese',
      繁体: 'chinese',
      en: 'english',
      eng: 'english',
      english: 'english',
      英文: 'english',
      jp: 'japanese',
      jpn: 'japanese',
      japanese: 'japanese',
      日文: 'japanese',
      kr: 'korean',
      kor: 'korean',
      korean: 'korean',
      韩文: 'korean',
    };

    for (const [key, value] of Object.entries(languageMap)) {
      if (lowerName.includes(key)) {
        return value;
      }
    }

    return 'unknown';
  }

  /**
   * 解析SRT格式字幕
   */
  parseSRTSubtitles(content: string): SubtitleSegment[] {
    const segments: SubtitleSegment[] = [];
    const blocks = content.split(/\n\s*\n/).filter((block) => block.trim());

    blocks.forEach((block, index) => {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        // 解析时间戳
        const timestampLine = lines[1];
        const timeMatch = timestampLine.match(
          /(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/
        );

        if (timeMatch) {
          const startTime = this.parseTimestamp(
            timeMatch[1],
            timeMatch[2],
            timeMatch[3],
            timeMatch[4]
          );
          const endTime = this.parseTimestamp(
            timeMatch[5],
            timeMatch[6],
            timeMatch[7],
            timeMatch[8]
          );

          // 提取文本内容
          const text = lines
            .slice(2)
            .join(' ')
            .replace(/<[^>]*>/g, '')
            .trim();

          if (text) {
            segments.push({
              start: startTime,
              end: endTime,
              text,
              index,
            });
          }
        }
      }
    });

    return segments;
  }

  /**
   * 解析VTT格式字幕
   */
  parseVTTSubtitles(content: string): SubtitleSegment[] {
    const segments: SubtitleSegment[] = [];
    const lines = content.split('\n');
    let currentSegment: Partial<SubtitleSegment> = {};
    let index = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 跳过WEBVTT头部和空行
      if (!line || line.startsWith('WEBVTT') || line.startsWith('NOTE')) {
        continue;
      }

      // 检查时间戳行
      if (line.includes('-->')) {
        const timeMatch = line.match(
          /(\d{2}):(\d{2}):(\d{2})\.(\d{3}) --> (\d{2}):(\d{2}):(\d{2})\.(\d{3})/
        );
        if (timeMatch) {
          currentSegment.start = this.parseTimestamp(
            timeMatch[1],
            timeMatch[2],
            timeMatch[3],
            timeMatch[4]
          );
          currentSegment.end = this.parseTimestamp(
            timeMatch[5],
            timeMatch[6],
            timeMatch[7],
            timeMatch[8]
          );
          currentSegment.index = index++;
        }
      } else if (currentSegment.start !== undefined && currentSegment.end !== undefined) {
        // 这是字幕文本行
        const text = line.replace(/<[^>]*>/g, '').trim();
        if (text) {
          currentSegment.text = currentSegment.text ? `${currentSegment.text} ${text}` : text;
        }

        // 检查下一行是否为空或时间戳，如果是则完成当前段落
        if (i + 1 >= lines.length || !lines[i + 1].trim() || lines[i + 1].includes('-->')) {
          if (currentSegment.text) {
            segments.push(currentSegment as SubtitleSegment);
          }
          currentSegment = {};
        }
      }
    }

    return segments;
  }

  /**
   * 解析时间戳为秒数
   */
  private parseTimestamp(
    hours: string,
    minutes: string,
    seconds: string,
    milliseconds: string
  ): number {
    return (
      parseInt(hours) * 3600 +
      parseInt(minutes) * 60 +
      parseInt(seconds) +
      parseInt(milliseconds) / 1000
    );
  }

  /**
   * 提取完整的字幕内容
   */
  async extractSubtitles(videoPath: string): Promise<SubtitleExtractionResult> {
    const result: SubtitleExtractionResult = {
      tracks: [],
      segments: [],
      totalDuration: 0,
      extractedContent: '',
      language: 'unknown',
      confidence: 0,
    };

    try {
      // 1. 检测内嵌字幕轨道
      const embeddedTracks = await this.detectSubtitleTracks(videoPath);
      result.tracks.push(...embeddedTracks);

      // 2. 查找外挂字幕文件
      const externalTracks = await this.findExternalSubtitles(videoPath);
      result.tracks.push(...externalTracks);

      // 3. 提取字幕内容（优先级：中文 > 英文 > 其他）
      let subtitleContent: string | null = null;
      let selectedTrack: SubtitleTrack | null = null;

      // 优先选择中文字幕
      const chineseTrack = result.tracks.find((track) => track.language === 'chinese');
      if (chineseTrack) {
        selectedTrack = chineseTrack;
        if (chineseTrack.type === 'embedded') {
          subtitleContent = await this.extractEmbeddedSubtitles(videoPath, chineseTrack.index);
        } else if (chineseTrack.filePath) {
          subtitleContent = await fs.readFile(chineseTrack.filePath, 'utf-8');
        }
      }

      // 如果没有中文字幕，尝试英文
      if (!subtitleContent) {
        const englishTrack = result.tracks.find((track) => track.language === 'english');
        if (englishTrack) {
          selectedTrack = englishTrack;
          if (englishTrack.type === 'embedded') {
            subtitleContent = await this.extractEmbeddedSubtitles(videoPath, englishTrack.index);
          } else if (englishTrack.filePath) {
            subtitleContent = await fs.readFile(englishTrack.filePath, 'utf-8');
          }
        }
      }

      // 如果还是没有，尝试第一个可用的字幕轨道
      if (!subtitleContent && result.tracks.length > 0) {
        selectedTrack = result.tracks[0];
        if (selectedTrack.type === 'embedded') {
          subtitleContent = await this.extractEmbeddedSubtitles(videoPath, selectedTrack.index);
        } else if (selectedTrack.filePath) {
          subtitleContent = await fs.readFile(selectedTrack.filePath, 'utf-8');
        }
      }

      // 4. 解析字幕内容
      if (subtitleContent && selectedTrack) {
        result.language = selectedTrack.language;
        result.confidence = 0.9; // 成功提取字幕的置信度

        if (selectedTrack.codec === 'srt' || subtitleContent.includes('-->')) {
          result.segments = this.parseSRTSubtitles(subtitleContent);
        } else if (selectedTrack.codec === 'vtt' || subtitleContent.includes('WEBVTT')) {
          result.segments = this.parseVTTSubtitles(subtitleContent);
        }

        // 生成提取的内容摘要（优化处理）
        result.extractedContent = this.cleanAndFormatSubtitleContent(
          result.segments.map((segment) => segment.text)
        );

        if (result.segments.length > 0) {
          result.totalDuration = result.segments[result.segments.length - 1].end;
        }
      } else {
        result.confidence = 0; // 没有找到字幕
      }
    } catch (error) {
      mediaLogger.error(
        `[SubtitleExtractor] 字幕提取流程异常: ${videoPath}`,
        error instanceof Error ? error : String(error)
      );
      result.confidence = 0;
    }

    return result;
  }

  /**
   * 清理和格式化字幕内容
   */
  private cleanAndFormatSubtitleContent(textSegments: string[]): string {
    // 1. 基础清理
    const cleanedSegments = textSegments
      .map((text) => {
        return text
          .replace(/<[^>]*>/g, '') // 移除HTML标签
          .replace(/\{[^}]*\}/g, '') // 移除ASS样式标签
          .replace(/\\[nN]/g, ' ') // 替换换行符
          .replace(/[♪♫♬♩🎵🎶]/g, '') // 移除音乐符号
          .replace(/\([^)]*\)/g, '') // 移除括号内容（通常是音效描述）
          .replace(/\[[^\]]*\]/g, '') // 移除方括号内容
          .replace(/\s+/g, ' ') // 合并多个空格
          .trim();
      })
      .filter((text) => text.length > 0);

    // 2. 去重相邻重复内容
    const deduplicatedSegments: string[] = [];
    for (let i = 0; i < cleanedSegments.length; i++) {
      const current = cleanedSegments[i];
      const previous = deduplicatedSegments[deduplicatedSegments.length - 1];

      // 如果当前内容与前一个不同，或者相似度低于80%，则添加
      if (!previous || this.calculateSimilarity(current, previous) < 0.8) {
        deduplicatedSegments.push(current);
      }
    }

    // 3. 智能分段和格式化
    const formattedContent = this.formatSubtitleParagraphs(deduplicatedSegments);

    return formattedContent;
  }

  /**
   * 计算两个字符串的相似度
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 格式化字幕段落
   */
  private formatSubtitleParagraphs(segments: string[]): string {
    if (segments.length === 0) {
      return '';
    }

    // 按句子结束符分组
    const sentences: string[] = [];
    let currentSentence = '';

    for (const segment of segments) {
      currentSentence += segment + ' ';

      // 检查是否是句子结束
      if (this.isSentenceEnd(segment)) {
        sentences.push(currentSentence.trim());
        currentSentence = '';
      }
    }

    // 添加最后一个句子（如果有）
    if (currentSentence.trim()) {
      sentences.push(currentSentence.trim());
    }

    // 按段落组织（每3-5个句子一段）
    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += 4) {
      const paragraph = sentences.slice(i, i + 4).join(' ');
      if (paragraph.trim()) {
        paragraphs.push(paragraph.trim());
      }
    }

    return paragraphs.join('\n\n');
  }

  /**
   * 判断是否是句子结束
   */
  private isSentenceEnd(text: string): boolean {
    const trimmed = text.trim();
    return /[.!?。！？]$/.test(trimmed) || /[.!?。！？]\s*$/.test(trimmed) || trimmed.length > 50; // 长句子也视为结束
  }

  /**
   * 清理临时字幕文件
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.sessionDir);
      const subtitleFiles = files.filter(
        (file) => file.startsWith('subtitles_') && (file.endsWith('.srt') || file.endsWith('.vtt'))
      );

      for (const file of subtitleFiles) {
        await fs.unlink(path.join(this.sessionDir, file));
      }
      mediaLogger.info(`[SubtitleExtractor] 已清理 ${subtitleFiles.length} 个临时字幕文件`);
    } catch (error) {
      mediaLogger.warn(
        '[SubtitleExtractor] 清理临时文件失败',
        error instanceof Error ? error : String(error)
      );
    }
  }
}
