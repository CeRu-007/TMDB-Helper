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
 * 判断字符串是否为纯数字的分钟数
 * @param timeStr 时间字符串，如 "45"、"60"
 */
export function isValidMinutesOnly(timeStr: string): boolean {
  if (!timeStr) return false;
  
  const regex = /^\d+$/;
  return regex.test(timeStr);
}

/**
 * 从纯数字分钟字符串中提取分钟
 * @param timeStr 纯数字的分钟字符串，如 "45"、"60"
 */
export function extractMinutesFromNumber(timeStr: string): number | null {
  if (!isValidMinutesOnly(timeStr)) return null;
  
  return parseInt(timeStr, 10);
}

/**
 * 设置纯数字分钟字符串的值
 * @param timeStr 纯数字的分钟字符串，如 "45"、"60"
 * @param minutes 要设置的分钟值（0-59）
 */
export function setMinutesFromNumber(timeStr: string, minutes: number): string {
  const validMinutes = Math.max(0, Math.min(59, minutes));
  return String(validMinutes);
}

/**
 * 设置时间字符串的分钟部分
 * @param timeStr 时间字符串，格式为HH:MM、H:MM或纯数字（如 "45"）
 * @param minutes 要设置的分钟值（0-59）
 */
export function setTimeMinutes(timeStr: string, minutes: number): string {
  if (hasTimeMinutes(timeStr)) {
    // 处理 HH:MM 格式
    const validMinutes = Math.max(0, Math.min(59, minutes));
    const parts = timeStr.split(':');
    return `${parts[0]}:${String(validMinutes).padStart(2, '0')}`;
  } else if (isValidMinutesOnly(timeStr)) {
    // 处理纯数字格式
    const validMinutes = Math.max(0, Math.min(59, minutes));
    return String(validMinutes);
  }
  
  return timeStr;
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
    .filter(v => hasTimeMinutes(v) || isValidMinutesOnly(v));

  // 如果至少50%的样本是有效时间，则认为是时间列
  return validTimes.length >= sampleSize * 0.5;
}

/**
 * 格式化即将上线的时间描述
 * @param releaseDate 上线日期
 * @returns 格式化的时间描述（如"今天上线"、"明天上线"、"3天后上线"）
 */
export function formatUpcomingTimeDescription(releaseDate: string): string {
  const daysUntilRelease = Math.ceil((new Date(releaseDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilRelease <= 0) {
    return "今天上线";
  } else if (daysUntilRelease === 1) {
    return "明天上线";
  } else {
    return `${daysUntilRelease} 天后上线`;
  }
}

/**
 * 格式化近期开播的时间描述
 * @param releaseDate 开播日期
 * @returns 格式化的时间描述（如"今天开播"、"昨天开播"、"3天前开播"）
 */
export function formatRecentTimeDescription(releaseDate: string): string {
  const daysSinceRelease = Math.ceil((new Date().getTime() - new Date(releaseDate).getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceRelease <= 0) {
    return "今天开播";
  } else if (daysSinceRelease === 1) {
    return "昨天开播";
  } else {
    return `${daysSinceRelease} 天前开播`;
  }
}

/**
 * 格式化简短的时间描述（用于卡片上的标签）
 * @param releaseDate 日期
 * @param isUpcoming 是否为即将上线（true）还是近期开播（false）
 * @returns 简短的时间描述（如"今天上线"、"明天上线"、"3天后"、"昨天开播"、"3天前"）
 */
export function formatShortTimeDescription(releaseDate: string, isUpcoming: boolean): string {
  if (isUpcoming) {
    const daysUntilRelease = Math.ceil((new Date(releaseDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilRelease <= 0) {
      return "今天上线";
    } else if (daysUntilRelease === 1) {
      return "明天上线";
    } else {
      return `${daysUntilRelease}天后`;
    }
  } else {
    const daysSinceRelease = Math.ceil((new Date().getTime() - new Date(releaseDate).getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceRelease <= 0) {
      return "今天开播";
    } else if (daysSinceRelease === 1) {
      return "昨天开播";
    } else {
      return `${daysSinceRelease}天前`;
    }
  }
}

/**
 * 判断字符串是否为有效的正整数
 * @param value 字符串值
 * @returns 是否为有效正整数
 */
export function isValidPositiveInteger(value: string): boolean {
  if (!value || value.trim() === '') return false;
  
  // 检查是否为纯数字且大于0
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 && value === String(num);
}

/**
 * 检查列是否可能是数字列（正整数）
 * @param values 列值数组
 * @returns 是否为数字列
 */
export function isNumericColumn(values: string[]): boolean {
  if (!values || values.length === 0) return false;
  
  const nonEmptyValues = values.filter(v => v.trim() !== '');
  if (nonEmptyValues.length === 0) return false;
  
  const sampleSize = Math.min(10, nonEmptyValues.length);
  const validNumbers = nonEmptyValues
    .slice(0, sampleSize)
    .filter(v => isValidPositiveInteger(v));
  
  return validNumbers.length >= sampleSize * 0.5;
}

/**
 * 生成数字序列
 * @param startValue 起始值
 * @param count 需要生成的数字数量
 * @param step 步长
 * @returns 数字序列（字符串数组）
 */
export function generateNumberSequence(
  startValue: number,
  count: number,
  step: number = 1
): string[] {
  const result: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const value = startValue + (i * step);
    result.push(String(value));
  }
  
  return result;
}