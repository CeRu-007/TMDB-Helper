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

/**
 * 安全的JSON解析函数
 * 解决"[object Object]" is not valid JSON的错误
 * @param value 要解析的值，可能是字符串或对象
 * @param defaultValue 解析失败时的默认值
 * @returns 解析后的对象或默认值
 */
export function safeJsonParse<T = any>(value: any, defaultValue: T | null = null): T | null {
  // 如果已经是对象，直接返回
  if (typeof value === 'object' && value !== null) {
    return value as T;
  }
  
  // 如果是null或undefined，返回默认值
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  // 如果不是字符串，返回默认值
  if (typeof value !== 'string') {
    console.warn('[safeJsonParse] 非字符串值，返回默认值:', typeof value, value);
    return defaultValue;
  }
  
  // 如果是空字符串，返回默认值
  if (value.trim() === '') {
    return defaultValue;
  }
  
  // 如果是"[object Object]"这样的无效JSON，返回默认值
  if (value === '[object Object]' || value.includes('[object Object]')) {
    console.warn('[safeJsonParse] 检测到无效的JSON字符串"[object Object]"，返回默认值');
    return defaultValue;
  }
  
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('[safeJsonParse] JSON解析失败，返回默认值:', error, 'value:', value);
    return defaultValue;
  }
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

/**
 * 从URL识别平台并返回平台信息
 * @param url 平台URL
 * @returns 平台信息对象，包含名称、图标和颜色
 */
export function getPlatformInfo(url?: string) {
  if (!url) return null;
  
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    
    // 匹配平台
    if (hostname.includes('netflix.com')) {
      return { 
        name: 'Netflix', 
        icon: 'netflix',
        color: '#E50914',
        url
      };
    } else if (hostname.includes('primevideo.com') || hostname.includes('amazon.com')) {
      return { 
        name: 'Prime Video', 
        icon: 'primevideo',
        color: '#00A8E1',
        url
      };
    } else if (hostname.includes('disneyplus.com')) {
      return { 
        name: 'Disney+', 
        icon: 'disneyplus',
        color: '#0063E5',
        url
      };
    } else if (hostname.includes('hbomax.com') || hostname.includes('max.com')) {
      return { 
        name: 'HBO Max', 
        icon: 'hbomax',
        color: '#5822B4',
        url
      };
    } else if (hostname.includes('bilibili.com')) {
      return { 
        name: 'Bilibili', 
        icon: 'bilibili',
        color: '#FB7299',
        url
      };
    } else if (hostname.includes('iqiyi.com')) {
      return { 
        name: '爱奇艺', 
        icon: 'iqiyi',
        color: '#00be06',
        url
      };
    } else if (hostname.includes('youku.com')) {
      return { 
        name: '优酷', 
        icon: 'youku',
        color: '#00A8FF',
        url
      };
    } else if (hostname.includes('qq.com') || hostname.includes('v.qq.com')) {
      return { 
        name: '腾讯视频', 
        icon: 'tencent',
        color: '#FF9C00',
        url
      };
    } else if (hostname.includes('apple.com') || hostname.includes('tv.apple.com')) {
      return { 
        name: 'Apple TV+', 
        icon: 'appletv',
        color: '#000000',
        url
      };
    } else if (hostname.includes('hulu.com')) {
      return { 
        name: 'Hulu', 
        icon: 'hulu',
        color: '#1CE783',
        url
      };
    } else if (hostname.includes('peacocktv.com')) {
      return { 
        name: 'Peacock', 
        icon: 'peacock',
        color: '#000000',
        url
      };
    } else {
      // 提取域名作为名称
      const domainParts = hostname.split('.');
      const name = domainParts.length >= 2 ? 
        domainParts[domainParts.length - 2].charAt(0).toUpperCase() + 
        domainParts[domainParts.length - 2].slice(1) : 
        hostname;
      
      return { 
        name, 
        icon: 'generic',
        color: '#666666',
        url
      };
    }
  } catch (error) {
    console.error("URL解析错误:", error);
    return { 
      name: '未知平台', 
      icon: 'generic',
      color: '#666666',
      url
    };
  }
} 