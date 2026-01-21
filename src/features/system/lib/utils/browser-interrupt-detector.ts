/**
 * 浏览器中断检测器
 * 用于区分用户主动关闭浏览器与系统错误
 */

export interface BrowserInterruptResult {
  isUserInterrupted: boolean;
  errorType: 'user_closed' | 'system_error' | 'timeout' | 'unknown';
  message: string;
  details?: Record<string, unknown>;
}

export class BrowserInterruptDetector {

  /**
   * 分析错误信息，判断是否为用户主动中断
   */
  static analyzeError(error: unknown, stdout?: string, stderr?: string): BrowserInterruptResult {
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || '';
    const stdoutText = stdout || '';
    const stderrText = stderr || '';
    
    // 合并所有错误信息进行分析
    const allErrorText = [errorMessage, errorStack, stdoutText, stderrText]
      .join(' ')
      .toLowerCase();

    // 检测用户主动关闭浏览器的特征
    const userClosePatterns = [
      // 浏览器窗口被用户关闭
      'user closed',
      'window closed',
      'browser closed',
      'session closed',
      'connection closed',
      'disconnected',
      
      // Selenium/WebDriver 相关的用户关闭
      'no such window',
      'target window already closed',
      'invalid session id',
      'session not created',
      'chrome not reachable',
      'edge not reachable',
      
      // 进程被用户终止
      'process terminated',
      'killed by user',
      'sigterm',
      'sigkill',
      
      // 浏览器进程异常退出（通常是用户关闭）
      'browser process exited',
      'browser crashed',
      'unexpected exit',
      
      // 网络连接中断（可能是用户关闭）
      'connection reset',
      'connection refused',
      'network error',
      
      // Python selenium 特定错误
      'webdriver exception',
      'selenium.common.exceptions',
      'max retries exceeded',
      
      // Edge 浏览器特定错误
      'msedge.exe',
      'edge driver',
      'edgedriver'
    ];
    
    // 检测系统错误的特征
    const systemErrorPatterns = [
      // 权限错误
      'permission denied',
      'access denied',
      'unauthorized',
      
      // 文件系统错误
      'file not found',
      'no such file',
      'directory not found',
      
      // 网络配置错误
      'dns resolution failed',
      'host not found',
      'certificate error',
      
      // 系统资源错误
      'out of memory',
      'disk full',
      'resource unavailable',
      
      // 配置错误
      'invalid configuration',
      'missing dependency',
      'module not found'
    ];
    
    // 检测超时错误
    const timeoutPatterns = [
      'timeout',
      'timed out',
      'time limit exceeded',
      'deadline exceeded',
      'operation timeout'
    ];
    
    // 优先检查超时
    if (timeoutPatterns.some(pattern => allErrorText.includes(pattern))) {
      return {
        isUserInterrupted: false,
        errorType: 'timeout',
        message: '操作超时',
        details: { originalError: errorMessage }
      };
    }
    
    // 检查系统错误
    if (systemErrorPatterns.some(pattern => allErrorText.includes(pattern))) {
      return {
        isUserInterrupted: false,
        errorType: 'system_error',
        message: '系统错误',
        details: { originalError: errorMessage }
      };
    }
    
    // 检查用户中断
    if (userClosePatterns.some(pattern => allErrorText.includes(pattern))) {
      return {
        isUserInterrupted: true,
        errorType: 'user_closed',
        message: '用户主动关闭了浏览器',
        details: { originalError: errorMessage }
      };
    }
    
    // 特殊处理：检查进程退出码
    if (error?.code !== undefined || error?.signal !== undefined) {
      const exitCode = error.code;
      const signal = error.signal;
      
      // 常见的用户中断信号
      if (signal === 'SIGTERM' || signal === 'SIGKILL' || signal === 'SIGINT') {
        return {
          isUserInterrupted: true,
          errorType: 'user_closed',
          message: `进程被用户终止 (信号: ${signal})`,
          details: { exitCode, signal, originalError: errorMessage }
        };
      }
      
      // 异常退出码通常表示用户关闭
      if (exitCode && exitCode !== 0) {
        return {
          isUserInterrupted: true,
          errorType: 'user_closed',
          message: `浏览器异常退出 (退出码: ${exitCode})`,
          details: { exitCode, signal, originalError: errorMessage }
        };
      }
    }
    
    // 默认情况：未知错误，但倾向于认为是用户操作
    // 因为大多数情况下浏览器关闭都是用户主动的
    return {
      isUserInterrupted: true,
      errorType: 'unknown',
      message: '未知错误，可能是用户操作导致',
      details: { originalError: errorMessage }
    };
  }
  
  /**
   * 检查是否为常见的用户中断场景
   */
  static isCommonUserInterrupt(error: unknown): boolean {
    const result = this.analyzeError(error);
    return result.isUserInterrupted;
  }
  
  /**
   * 生成用户友好的错误消息
   */
  static generateUserFriendlyMessage(result: BrowserInterruptResult): string {
    switch (result.errorType) {
      case 'user_closed':
        return '检测到您主动关闭了浏览器，任务已停止执行';
      case 'timeout':
        return '操作超时，可能是网络问题或页面加载过慢';
      case 'system_error':
        return '系统错误，请检查配置和环境';
      case 'unknown':
      default:
        return '任务被中断，可能是用户操作导致';
    }
  }
}
