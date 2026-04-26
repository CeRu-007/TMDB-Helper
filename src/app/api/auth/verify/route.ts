import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import {
  ApplicationError,
  ErrorHandler,
} from '@/lib/utils/error-handler';
import { authLogger } from '@/lib/utils/logger';
import { initializeSchema } from '@/lib/database/schema';
import { getDatabaseAsync } from '@/lib/database/connection';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await getDatabaseAsync();
    await initializeSchema();

    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: '未找到认证信息', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const decoded = AuthService.verifyToken(token);
    if (!decoded) {
      authLogger.warn('[Auth] Token verification failed for request');
      return NextResponse.json(
        { success: false, error: '认证信息无效', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const user = AuthService.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        lastLoginAt: user.lastLoginAt,
      },
      systemUserId: AuthService.getSystemUserId(),
    });
  } catch (error) {
    if (error instanceof ApplicationError) {
      authLogger.error('Authentication verification failed', error);
      return NextResponse.json(
        {
          success: false,
          error: ErrorHandler.toUserMessage(error),
          code: error.code,
        },
        { status: error.statusCode }
      );
    }

    const err = error instanceof Error ? error : new Error(String(error));
    authLogger.error('Unexpected error during authentication verification', err);
    return NextResponse.json(
      {
        success: false,
        error: ErrorHandler.toUserMessage(err),
      },
      { status: ErrorHandler.getStatusCode(err) }
    );
  }
}
