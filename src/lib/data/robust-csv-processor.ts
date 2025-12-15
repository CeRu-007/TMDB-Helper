/**
 * 强化的CSV处理器
 * 专门处理包含复杂中文内容和特殊字符的CSV文件
 */

export interface CSVData {
  headers: string[];
  rows: string[][];
}

/**
 * 强化的CSV解析器 - 使用逐字符状态机方法
 * 能够正确处理包含引号、逗号和换行符的复杂字段
 */
export function parseCSVRobust(csvContent: string): CSVData {
  // 使用状态机方法解析整个CSV内容
  const result = parseCSVWithStateMachine(csvContent);

  if (result.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = result[0];
  const rows = result.slice(1);

  // 验证和修复行数据
  const validatedRows: string[][] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (row.length !== headers.length) {
      // 尝试修复：补齐缺失字段或截断多余字段
      const fixedRow = [...row];
      while (fixedRow.length < headers.length) {
        fixedRow.push('');
      }
      if (fixedRow.length > headers.length) {
        fixedRow.splice(headers.length);
      }
      validatedRows.push(fixedRow);
    } else {
      validatedRows.push(row);
    }
  }

  return { headers, rows: validatedRows };
}

/**
 * 使用状态机方法解析CSV内容
 * 正确处理引号内的换行符和逗号
 */
function parseCSVWithStateMachine(csvContent: string): string[][] {
  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvContent.length) {
    const char = csvContent[i];
    const nextChar = i + 1 < csvContent.length ? csvContent[i + 1] : null;

    if (char === '"') {
      if (inQuotes) {
        // 在引号内
        if (nextChar === '"') {
          // 转义的引号 ""
          currentField += '"';
          i += 2;
          continue;
        } else {
          // 引号结束
          inQuotes = false;
        }
      } else {
        // 引号开始
        inQuotes = true;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符（不在引号内）
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // 行结束（不在引号内）
      if (currentField.trim() !== '' || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some((field) => field !== '')) {
          result.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      }

      // 跳过 \r\n 组合
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else if (char === '\r' && nextChar === '\n') {
      // 跳过单独的 \r（已在上面处理）
    } else {
      // 普通字符（包括引号内的换行符）
      if (char === '\n' && inQuotes) {
        // 引号内的换行符转换为空格
        currentField += ' ';
      } else if (char === '\r' && inQuotes) {
        // 引号内的回车符转换为空格
        currentField += ' ';
      } else {
        currentField += char;
      }
    }

    i++;
  }

  // 处理最后一个字段和行
  if (currentField.trim() !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field !== '')) {
      result.push(currentRow);
    }
  }

  return result;
}

/**
 * 强化的CSV行解析器
 * 使用状态机方法逐字符解析，确保正确处理引号和逗号
 */
function parseCSVLineRobust(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = i + 1 < line.length ? line[i + 1] : null;

    if (char === '"') {
      if (inQuotes) {
        // 在引号内
        if (nextChar === '"') {
          // 转义的引号 ""
          currentField += '"';
          i += 2; // 跳过两个引号
          continue;
        } else {
          // 引号结束
          inQuotes = false;
        }
      } else {
        // 引号开始
        inQuotes = true;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符（不在引号内）
      fields.push(currentField.trim());
      currentField = '';
    } else {
      // 普通字符
      currentField += char;
    }

    i++;
  }

  // 添加最后一个字段
  fields.push(currentField.trim());

  return fields;
}

/**
 * 强化的CSV生成器
 * 确保正确转义包含特殊字符的字段
 */
export function generateCSVRobust(data: CSVData): string {
  const lines: string[] = [];

  // 添加标题行
  lines.push(data.headers.map(escapeCSVField).join(','));

  // 添加数据行
  data.rows.forEach((row) => {
    lines.push(row.map(escapeCSVField).join(','));
  });

  return lines.join('\n');
}

/**
 * 转义CSV字段
 * 如果字段包含逗号、引号或换行符，则用引号包围并转义内部引号
 */
function escapeCSVField(field: string): string {
  if (field === null || field === undefined) {
    return '';
  }

  const fieldStr = String(field);

  // 检查是否需要引号包围
  const needsQuotes =
    fieldStr.includes(',') ||
    fieldStr.includes('"') ||
    fieldStr.includes('\n') ||
    fieldStr.includes('\r') ||
    fieldStr.startsWith(' ') ||
    fieldStr.endsWith(' ');

  if (needsQuotes) {
    // 转义内部引号并用引号包围
    return '"' + fieldStr.replace(/"/g, '""') + '"';
  }

  return fieldStr;
}

/**
 * 按剧集编号删除行
 * 这是一个专门的函数，用于安全地删除指定剧集
 */
export function deleteEpisodesByNumbers(
  data: CSVData,
  episodesToDelete: number[],
): CSVData {
  // 找到episode_number列的索引
  const episodeColumnIndex = data.headers.findIndex(
    (header) =>
      header.toLowerCase().includes('episode') || header.includes('剧集'),
  );

  if (episodeColumnIndex === -1) {
    return data;
  }

  // 创建要删除的剧集编号集合
  const episodesToDeleteSet = new Set(episodesToDelete.map((ep) => String(ep)));

  // 过滤行
  const filteredRows = data.rows.filter((row, index) => {
    const episodeNumber = row[episodeColumnIndex]?.trim();
    const shouldDelete = episodesToDeleteSet.has(episodeNumber);

    if (shouldDelete) {
    }

    return !shouldDelete;
  });

  return {
    headers: [...data.headers],
    rows: filteredRows,
  };
}

/**
 * 验证CSV数据完整性
 */
export function validateCSVData(data: CSVData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.headers || data.headers.length === 0) {
    errors.push('缺少标题行');
  }

  if (!data.rows || data.rows.length === 0) {
    errors.push('没有数据行');
  }

  // 检查每行的字段数量
  data.rows.forEach((row, index) => {
    if (row.length !== data.headers.length) {
      errors.push(
        `第${index + 1}行字段数量不匹配: 期望${data.headers.length}个，实际${row.length}个`,
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
