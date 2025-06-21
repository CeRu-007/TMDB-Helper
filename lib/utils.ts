import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并类名工具函数，用于处理Tailwind类名冲突
 * 结合了clsx和tailwind-merge的功能
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 检查字符串是否为空引号
 * @param value 要检查的字符串
 * @returns 是否为空引号
 */
export function isEmptyQuoted(value: string): boolean {
  return value === '""';
}

/**
 * 延迟执行函数
 * @param ms 延迟毫秒数
 * @returns Promise对象
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 抑制React 19中的ref警告
export function suppressRefWarnings() {
  // 只在客户端执行
  if (typeof window !== 'undefined') {
    // 保存原始console.error
    const originalConsoleError = console.error;
    
    // 替换console.error
    console.error = function(...args: any[]) {
      // 检查是否是我们想要抑制的警告
      const isRefWarning = args.length > 0 && 
        typeof args[0] === 'string' && 
        (args[0].includes('Accessing element.ref was removed in React 19') || 
         args[0].includes('ref is now a regular prop'));
      
      // 如果不是我们要抑制的警告，则使用原始console.error
      if (!isRefWarning) {
        originalConsoleError.apply(console, args);
      }
    };
  }
}

// 格式化日期
export function formatDate(date: Date) {
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
} 