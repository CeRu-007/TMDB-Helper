import { NextRequest, NextResponse } from 'next/server';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { logger } from '@/lib/utils/logger';

export async function POST(_request: NextRequest) {
  try {
    const isSecure = process.env.COOKIE_SECURE !== undefined
      ? (process.env.COOKIE_SECURE === 'true')
      : (process.env.NODE_ENV === 'production' && process.env.ELECTRON_BUILD !== 'true');

    const response = NextResponse.json({
      success: true,
      message: '登出成功'
    });

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: isSecure,
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
