/**
 * 日期处理工具函数
 * 用于表格中的日期和时间操作
 */

/**
 * 判断字符串是否为有效的日期格式
 * 支持的格式: YYYY-MM-DD
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr) return false;
  
  // 检查格式是否为YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  // 检查是否为有效日期
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * 解析日期字符串为Date对象
 * @param dateStr 日期字符串，格式为YYYY-MM-DD
 */
export function parseDate(dateStr: string): Date | null {
  if (!isValidDateString(dateStr)) return null;
  return new Date(dateStr);
}

/**
 * 格式化日期为YYYY-MM-DD格式
 * @param date 日期对象
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 计算日期递进序列
 * @param startDate 起始日期
 * @param count 需要生成的日期数量
 * @param interval 间隔天数
 * @param useEqualDate 是否对多行使用相同日期
 */
export function generateDateSequence(
  startDate: Date,
  count: number,
  interval: number = 1,
  useEqualDate: boolean = false
): string[] {
  const result: string[] = [];
  
  if (useEqualDate) {
    // 如果使用相同日期，则所有项都使用起始日期
    const formattedDate = formatDate(startDate);
    for (let i = 0; i < count; i++) {
      result.push(formattedDate);
    }
  } else {
    // 否则，根据间隔生成递进日期
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < count; i++) {
      result.push(formatDate(currentDate));
      
      // 增加天数
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + interval);
    }
  }
  
  return result;
}

/**
 * 判断字符串是否包含时间（分钟）
 * 支持格式: HH:MM 或 H:MM
 */
export function hasTimeMinutes(timeStr: string): boolean {
  if (!timeStr) return false;
  
  // 检查格式是否为HH:MM或H:MM
  const regex = /^\d{1,2}:\d{2}$/;
  return regex.test(timeStr);
}

/**
 * 从时间字符串中提取分钟
 * @param timeStr 时间字符串，格式为HH:MM或H:MM
 */
export function extractMinutes(timeStr: string): number | null {
  if (!hasTimeMinutes(timeStr)) return null;
  
  const parts = timeStr.split(':');
  return parseInt(parts[1], 10);
}

/**
 * 设置时间字符串的分钟部分
 * @param timeStr 时间字符串，格式为HH:MM或H:MM
 * @param minutes 要设置的分钟值（0-59）
 */
export function setTimeMinutes(timeStr: string, minutes: number): string {
  if (!hasTimeMinutes(timeStr)) return timeStr;
  
  // 确保分钟值在有效范围内
  const validMinutes = Math.max(0, Math.min(59, minutes));
  
  const parts = timeStr.split(':');
  return `${parts[0]}:${String(validMinutes).padStart(2, '0')}`;
}

/**
 * 检查列是否可能是日期列
 * @param values 列值数组
 */
export function isDateColumn(values: string[]): boolean {
  // 如果没有数据，返回false
  if (!values || values.length === 0) return false;
  
  // 检查非空值中是否有符合日期格式的
  const nonEmptyValues = values.filter(v => v.trim() !== '');
  if (nonEmptyValues.length === 0) return false;
  
  // 检查前10个非空值是否都是有效日期
  const sampleSize = Math.min(10, nonEmptyValues.length);
  const validDates = nonEmptyValues
    .slice(0, sampleSize)
    .filter(v => isValidDateString(v));
  
  // 如果至少50%的样本是有效日期，则认为是日期列
  return validDates.length >= sampleSize * 0.5;
}

/**
 * 检查列是否可能是时间列（包含分钟）
 * @param values 列值数组
 */
export function isTimeColumn(values: string[]): boolean {
  // 如果没有数据，返回false
  if (!values || values.length === 0) return false;
  
  // 检查非空值中是否有符合时间格式的
  const nonEmptyValues = values.filter(v => v.trim() !== '');
  if (nonEmptyValues.length === 0) return false;
  
  // 检查前10个非空值是否都是有效时间
  const sampleSize = Math.min(10, nonEmptyValues.length);
  const validTimes = nonEmptyValues
    .slice(0, sampleSize)
    .filter(v => hasTimeMinutes(v));
  
  // 如果至少50%的样本是有效时间，则认为是时间列
  return validTimes.length >= sampleSize * 0.5;
} 