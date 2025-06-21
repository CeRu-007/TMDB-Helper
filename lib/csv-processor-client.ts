/**
 * CSV处理工具类（客户端版本）
 * 用于处理CSV数据的解析、验证、修复和序列化
 * 不包含文件系统操作
 */

// 定义显式空值标记常量
export const EXPLICIT_EMPTY_VALUE = "__EMPTY__"

// CSV数据结构接口
export interface CSVData {
  headers: string[];
  rows: string[][];
}

/**
 * 从CSV字符串解析为结构化数据
 * @param content CSV内容字符串
 * @returns 解析后的CSV结构化数据
 */
export function parseCsvContent(content: string): CSVData {
  try {
    // 先移除位于引号中的换行符，避免将同一行拆分
    const sanitized = (() => {
      let inQuotes = false;
      let result = '';
      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === '"') {
          // 判断是否为转义双引号
          const prev = content[i - 1];
          if (prev === '"') {
            // 双双引号表示转义，保持 inQuotes 状态不变
            // 已在 parser 中处理，此处直接追加
            result += char;
            continue;
          }
          inQuotes = !inQuotes;
          result += char;
        } else if ((char === '\n' || char === '\r') && inQuotes) {
          // 引号内的换行替换为空格，确保CSV记录不会因换行符而拆分
          // 这对于overview字段特别重要，因为它经常包含换行符
          result += ' ';
        } else {
          result += char;
        }
      }
      return result;
    })();

    // 按行分割
    const lines = sanitized.trim().split('\n');
    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    // 解析表头
    const headers = parseHeaderLine(lines[0]);
    if (headers.length === 0) {
      console.error("CSV表头解析失败或为空");
      return { headers: [], rows: [] };
    }

    // 解析数据行
    const rows = lines.slice(1).map(line => parseDataLine(line, headers.length));

    // 规范化数据
    return normalizeCsvData({ headers, rows });
  } catch (error) {
    console.error("解析CSV内容时出错:", error);
    return { headers: [], rows: [] };
  }
}

/**
 * 解析CSV表头行
 * @param line 表头行字符串
 * @returns 解析后的表头数组
 */
function parseHeaderLine(line: string): string[] {
  try {
    // 使用正则表达式解析CSV表头，处理引号内的逗号
    const headerMatches = [...line.matchAll(/"([^"]*(?:""[^"]*)*)"|((?:[^,"]|^)[^,]*)/g)];
    return headerMatches.map(match => {
      if (match[1] !== undefined) {
        return match[1].replace(/""/g, '"').trim();
      }
      return (match[2] || '').trim();
    }).filter(header => header !== '');
  } catch (error) {
    console.error("解析CSV表头时出错:", error);
    // 简单分割作为备选方案
    return line.split(',').map(h => h.replace(/"/g, '').trim());
  }
}

/**
 * 解析CSV数据行
 * @param line 数据行字符串
 * @param expectedColumns 预期的列数（基于表头）
 * @returns 解析后的行数据数组
 */
function parseDataLine(line: string, expectedColumns: number): string[] {
  try {
    // 改进的CSV解析逻辑，更精确地处理引号内的逗号和转义引号
    const result: string[] = [];
    let currentField = '';
    let insideQuotes = false;
    let i = 0;
    
    // 字符级别解析，手动处理每个字符，更精确可靠
    while (i < line.length) {
      const char = line[i];
      
      // 处理引号
      if (char === '"') {
        // 检查是否是转义引号 (""), 或者引号边界
        if (i + 1 < line.length && line[i + 1] === '"') {
          // 转义引号，添加单个引号并跳过下一个字符
          currentField += '"';
          i += 2; // 跳过两个引号字符
        } else {
          // 普通引号，切换引号内外状态
          insideQuotes = !insideQuotes;
          i++;
        }
      }
      // 处理逗号
      else if (char === ',' && !insideQuotes) {
        // 逗号不在引号内，作为字段分隔符
        result.push(currentField);
        currentField = '';
        i++;
      }
      // 处理其他字符
      else {
        currentField += char;
        i++;
      }
    }
    
    // 添加最后一个字段
    result.push(currentField);
    
    // 确保行的长度与表头一致
    while (result.length < expectedColumns) {
      result.push(''); // 补充空单元格
    }
    if (result.length > expectedColumns) {
      result.length = expectedColumns; // 截断多余单元格
    }
    
    return result;
  } catch (error) {
    console.error("解析CSV数据行时出错:", error);
    // 简单分割作为备选方案，并确保长度一致
    const row = line.split(',');
    while (row.length < expectedColumns) {
      row.push('');
    }
    if (row.length > expectedColumns) {
      row.length = expectedColumns;
    }
    return row;
  }
}

/**
 * 将CSV结构化数据规范化，确保所有行都有相同的列数
 * @param data CSV结构化数据
 * @returns 规范化后的CSV结构化数据
 */
export function normalizeCsvData(data: CSVData): CSVData {
  try {
    // 检查输入数据有效性
    if (!data || !data.headers || !Array.isArray(data.headers) || !data.rows || !Array.isArray(data.rows)) {
      console.error("规范化CSV数据时发现无效数据结构", data);
      return { headers: [], rows: [] };
    }
    
    // 复制原始数据以避免直接修改
    const normalizedData: CSVData = {
      headers: [...data.headers],
      rows: []
    };
    
    // 确保表头不为空
    if (normalizedData.headers.length === 0) {
      console.warn("CSV数据表头为空，无法规范化");
      return { headers: [], rows: [] };
    }
    
    // 确保每行有表头对应的列数，并修复可能的数据类型问题
    normalizedData.rows = data.rows.map(row => {
      // 检查行是否是有效数组
      if (!Array.isArray(row)) {
        console.warn("发现无效CSV行数据，已转换为空行");
        return Array(normalizedData.headers.length).fill('');
      }
      
      // 创建新行，避免修改原始数据
      const newRow = [...row];
      
      // 补充缺失的单元格
      while (newRow.length < normalizedData.headers.length) {
        newRow.push('');
      }
      
      // 截断多余的单元格
      if (newRow.length > normalizedData.headers.length) {
        newRow.length = normalizedData.headers.length;
      }
      
      // 确保所有单元格都是字符串类型，并保留显式空值标记
      return newRow.map(cell => {
        if (cell === EXPLICIT_EMPTY_VALUE) {
          // 保留显式空值标记
          return EXPLICIT_EMPTY_VALUE;
        } else if (cell === undefined || cell === null) {
          return '';
        }
        return String(cell);
      });
    });
    
    return normalizedData;
  } catch (error) {
    console.error("规范化CSV数据时出错:", error);
    return data; // 返回原始数据，避免数据丢失
  }
}

/**
 * 验证CSV数据结构是否有效
 * @param data CSV结构化数据
 * @returns 验证结果，包含是否有效和错误信息
 */
export function validateCsvData(data: CSVData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 1. 检查表头
  if (!data.headers || !Array.isArray(data.headers)) {
    errors.push("CSV表头不是有效数组");
  } else if (data.headers.length === 0) {
    errors.push("CSV表头为空");
  }
  
  // 2. 检查行数据
  if (!data.rows || !Array.isArray(data.rows)) {
    errors.push("CSV行数据不是有效数组");
  } else {
    // 3. 检查每行的列数是否与表头一致
    const invalidRows = data.rows.filter(row => !Array.isArray(row) || row.length !== data.headers.length);
    if (invalidRows.length > 0) {
      errors.push(`发现${invalidRows.length}行的列数与表头不一致`);
    }
    
    // 4. 检查每个单元格是否为字符串
    let nonStringCells = 0;
    data.rows.forEach((row, rowIndex) => {
      if (Array.isArray(row)) {
        row.forEach((cell, colIndex) => {
          if (typeof cell !== 'string') {
            nonStringCells++;
          }
        });
      }
    });
    
    if (nonStringCells > 0) {
      errors.push(`发现${nonStringCells}个非字符串单元格`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 修复CSV数据中的常见问题
 * @param data CSV结构化数据
 * @returns 修复后的CSV结构化数据
 */
export function repairCsvData(data: CSVData): CSVData {
  try {
    // 检查输入数据有效性
    if (!data || !data.headers || !data.rows) {
      return { headers: [], rows: [] };
    }
    
    // 规范化数据，确保行列一致
    const normalizedData = normalizeCsvData(data);
    
    // 修复列错位问题
    return fixColumnMisalignment(normalizedData);
  } catch (error) {
    console.error("修复CSV数据时出错:", error);
    return data; // 返回原始数据，避免数据丢失
  }
}

/**
 * 修复CSV数据中的列错位问题
 * @param data CSV结构化数据
 * @returns 修复后的CSV结构化数据
 */
export function fixColumnMisalignment(data: CSVData): CSVData {
  try {
    // 检查输入数据有效性
    if (!data || !data.headers || !data.rows) {
      return { headers: [], rows: [] };
    }
    
    // 复制原始数据以避免直接修改
    const repairedData: CSVData = {
      headers: [...data.headers],
      rows: [...data.rows.map(row => [...row])]
    };
    
    // 已禁用自动列错位修复功能，因为它可能导致数据错位问题
    // 如果将来需要重新启用此功能，请确保它不会错误地移动数据
    
    return repairedData;
  } catch (error) {
    console.error("修复列错位时出错:", error);
    return data; // 出错时返回原始数据
  }
}

/**
 * 将CSV结构化数据序列化为字符串
 * @param data CSV结构化数据
 * @returns 序列化后的CSV字符串
 */
export function serializeCsvData(data: CSVData): string {
  try {
    if (!data || !data.headers || !data.rows) {
      return '';
    }
    
    // 修复可能的数据问题
    const repairedData = repairCsvData(data);
    
    // 序列化表头
    const headerLine = repairedData.headers.map(h => {
      // 如果标题包含逗号或引号，用引号括起来
      if (h.includes(',') || h.includes('"')) {
        return `"${h.replace(/"/g, '""')}"`;
      }
      return h;
    }).join(',');
    
    // 序列化数据行
    const dataLines = repairedData.rows.map(row => {
      return row.map(cell => {
        // 如果单元格包含逗号、引号或换行符，用引号括起来
        if (cell && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',');
    });
    
    // 将表头和数据行合并为完整的CSV字符串
    return [headerLine, ...dataLines].join('\n');
  } catch (error) {
    console.error("序列化CSV数据时出错:", error);
    return '';
  }
}

/**
 * 特殊处理Overview列，修复可能的格式或编码问题
 * @param data CSV结构化数据
 * @returns 处理后的CSV结构化数据
 */
export function processOverviewColumn(data: CSVData): CSVData {
  try {
    // 找到overview列的索引
    const overviewIndex = data.headers.findIndex(header => header.toLowerCase() === 'overview');
    if (overviewIndex === -1) {
      // 没有overview列，无需处理
      return data;
    }
    
    // 处理每行的overview列
    const processedRows = data.rows.map(row => {
      const newRow = [...row];
      
      // 检查overview列是否存在且不为空
      if (overviewIndex < newRow.length && newRow[overviewIndex]) {
        // 去除多余的换行符
        newRow[overviewIndex] = newRow[overviewIndex].replace(/\r\n/g, ' ').replace(/\n/g, ' ');
        
        // 去除前后空格
        newRow[overviewIndex] = newRow[overviewIndex].trim();
      }
      
      return newRow;
    });
    
    return {
      headers: data.headers,
      rows: processedRows
    };
  } catch (error) {
    console.error("处理Overview列时出错:", error);
    return data;
  }
} 