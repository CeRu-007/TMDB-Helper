/**
 * 客户端CSV处理模块
 * 提供简单的CSV解析和序列化功能，供前端组件使用
 */

import type { CSVData } from '@/types/csv';

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
