import { NextRequest, NextResponse } from 'next/server';
import { AuthManager } from './auth-manager';

/**
 * 认证中间件 - 验证API请求的认证状态
 */
export class AuthMiddleware {
  /**
   * 验证请求的认证状态
   */
  static async verifyRequest(request: NextRequest): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // 获取 token
      const token = request.cookies.get('auth-token')?.value;

      if (!token) {
        return { success: false, error: '未找到认证信息' };
      }

      // 验证token
      const decoded = AuthManager.verifyToken(token);
      if (!decoded) {
        return { success: false, error: '认证信息无效' };
      }

      // 检查用户是否存在
      const adminUser = AuthManager.getAdminUser();
      if (!adminUser) {
        return { success: false, error: '用户不存在' };
      }

      return {
        success: true,
        userId: AuthManager.getSystemUserId()
      };

    } catch (error) {
      console.error('[Auth] 认证中间件错误:', error);

      return { success: false, error: '服务器内部错误' };
    }
  }

  /**
   * 创建认证错误响应
   */
  static createAuthErrorResponse(error: string, status: number = 401): NextResponse {
    return NextResponse.json(
      { success: false, error },
      { status }
    );
  }

  /**
   * 保护API路由的装饰器函数
   */
  static withAuth<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const authResult = await AuthMiddleware.verifyRequest(request);
      
      if (!authResult.success) {
        return AuthMiddleware.createAuthErrorResponse(authResult.error || '认证失败');
      }

      // 将用户ID添加到请求头中，供后续处理使用
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', authResult.userId!);
      
      const modifiedRequest = new NextRequest(request.url, {
        method: request.method,
        headers: requestHeaders,
        body: request.body,
      });

      return handler(modifiedRequest, ...args);
    };
  }
}

/**
 * 从请求中获取用户ID的辅助函数
 */
export function getUserIdFromAuthRequest(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}
