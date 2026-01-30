import { NextRequest, NextResponse } from 'next/server';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/auth/logout - 用户登出
 */
export async function POST(_request: NextRequest) {
  try {
    // 创建响应
    const response = NextResponse.json({
      success: true,
      message: '登出成功'
    });

    // 清除认证cookie
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error) {
    logger.error('登出失败', error)
    return NextResponse.json(
      { success: false, error: ErrorHandler.toUserMessage(error) },
      { status: ErrorHandler.getStatusCode(error) }
    );
  }
}
