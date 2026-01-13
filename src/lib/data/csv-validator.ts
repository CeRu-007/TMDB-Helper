/**
 * CSV数据验证器
 * 用于验证和修复CSV数据结构问题
 */

import type { CSVData } from '@/types/csv-editor';

// 验证结果类型
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

// 验证错误类型
export interface ValidationError {
  type: 'header' | 'row' | 'cell';
  message: string;
  rowIndex?: number;
  columnIndex?: number;
}

/**
 * CSV验证器类
 * 用于验证CSV数据的完整性和规范性
 */
export class CsvValidator {
  /**
   * 验证CSV数据结构是否正确
   * @param data CSV数据
   * @returns 验证结果
   */
  public validate(data: CSVData): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    // 验证表头
    this.validateHeaders(data, result);

    // 如果表头不合法，直接返回结果，不继续验证行数据
    if (!result.valid) return result;

    // 验证行数据
    this.validateRows(data, result);

    return result;
  }

  /**
   * 验证表头是否正确
   * @param data CSV数据
   * @param result 验证结果
   */
  private validateHeaders(data: CSVData, result: ValidationResult): void {
    // 检查表头存在性
    if (!data.headers || !Array.isArray(data.headers)) {
      result.valid = false;
      result.errors.push({
        type: 'header',
        message: 'CSV表头不是有效数组',
      });
      return;
    }

    // 检查表头是否为空
    if (data.headers.length === 0) {
      result.valid = false;
      result.errors.push({
        type: 'header',
        message: 'CSV表头为空',
      });
      return;
    }

    // 检查表头中是否有空字段
    const emptyHeaders = data.headers.filter(
      (header) => !header || header.trim() === '',
    );
    if (emptyHeaders.length > 0) {
      result.warnings.push(`表头中发现${emptyHeaders.length}个空字段`);
    }

    // 检查表头中是否有重复字段
    const headerMap = new Map<string, number>();
    const duplicateHeaders: string[] = [];

    data.headers.forEach((header, index) => {
      if (header && headerMap.has(header.toLowerCase())) {
        duplicateHeaders.push(header);
      } else {
        headerMap.set(header.toLowerCase(), index);
      }
    });

    if (duplicateHeaders.length > 0) {
      result.warnings.push(
        `表头中发现${duplicateHeaders.length}个重复字段: ${duplicateHeaders.join(', ')}`,
      );
    }
  }

  /**
   * 验证行数据是否正确
   * @param data CSV数据
   * @param result 验证结果
   */
  private validateRows(data: CSVData, result: ValidationResult): void {
    // 检查行数组是否存在
    if (!data.rows || !Array.isArray(data.rows)) {
      result.valid = false;
      result.errors.push({
        type: 'row',
        message: 'CSV行数据不是有效数组',
      });
      return;
    }

    // 检查是否有行数据
    if (data.rows.length === 0) {
      result.warnings.push('CSV数据不包含任何行');
      return;
    }

    // 检查每行的列数是否与表头一致
    data.rows.forEach((row, rowIndex) => {
      // 检查行是否是数组
      if (!Array.isArray(row)) {
        result.errors.push({
          type: 'row',
          message: `第${rowIndex + 1}行不是有效数组`,
          rowIndex,
        });
        result.valid = false;
        return;
      }

      // 检查行长度是否等于表头长度
      if (row.length !== data.headers.length) {
        result.errors.push({
          type: 'row',
          message: `第${rowIndex + 1}行的列数为${row.length}，与表头列数${data.headers.length}不匹配`,
          rowIndex,
        });
        result.valid = false;
        return;
      }

      // 检查每个单元格是否为字符串
      row.forEach((cell, colIndex) => {
        if (typeof cell !== 'string') {
          result.errors.push({
            type: 'cell',
            message: `第${rowIndex + 1}行第${colIndex + 1}列的值不是字符串类型`,
            rowIndex,
            columnIndex: colIndex,
          });
          result.valid = false;
        }
      });
    });
  }

  /**
   * 修复CSV数据中的问题
   * @param data CSV数据
   * @param validationResult 验证结果，如果未提供则会先进行验证
   * @returns 修复后的CSV数据
   */
  public fixCsvData(
    data: CSVData,
    validationResult?: ValidationResult,
  ): CSVData {
    // 如果未提供验证结果，先进行验证
    const result = validationResult || this.validate(data);

    // 创建一个新的对象，避免修改原始数据
    const fixedData: CSVData = {
      headers: [],
      rows: [],
    };

    // 修复表头问题
    if (
      !data.headers ||
      !Array.isArray(data.headers) ||
      data.headers.length === 0
    ) {
      // 尝试从行数据中推断表头
      const maxCols =
        data.rows && Array.isArray(data.rows) && data.rows.length > 0
          ? Math.max(
              ...data.rows.map((row) => (Array.isArray(row) ? row.length : 0)),
            )
          : 1;

      fixedData.headers = Array(maxCols)
        .fill('')
        .map((_, i) => `Column ${i + 1}`);
    } else {
      // 使用原表头，但确保每个表头都是字符串类型
      fixedData.headers = data.headers.map((header) =>
        header === undefined || header === null ? '' : String(header),
      );
    }

    // 修复行数据问题
    if (!data.rows || !Array.isArray(data.rows)) {
      fixedData.rows = [];
    } else {
      // 处理每一行
      fixedData.rows = data.rows.map((row) => {
        // 如果行不是数组，创建一个空行
        if (!Array.isArray(row)) {
          return Array(fixedData.headers.length).fill('');
        }

        // 创建新行，确保长度匹配表头
        const fixedRow = Array(fixedData.headers.length).fill('');

        // 复制原行数据，但不超过表头长度
        for (
          let i = 0;
          i < Math.min(row.length, fixedData.headers.length);
          i++
        ) {
          fixedRow[i] =
            row[i] === undefined || row[i] === null ? '' : String(row[i]);
        }

        return fixedRow;
      });
    }

    return fixedData;
  }
}

// 创建一个默认实例
const csvValidator = new CsvValidator();

/**
 * 验证CSV数据结构
 * @param data CSV数据
 * @returns 验证结果
 */
export function validateCsvData(data: CSVData): ValidationResult {
  return csvValidator.validate(data);
}

/**
 * 修复CSV数据问题
 * @param data CSV数据
 * @returns 修复后的CSV数据
 */
export function fixCsvData(data: CSVData): CSVData {
  return csvValidator.fixCsvData(data);
}
