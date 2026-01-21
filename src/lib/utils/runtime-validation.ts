/**
 * 运行时验证工具
 * 使用 Zod 进行模式验证和类型安全检查
 */

import { z, ZodSchema, ZodError } from 'zod';

/**
 * 验证结果类型
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

/**
 * 安全验证函数
 * 验证数据是否符合指定的 Zod 模式
 */
export function safeValidate<T>(
  data: unknown,
  schema: ZodSchema<T>
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      );
      return {
        success: false,
        errors
      };
    }

    return {
      success: false,
      errors: ['Unknown validation error']
    };
  }
}

/**
 * 断言验证函数
 * 验证数据，如果失败则抛出错误
 */
export function assertValid<T>(
  data: unknown,
  schema: ZodSchema<T>,
  errorMessage?: string
): T {
  const result = safeValidate(data, schema);

  if (!result.success) {
    throw new Error(
      errorMessage ||
      `Validation failed: ${result.errors?.join(', ')}`
    );
  }

  return result.data!;
}

/**
 * 常用验证模式
 */
export const commonSchemas = {
  // 基础类型
  id: z.union([z.string(), z.number()]),
  timestamp: z.union([z.string().datetime(), z.date()]),
  email: z.string().email(),
  url: z.string().url(),

  // API 响应格式
  apiResponse: <T>(dataSchema: ZodSchema<T>) => z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    details: z.unknown().optional(),
    timestamp: z.string().optional()
  }),

  // 分页响应
  paginatedResponse: <T>(itemSchema: ZodSchema<T>) => z.object({
    data: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean()
  }),

  // 数据库记录
  databaseRecord: z.object({
    id: z.union([z.string(), z.number()]),
    createdAt: z.union([z.string().datetime(), z.date()]).optional(),
    updatedAt: z.union([z.string().datetime(), z.date()]).optional()
  }),

  // 错误对象
  error: z.object({
    message: z.string(),
    stack: z.string().optional(),
    code: z.union([z.string(), z.number()]).optional()
  }),

  // 媒体项目
  mediaItem: z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string(),
    type: z.enum(['movie', 'tv', 'episode']),
    overview: z.string().optional(),
    releaseDate: z.string().optional(),
    posterPath: z.string().optional(),
    backdropPath: z.string().optional()
  }),

  // 用户信息
  user: z.object({
    id: z.union([z.string(), z.number()]),
    username: z.string(),
    email: z.string().email(),
    avatar: z.string().optional(),
    role: z.enum(['admin', 'user']).optional()
  }),

  // 任务配置
  taskConfig: z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    type: z.string(),
    enabled: z.boolean(),
    schedule: z.string().optional(),
    config: z.record(z.unknown()).optional()
  })
};

/**
 * API 请求验证中间件
 */
export function validateRequest<T>(
  schema: ZodSchema<T>
) {
  return (data: unknown): T => {
    return assertValid(data, schema, 'Invalid request data');
  };
}

/**
 * API 响应验证器
 */
export function validateApiResponse<T>(
  data: unknown,
  dataSchema: ZodSchema<T>
): ValidationResult<T> {
  const responseSchema = commonSchemas.apiResponse(dataSchema);
  return safeValidate(data, responseSchema);
}

/**
 * 环境变量验证器
 */
export function validateEnvVars<T extends Record<string, ZodSchema>>(
  schema: T
): { [K in keyof T]: z.infer<T[K]> } {
  const result: Record<string, unknown> = {};

  for (const [key, zodSchema] of Object.entries(schema)) {
    const value = process.env[key];

    try {
      result[key] = zodSchema.parse(value);
    } catch (error) {
      throw new Error(
        `Environment variable ${key} validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return result as { [K in keyof T]: z.infer<T[K]> };
}

/**
 * 常用环境变量模式
 */
export const envSchemas = {
  databaseUrl: z.string().url(),
  apiKey: z.string().min(1),
  port: z.string().transform(Number).pipe(z.number().positive()),
  nodeEnv: z.enum(['development', 'production', 'test']),
  logLevel: z.enum(['error', 'warn', 'info', 'debug'])
};

/**
 * 类型安全的数据转换器
 */
export function createTransformer<T, U>(
  fromSchema: ZodSchema<T>,
  toSchema: ZodSchema<U>,
  transformFn: (data: T) => U
) {
  return (data: unknown): U => {
    const validatedFrom = assertValid(data, fromSchema);
    const transformed = transformFn(validatedFrom);
    return assertValid(transformed, toSchema);
  };
}

/**
 * 条件验证器
 */
export function conditionalValidate<T>(
  data: unknown,
  condition: (data: unknown) => boolean,
  schema: ZodSchema<T>,
  fallbackValue?: T
): T | undefined {
  if (!condition(data)) {
    return fallbackValue;
  }

  const result = safeValidate(data, schema);
  return result.success ? result.data : fallbackValue;
}

/**
 * 部分验证器
 * 验证对象的指定字段
 */
export function validatePartial<T>(
  data: unknown,
  schema: ZodSchema<T>
): ValidationResult<Partial<T>> {
  const partialSchema = schema.partial();
  return safeValidate(data, partialSchema);
}

/**
 * 数组项验证器
 * 验证数组中的每个项目
 */
export function validateArrayItems<T>(
  data: unknown,
  itemSchema: ZodSchema<T>
): ValidationResult<T[]> {
  const arraySchema = z.array(itemSchema);
  return safeValidate(data, arraySchema);
}

/**
 * 深度验证器
 * 递归验证嵌套对象
 */
export function validateDeep<T>(
  data: unknown,
  schema: ZodSchema<T>,
  options: {
    strict?: boolean;
    allowUnknown?: boolean;
  } = {}
): ValidationResult<T> {
  const { strict = false, allowUnknown = true } = options;

  let finalSchema = schema;

  if (strict) {
    finalSchema = schema.strict();
  }

  if (!allowUnknown) {
    finalSchema = schema.passthrough();
  }

  return safeValidate(data, finalSchema);
}

/**
 * 异步验证器
 * 支持异步验证逻辑
 */
export async function validateAsync<T>(
  data: unknown,
  schema: ZodSchema<T>,
  asyncValidator?: (data: T) => Promise<boolean>
): Promise<ValidationResult<T>> {
  const syncResult = safeValidate(data, schema);

  if (!syncResult.success) {
    return syncResult;
  }

  if (asyncValidator) {
    try {
      const isValid = await asyncValidator(syncResult.data!);
      if (!isValid) {
        return {
          success: false,
          errors: ['Async validation failed']
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [`Async validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  return syncResult;
}