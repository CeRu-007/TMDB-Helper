/**
 * Promise 工具函数
 * 用于简化异步操作和错误处理
 */

/**
 * 创建一个带超时的 Promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(timeoutError || new Error(`操作超时 (${timeoutMs}ms)`)),
        timeoutMs
      )
    ),
  ])
}

/**
 * 创建一个可重试的 Promise
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000,
  shouldRetry?: (error: Error) => boolean
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 如果是最后一次尝试，或者错误不应该重试，直接抛出
      if (attempt === maxAttempts || (shouldRetry && !shouldRetry(lastError))) {
        throw lastError
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
    }
  }

  throw lastError!
}

/**
 * 安全地解析 JSON
 */
export async function safeJsonParse<T>(
  data: string,
  defaultValue: T
): Promise<T> {
  try {
    return JSON.parse(data) as T
  } catch (error) {
    return defaultValue
  }
}

/**
 * 批量处理 Promise，限制并发数
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
  }

  return results
}

/**
 * 创建一个可取消的 Promise
 */
export function createCancellablePromise<T>(
  executor: (
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void,
    onCancel: (callback: () => void) => void
  ) => void
): { promise: Promise<T>; cancel: () => void } {
  let isCancelled = false
  let cancelCallback: (() => void) | null = null

  const promise = new Promise<T>((resolve, reject) => {
    cancelCallback = () => {
      if (!isCancelled) {
        isCancelled = true
        reject(new Error('操作已取消'))
      }
    }

    executor(
      (value: T) => {
        if (!isCancelled) {
          resolve(value)
        }
      },
      (reason?: unknown) => {
        if (!isCancelled) {
          reject(reason)
        }
      },
      (callback: () => void) => {
        if (!isCancelled) {
          cancelCallback = callback
        }
      }
    )
  })

  return {
    promise,
    cancel: () => {
      if (cancelCallback) {
        cancelCallback()
      }
    }
  }
}

/**
 * 创建一个带有进度回调的 Promise
 */
export async function withProgress<T>(
  operation: (reportProgress: (progress: number) => void) => Promise<T>
): Promise<{ result: T; progress: number[] }> {
  const progress: number[] = []

  const result = await operation((p) => {
    progress.push(p)
  })

  return { result, progress }
}

/**
 * 管道式处理 Promise
 */
export function pipeline<T>(
  initialValue: T,
  ...operations: Array<(value: T) => Promise<T>>
): Promise<T> {
  return operations.reduce(
    (promise, operation) => promise.then(operation),
    Promise.resolve(initialValue)
  )
}

/**
 * 缓存 Promise 结果
 */
export function memoizePromise<T extends ReadonlyArray<unknown>, R>(
  fn: (...args: T) => Promise<R>,
  getKey: (...args: T) => string = (...args) => JSON.stringify(args)
): (...args: T) => Promise<R> {
  const cache = new Map<string, Promise<R>>()

  return (...args: T): Promise<R> => {
    const key = getKey(...args)

    const cachedPromise = cache.get(key)
    if (cachedPromise) {
      return cachedPromise
    }

    const newPromise = fn(...args)
    cache.set(key, newPromise)

    // 清理失败的缓存
    newPromise.catch(() => {
      cache.delete(key)
    })

    return newPromise
  }
}