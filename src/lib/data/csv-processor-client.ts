/**
 * 客户端CSV处理模块
 * 提供简单的CSV解析和序列化功能，供前端组件使用
 */

import type { CSVData } from '@/types/csv-editor';

/**
 * 解析CSV内容为结构化数据
 * @param csvContent CSV字符串内容
 * @returns 解析后的CSV数据
 */
export function parseCsvContent(csvContent: string): CSVData {
  if (!csvContent || csvContent.trim() === '') {
    return { headers: [], rows: [] };
  }

  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // 解析头部
  const headers = parseCsvLine(lines[0]);

  // 解析数据行
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length > 0) {
      rows.push(row);
    }
  }

  return { headers, rows };
}

/**
 * 序列化CSV数据为字符串
 * @param data CSV数据
 * @returns CSV字符串
 */
export function serializeCsvData(data: CSVData | any[]): string {
  // 如果传入的是数组，转换为CSVData格式
  let csvData: CSVData;
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return '';
    }
    csvData = {
      headers: Object.keys(data[0] || {}),
      rows: data.map((row) =>
        csvData.headers.map((header) => String(row[header] || '')),
      ),
    };
  } else {
    csvData = data as CSVData;
  }

  if (!csvData.headers || csvData.headers.length === 0) {
    return '';
  }

  const lines: string[] = [];

  // 添加头部
  lines.push(serializeCsvLine(csvData.headers));

  // 添加数据行
  if (csvData.rows) {
    for (const row of csvData.rows) {
      lines.push(serializeCsvLine(row));
    }
  }

  return lines.join('\n');
}

/**
 * 处理概述列的文本
 * @param text 原始文本
 * @returns 处理后的文本
 */
export function processOverviewColumn(text: string): string {
  if (!text) return '';

  // 移除多余的空格和换行
  return text.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim();
}

/**
 * 解析CSV行，处理引号和转义字符
 * @param line CSV行
 * @returns 解析后的字段数组
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 转义的引号
        current += '"';
        i += 2;
        continue;
      } else {
        // 开始或结束引号
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(current);
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // 添加最后一个字段
  result.push(current);

  // 返回时保留引号状态信息，通过最后一个元素是否以"开头来判断
  return result;
}

/**
 * 序列化CSV行，处理引号和转义字符
 * @param fields 字段数组
 * @returns 序列化后的CSV行
 */
function serializeCsvLine(fields: string[]): string {
  return fields
    .map((field) => {
      if (field === null || field === undefined) {
        return '';
      }

      const str = String(field);

      // 如果包含逗号、引号或换行符，需要用引号包围
      if (
        str.includes(',') ||
        str.includes('"') ||
        str.includes('\n') ||
        str.includes('\r')
      ) {
        // 转义内部的引号
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      }

      return str;
    })
    .join(',');
}

/**
 * 检测CSV内容的编码
 * @param content CSV内容
 * @returns 检测到的编码
 */
export function detectCsvEncoding(content: string): string {
  // 简单的编码检测逻辑
  if (content.charCodeAt(0) === 0xfeff) {
    return 'utf-8-bom';
  }
  return 'utf-8';
}

/**
 * 验证CSV格式
 * @param content CSV内容
 * @returns 验证结果
 */
export function validateCsvFormat(content: string): {
  isValid: boolean;
  error?: string;
} {
  if (!content || content.trim() === '') {
    return { isValid: false, error: 'CSV内容为空' };
  }

  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { isValid: false, error: 'CSV至少需要包含头部和一行数据' };
  }

  // 检查头部是否有内容
  const headers = parseCsvLine(lines[0]);
  if (headers.length === 0 || headers.every((h) => h.trim() === '')) {
    return { isValid: false, error: 'CSV头部为空或无效' };
  }

  return { isValid: true };
}

/**
 * 获取CSV预览
 * @param content CSV内容
 * @param maxRows 最大行数
 * @returns 预览数据
 */
export function getCsvPreview(content: string, maxRows: number = 10): CSVData {
  const parsed = parseCsvContent(content);
  return {
    headers: parsed.headers,
    rows: parsed.rows.slice(0, maxRows),
  };
}

/**
 * 统计CSV信息
 * @param data CSV数据
 * @returns 统计信息
 */
export function getCsvStatistics(data: CSVData) {
  const totalRows = data.rows?.length || 0;
  const totalColumns = data.headers?.length || 0;
  const emptyCells =
    data.rows?.reduce(
      (count, row) =>
        count + row.filter((cell) => !cell || cell.trim() === '').length,
      0,
    ) || 0;

  return {
    totalRows,
    totalColumns,
    emptyCells,
    averageRowLength: totalRows > 0 ? totalColumns : 0,
  };
}

/**
 * 检查是否为新数据行的开始（以数字开头）
 * @param line CSV行
 * @returns 是否为新行开始
 */
function isNewRowStart(line: string): boolean {
  return /^\d+\s*,/.test(line.trim());
}

/**
 * 从文本中提取URL
 * @param text 文本
 * @returns URL或空字符串
 */
function extractBackdropUrl(text: string): string {
  const urlMatch = text.match(/(https?:\/\/[^\s,]+)/);
  return urlMatch ? urlMatch[1] : '';
}

/**
 * 清理CSV内容中的换行符（专门用于overview字段）
 * 处理抓取时产生的格式错误：overview中的换行符导致行断裂
 * 将overview字段中的 \r\n、\n、\r 替换为空格
 * @param csvContent 原始CSV内容
 * @returns 清理后的CSV内容
 */
export function cleanCsvNewlines(csvContent: string): string {
  if (!csvContent || csvContent.trim() === '') {
    return csvContent;
  }

  // 移除BOM头
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.slice(1);
  }

  const rawLines = csvContent.split(/\r?\n/);
  if (rawLines.length < 2) {
    return csvContent;
  }

  // 解析头部
  const headers = rawLines[0].split(',').map(h => h.trim().toLowerCase());
  const expectedCount = headers.length;

  if (headers.indexOf('overview') === -1) {
    // 没有overview列，直接返回原内容
    return csvContent;
  }

  // 收集所有属于同一集的行
  const episodes: string[][] = [];
  let currentEpisodeLines: string[] = [];

  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line.trim()) continue;

    if (isNewRowStart(line)) {
      // 保存之前的集
      if (currentEpisodeLines.length > 0) {
        episodes.push(currentEpisodeLines);
      }
      // 开始新集
      currentEpisodeLines = [line];
    } else {
      // 这是当前集的续行
      currentEpisodeLines.push(line);
    }
  }

  // 保存最后一集
  if (currentEpisodeLines.length > 0) {
    episodes.push(currentEpisodeLines);
  }

  // 处理每一集
  const cleanedRows: string[][] = [];

  for (const episodeLines of episodes) {
    // 解析第一行获取基本信息
    const firstLine = episodeLines[0];

    // 找到前5个逗号的位置
    const commaIndices: number[] = [];
    let searchStart = 0;
    for (let j = 0; j < 5; j++) {
      const idx = firstLine.indexOf(',', searchStart);
      if (idx === -1) break;
      commaIndices.push(idx);
      searchStart = idx + 1;
    }

    if (commaIndices.length < 5) {
      // 格式不正确，跳过
      continue;
    }

    const episodeNumber = firstLine.substring(0, commaIndices[0]).trim();
    const name = firstLine.substring(commaIndices[0] + 1, commaIndices[1]).trim();
    const airDate = firstLine.substring(commaIndices[1] + 1, commaIndices[2]).trim();
    const runtime = firstLine.substring(commaIndices[2] + 1, commaIndices[3]).trim();

    // 第一行的overview部分（第4个逗号后到第5个逗号前）
    let overview = firstLine.substring(commaIndices[3] + 1, commaIndices[4]).trim();

    // backdrop从第5个逗号后开始
    let backdrop = firstLine.substring(commaIndices[4] + 1).trim();

    // 处理续行
    for (let j = 1; j < episodeLines.length; j++) {
      let line = episodeLines[j].trim();

      // 移除首尾的引号
      line = line.replace(/^"|"$/g, '');

      // 移除末尾的逗号组（如 ,,,,,）
      line = line.replace(/,+$/, '');

      // 检查这一行是否包含URL
      const urlInLine = extractBackdropUrl(line);
      if (urlInLine) {
        // 移除URL
        const textPart = line.replace(urlInLine, '').replace(/,+$/, '').trim();

        // 文本部分添加到overview
        if (textPart) {
          overview += ' ' + textPart;
        }

        // URL作为backdrop（如果还没有）
        if (!backdrop) {
          backdrop = urlInLine;
        }
      } else {
        // 没有URL，全部添加到overview
        overview += ' ' + line;
      }
    }

    // 清理overview
    overview = overview
      .replace(/\r\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .replace(/,+$/, '')
      .trim();

    // 清理backdrop
    backdrop = backdrop.replace(/^"|"$/g, '').trim();

    cleanedRows.push([episodeNumber, name, airDate, runtime, overview, backdrop]);
  }

  // 重新组装CSV内容
  return [
    rawLines[0], // 保留原始头部
    ...cleanedRows.map(row => row.map(v => escapeCsvValue(v)).join(','))
  ].join('\n');
}

/**
 * 转义CSV值（与 csv-cleaner.ts 中的 escapeCSVValue 一致）
 * @param value 字段值
 * @returns 转义后的值
 */
function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}


