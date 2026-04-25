import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './auth-service';
import { logger } from '@/lib/utils/logger';

export class AuthMiddleware {
  static async verifyRequest(request: NextRequest): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const token = request.cookies.get('auth-token')?.value;

      if (!token) {
        return { success: false, error: '未找到认证信息' };
      }

      const decoded = AuthService.verifyToken(token);
      if (!decoded) {
        return { success: false, error: '认证信息无效' };
      }

      const user = AuthService.getUser();
      if (!user) {
        return { success: false, error: '用户不存在' };
      }

      return {
        success: true,
        userId: decoded.userId
      };

    } catch (error) {
      logger.error('[Auth] 认证中间件错误:', error);

      return { success: false, error: '服务器内部错误' };
    }
  }

  static createAuthErrorResponse(error: string, status: number = 401): NextResponse {
    return NextResponse.json(
      { success: false, error },
      { status }
    );
  }

  static withAuth<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const authResult = await AuthMiddleware.verifyRequest(request);

      if (!authResult.success) {
        return AuthMiddleware.createAuthErrorResponse(authResult.error || '认证失败');
      }

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

export function getUserIdFromAuthRequest(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}
