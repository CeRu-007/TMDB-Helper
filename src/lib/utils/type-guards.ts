/**
 * 类型守卫工具
 * 提供运行时类型检查功能，确保类型安全
 */

/**
 * 检查值是否为字符串
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 检查值是否为数字
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 检查值是否为布尔值
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * 检查值是否为对象（非null）
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 检查值是否为数组
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * 检查值是否为函数
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * 检查值是否为null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * 检查值是否为undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * 检查值是否为null或undefined
 */
export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * 检查字符串数组
 */
export function isStringArray(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

/**
 * 检查数字数组
 */
export function isNumberArray(value: unknown): value is number[] {
  return isArray(value) && value.every(isNumber);
}

/**
 * 检查对象是否具有指定属性
 */
export function hasProperty<K extends string | number | symbol>(
  obj: unknown,
  prop: K
): obj is Record<K, unknown> {
  return isObject(obj) && prop in obj;
}

/**
 * 检查对象是否具有所有指定属性
 */
export function hasProperties<T extends Record<string, unknown>>(
  obj: unknown,
  props: (keyof T)[]
): obj is T {
  if (!isObject(obj)) return false;
  return props.every(prop => prop in obj);
}

/**
 * 检查API响应格式
 */
export interface ApiResponseShape {
  success: boolean;
  data?: unknown;
  error?: string;
  details?: unknown;
}

export function isApiResponse(value: unknown): value is ApiResponseShape {
  return isObject(value) &&
         typeof value.success === 'boolean' &&
         (value.data === undefined || value.data !== undefined) &&
         (value.error === undefined || isString(value.error));
}

/**
 * 检查错误对象格式
 */
export interface ErrorShape {
  message: string;
  stack?: string;
  code?: string | number;
}

export function isError(value: unknown): value is ErrorShape {
  return isObject(value) &&
         isString(value.message) &&
         (value.stack === undefined || isString(value.stack)) &&
         (value.code === undefined || isString(value.code) || isNumber(value.code));
}

/**
 * 检查数据库记录格式
 */
export interface DatabaseRecord {
  id: string | number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export function isDatabaseRecord(value: unknown): value is DatabaseRecord {
  return isObject(value) &&
         (isString(value.id) || isNumber(value.id)) &&
         (value.createdAt === undefined || isString(value.createdAt) || value.createdAt instanceof Date) &&
         (value.updatedAt === undefined || isString(value.updatedAt) || value.updatedAt instanceof Date);
}

/**
 * 检查分页响应格式
 */
export interface PaginatedResponseShape<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function isPaginatedResponse<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T
): value is PaginatedResponseShape<T> {
  return isObject(value) &&
         isArray(value.data) &&
         value.data.every(itemGuard) &&
         isNumber(value.total) &&
         isNumber(value.page) &&
         isNumber(value.pageSize) &&
         isBoolean(value.hasNext) &&
         isBoolean(value.hasPrev);
}

/**
 * 类型谓词生成器
 * 根据对象的结构生成类型守卫
 */
export function createTypeGuard<T extends Record<string, unknown>>(
  schema: {
    [K in keyof T]: (value: unknown) => value is T[K];
  }
) {
  return function (value: unknown): value is T {
    if (!isObject(value)) return false;

    for (const [key, validator] of Object.entries(schema)) {
      if (!(key in value) || !validator(value[key])) {
        return false;
      }
    }

    return true;
  };
}

/**
 * 联合类型守卫生成器
 */
export function createUnionGuard<T>(guards: ((value: unknown) => value is T)[]) {
  return function (value: unknown): value is T {
    return guards.some(guard => guard(value));
  };
}

/**
 * 可选类型守卫
 */
export function isOptional<T>(
  value: unknown,
  guard: (value: unknown) => value is T
): value is T | undefined {
  return value === undefined || guard(value);
}

/**
 * 严格类型断言
 * 在运行时验证类型，如果类型不匹配则抛出错误
 */
export function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  message?: string
): asserts value is T {
  if (!guard(value)) {
    throw new TypeError(message || `Type assertion failed`);
  }
}

/**
 * 安全类型转换
 * 尝试将值转换为目标类型，失败时返回默认值
 */
export function safeConvert<T>(
  value: unknown,
  converter: (value: unknown) => T | null,
  defaultValue: T
): T {
  const result = converter(value);
  return result !== null ? result : defaultValue;
}

/**
 * 字符串转换器
 */
export function toString(value: unknown, defaultValue: string = ''): string {
  if (isString(value)) return value;
  if (isNumber(value) || isBoolean(value)) return String(value);
  return defaultValue;
}

/**
 * 数字转换器
 */
export function toNumber(value: unknown, defaultValue: number = 0): number {
  if (isNumber(value)) return value;
  if (isString(value)) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * 布尔值转换器
 */
export function toBoolean(value: unknown, defaultValue: boolean = false): boolean {
  if (isBoolean(value)) return value;
  if (isString(value)) {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  if (isNumber(value)) {
    return value !== 0;
  }
  return defaultValue;
}