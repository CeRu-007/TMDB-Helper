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

export interface PlatformCSVResult {
  url: string;
  csvContent: string;
  keptFields: FieldCleanup;
}

export function mergeMultiPlatformCSVs(results: PlatformCSVResult[]): string {
  if (results.length === 0) {
    return '';
  }
  if (results.length === 1) {
    return results[0].csvContent;
  }

  const parsedResults = results.map((r) => ({
    url: r.url,
    data: parseCSV(r.csvContent),
    keptFields: r.keptFields,
  }));

  const base = parsedResults[0];
  const baseHeaders = base.data.headers;

  // Build episode index for all platforms
  const platformsByEpisode = parsedResults.map((platform) => {
    const byEpisode = new Map<number, CSVRow>();
    for (const row of platform.data.rows) {
      const epNum = parseInt(row['episode_number'], 10);
      if (!isNaN(epNum)) {
        byEpisode.set(epNum, row);
      }
    }
    return { url: platform.url, keptFields: platform.keptFields, byEpisode };
  });

  // Use base platform's episode list as the master list
  const baseRows = base.data.rows;
  const mergeFields = ['name', 'air_date', 'runtime', 'overview', 'backdrop'] as const;

  const mergedRows: CSVRow[] = [];
  for (const baseRow of baseRows) {
    const mergedRow: CSVRow = {};
    const epNum = parseInt(baseRow['episode_number'], 10);

    // For each field, find the first platform that keeps it and has a value
    for (const field of baseHeaders) {
      if (!mergeFields.includes(field as (typeof mergeFields)[number])) {
        // Non-mergeable fields: always use base value
        mergedRow[field] = baseRow[field] || '';
        continue;
      }

      let value = '';
      for (const platform of platformsByEpisode) {
        if (!platform.keptFields[field as (typeof mergeFields)[number]]) {
          continue;
        }

        const row = isNaN(epNum) ? baseRow : platform.byEpisode.get(epNum);
        if (row && row[field] && row[field].trim() !== '') {
          value = row[field];
          break;
        }
      }
      mergedRow[field] = value;
    }

    mergedRows.push(mergedRow);
  }

  return [
    baseHeaders.join(','),
    ...mergedRows.map((row) => baseHeaders.map((h) => escapeCSVValue(row[h] || '')).join(',')),
  ].join('\n');
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
    if (!line) {
      continue;
    }

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
  incremental: boolean = true
): string {
  if (!content || content.trim() === '') {
    return content;
  }

  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const rawLines = content.split(/\r?\n/);
  if (rawLines.length < 2) {
    return content;
  }

  const headers = parseCSVLine(rawLines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, ''));
  const expectedCount = headers.length;

  const cleanedRows: string[][] = [];

  for (let i = 1; i < rawLines.length; i++) {
    let line = rawLines[i];
    if (!line.trim()) {
      continue;
    }

    let values = parseCSVLine(line).map((v) => v.replace(/^"|"$/g, ''));

    while (values.length < expectedCount && i + 1 < rawLines.length) {
      i++;
      const nextLine = rawLines[i];
      line += ' ' + nextLine;
      values = parseCSVLine(line).map((v) => v.replace(/^"|"$/g, ''));
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
    const isExistingEpisode = !isNaN(episodeNum) && episodeNum <= currentEpisodeCount;

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

    cleanedRows.push(headers.map((h) => row[h]));
  }

  return [
    headers.join(','),
    ...cleanedRows.map((row) => row.map((v) => escapeCSVValue(v)).join(',')),
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
  if (!line1.trim()) {
    return line2;
  }
  if (!line2.trim()) {
    return line1;
  }

  const values1 = parseCSVLine(line1);
  const values2 = parseCSVLine(line2);

  if (values1.length === 0) {
    return line2;
  }
  if (values2.length === 0) {
    return line1;
  }

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
  rawEpisodeCount: number;
  effectiveEpisodeCount: number;
  incompleteEpisodes: number[];
}

export function analyzeCSVMetadata(csvContent: string): MetadataAnalysisResult {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { rawEpisodeCount: 0, effectiveEpisodeCount: 0, incompleteEpisodes: [] };
  }

  let content = csvContent;
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const contentLines = content.split(/\r?\n/);
  if (contentLines.length < 2) {
    return { rawEpisodeCount: 0, effectiveEpisodeCount: 0, incompleteEpisodes: [] };
  }

  const headers = parseCSVLine(contentLines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, ''));
  const episodeIdx = headers.indexOf('episode_number');
  const nameIdx = headers.indexOf('name');
  const overviewIdx = headers.indexOf('overview');

  if (episodeIdx === -1) {
    return { rawEpisodeCount: 0, effectiveEpisodeCount: 0, incompleteEpisodes: [] };
  }

  let rawEpisodeCount = 0;
  const incompleteEpisodes: number[] = [];

  for (let i = 1; i < contentLines.length; i++) {
    const line = contentLines[i];
    if (!line.trim()) {
      continue;
    }

    const values = parseCSVLine(line).map((v) => v.replace(/^"|"$/g, ''));
    const episodeNum = parseInt(values[episodeIdx], 10);
    if (isNaN(episodeNum)) {
      continue;
    }

    if (episodeNum > rawEpisodeCount) {
      rawEpisodeCount = episodeNum;
    }

    const name = nameIdx !== -1 ? (values[nameIdx] || '').trim() : '';
    const overview = overviewIdx !== -1 ? (values[overviewIdx] || '').trim() : '';

    if (!name || !overview) {
      incompleteEpisodes.push(episodeNum);
    }
  }

  const effectiveEpisodeCount =
    incompleteEpisodes.length > 0 ? Math.min(...incompleteEpisodes) - 1 : rawEpisodeCount;

  return { rawEpisodeCount, effectiveEpisodeCount, incompleteEpisodes };
}

export interface FakeTitleCleanResult {
  csvContent: string;
  clearedEpisodes: number[];
}

const EPISODE_MARKER_REGEXES: RegExp[] = [
  /第\s*[0-9零一二三四五六七八九十百千两兩]+\s*[集话話期]/g,
  /\bEP\s*[0-9]+\b/gi,
  /\bEPISODE\s*[0-9]+\b/gi,
  /#\s*[0-9]+/g,
];

const CHINESE_NUMERAL_ONLY = /^\s*[零一二三四五六七八九十百千两兩]+\s*$/;

function stripDramaName(title: string, dramaName: string): string {
  const t = title.trim();
  const d = (dramaName || '').trim();
  if (!d) {
    return t;
  }
  if (t.toLowerCase() === d.toLowerCase()) {
    return '';
  }
  const lower = t.toLowerCase();
  const lowerD = d.toLowerCase();
  if (lower.startsWith(lowerD)) {
    const rest = t.slice(d.length);
    // 仅在剧名后紧跟空白、序号标记（第/EP/#）或剧名独占时剥离，
    // 避免误伤同名续作（如「庆余年2 第3集」中的「庆余年」）。
    if (
      rest === '' ||
      /^\s/.test(rest) ||
      /^第/.test(rest) ||
      /^[Ee][Pp]/.test(rest) ||
      /^#/.test(rest)
    ) {
      return rest.trim();
    }
  }
  return t;
}

function stripEpisodeMarkers(value: string): string {
  let r = value;
  for (const re of EPISODE_MARKER_REGEXES) {
    r = r.replace(re, '');
  }
  return r;
}

export function isFakeTitle(title: string, dramaName: string): boolean {
  if (!title || !title.trim()) {
    return false;
  }
  let s = stripDramaName(title, dramaName);
  s = stripEpisodeMarkers(s);
  s = s.replace(/^\s*0*([0-9]+)\s*$/, '');
  s = s.replace(CHINESE_NUMERAL_ONLY, '');
  return s.trim() === '';
}

export function clearFakeTitleRows(
  csvContent: string,
  enabled: boolean,
  dramaName: string
): FakeTitleCleanResult {
  if (!enabled || !csvContent || csvContent.trim() === '') {
    return { csvContent, clearedEpisodes: [] };
  }

  let content = csvContent;
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const lines = splitCSVLines(content);
  if (lines.length < 2) {
    return { csvContent, clearedEpisodes: [] };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/^"|"$/g, ''));
  const nameIdx = headers.indexOf('name');
  const episodeIdx = headers.indexOf('episode_number');

  if (nameIdx === -1) {
    return { csvContent, clearedEpisodes: [] };
  }

  const clearedEpisodes: number[] = [];
  const cleanedRows: string[][] = [headers];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      continue;
    }

    const values = parseCSVLine(line).map((v) => v.replace(/^"|"$/g, ''));
    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const title = row[headers[nameIdx]] || '';
    if (title.trim() && isFakeTitle(title, dramaName)) {
      row[headers[nameIdx]] = '';
      if (episodeIdx !== -1) {
        const epNum = parseInt(row[headers[episodeIdx]], 10);
        if (!isNaN(epNum)) {
          clearedEpisodes.push(epNum);
        }
      }
    }

    cleanedRows.push(headers.map((h) => row[h]));
  }

  const output = cleanedRows.map((row) => row.map((v) => escapeCSVValue(v)).join(',')).join('\n');
  return { csvContent: output, clearedEpisodes };
}

export function extractEpisodeCount(csvContent: string): number {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return 0;
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const episodeIdx = headers.indexOf('episode_number');

  if (episodeIdx === -1) {
    return 0;
  }

  let maxNumber = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }

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
