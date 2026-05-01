/**
 * CSV 清理器
 */

import type { FieldCleanup } from '@/types/schedule';

export interface CSVRow {
  [key: string]: string;
}

export interface CSVData {
  headers: string[];
  rows: CSVRow[];
}

export function parseCSV(content: string): CSVData {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]);

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

export function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function cleanCSV(
  content: string,
  fieldCleanup: FieldCleanup,
  currentEpisodeCount: number = 0,
  incremental: boolean = true,
  effectiveEpisodeCount?: number
): string {
  if (!content || content.trim() === '') {
    return content;
  }

  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  const rawLines = content.split(/\r?\n/);
  if (rawLines.length < 2) {
    return content;
  }

  const headers = parseCSVLine(rawLines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, ''));
  const expectedCount = headers.length;

  const cleanedRows: string[][] = [];

  for (let i = 1; i < rawLines.length; i++) {
    let line = rawLines[i];
    if (!line.trim()) continue;

    let values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''));

    while (values.length < expectedCount && i + 1 < rawLines.length) {
      i++;
      const nextLine = rawLines[i];
      line += ' ' + nextLine;
      values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''));
    }

    if (values.length > expectedCount) {
      values = values.slice(0, expectedCount);
    }

    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const episodeIdx = headers.indexOf('episode_number');
    const episodeNum = episodeIdx !== -1 ? parseInt(row[headers[episodeIdx]], 10) : NaN;
    const incrementalThreshold = effectiveEpisodeCount !== undefined ? effectiveEpisodeCount : currentEpisodeCount;
    const isExistingEpisode = !isNaN(episodeNum) && episodeNum <= incrementalThreshold;

    if (incremental && isExistingEpisode) {
      continue;
    }

    const overviewIdx = headers.indexOf('overview');
    if (overviewIdx !== -1 && row[headers[overviewIdx]]) {
      row[headers[overviewIdx]] = row[headers[overviewIdx]]
        .replace(/\r\n/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .trim();
    }

    const fieldMap: Record<string, string> = {
      name: 'name',
      air_date: 'air_date',
      runtime: 'runtime',
      overview: 'overview',
      backdrop: 'backdrop',
    };

    for (const [fieldKey, headerName] of Object.entries(fieldMap)) {
      if (fieldCleanup[fieldKey as keyof FieldCleanup]) {
        const headerIdx = headers.indexOf(headerName.toLowerCase());
        if (headerIdx !== -1) {
          row[headers[headerIdx]] = '';
        }
      }
    }

    cleanedRows.push(headers.map(h => row[h]));
  }

  return [
    headers.join(','),
    ...cleanedRows.map(row => row.map(v => escapeCSVValue(v)).join(','))
  ].join('\n');
}

function splitCSVLines(content: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '""';
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      if (char === '\r') {
        lines.push(current);
        current = '';
        i += 2;
      } else {
        lines.push(current);
        current = '';
        i++;
      }
      continue;
    }

    current += char;
    i++;
  }

  if (current.trim()) {
    lines.push(current);
  }

  return lines;
}

function mergeCSVLines(line1: string, line2: string): string {
  if (!line1.trim()) return line2;
  if (!line2.trim()) return line1;

  const values1 = parseCSVLine(line1);
  const values2 = parseCSVLine(line2);

  if (values1.length === 0) return line2;
  if (values2.length === 0) return line1;

  const lastValue1 = values1[values1.length - 1];
  const firstValue2 = values2[0];

  if (lastValue1.startsWith('"') && !lastValue1.endsWith('"')) {
    return line1 + ' ' + line2;
  }

  if (firstValue2.endsWith('"') && !firstValue2.startsWith('"')) {
    return line1 + ' ' + line2;
  }

  return line1 + ' ' + line2;
}

export interface MetadataAnalysisResult {
  rawEpisodeCount: number
  effectiveEpisodeCount: number
  incompleteEpisodes: number[]
}

export function analyzeCSVMetadata(csvContent: string): MetadataAnalysisResult {
  const lines = csvContent.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return { rawEpisodeCount: 0, effectiveEpisodeCount: 0, incompleteEpisodes: [] }
  }

  let content = csvContent
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1)
  }

  const contentLines = content.split(/\r?\n/)
  if (contentLines.length < 2) {
    return { rawEpisodeCount: 0, effectiveEpisodeCount: 0, incompleteEpisodes: [] }
  }

  const headers = parseCSVLine(contentLines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, ''))
  const episodeIdx = headers.indexOf('episode_number')
  const nameIdx = headers.indexOf('name')
  const overviewIdx = headers.indexOf('overview')

  if (episodeIdx === -1) {
    return { rawEpisodeCount: 0, effectiveEpisodeCount: 0, incompleteEpisodes: [] }
  }

  let rawEpisodeCount = 0
  const incompleteEpisodes: number[] = []

  for (let i = 1; i < contentLines.length; i++) {
    let line = contentLines[i]
    if (!line.trim()) continue

    const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''))
    const episodeNum = parseInt(values[episodeIdx], 10)
    if (isNaN(episodeNum)) continue

    if (episodeNum > rawEpisodeCount) {
      rawEpisodeCount = episodeNum
    }

    const name = nameIdx !== -1 ? (values[nameIdx] || '').trim() : ''
    const overview = overviewIdx !== -1 ? (values[overviewIdx] || '').trim() : ''

    if (!name || !overview) {
      incompleteEpisodes.push(episodeNum)
    }
  }

  const effectiveEpisodeCount = incompleteEpisodes.length > 0
    ? Math.min(...incompleteEpisodes) - 1
    : rawEpisodeCount

  return { rawEpisodeCount, effectiveEpisodeCount, incompleteEpisodes }
}

export function extractEpisodeCount(csvContent: string): number {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return 0;
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
  const episodeIdx = headers.indexOf('episode_number');

  if (episodeIdx === -1) {
    return 0;
  }

  let maxNumber = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length > episodeIdx) {
      const num = parseInt(values[episodeIdx], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  return maxNumber;
}
