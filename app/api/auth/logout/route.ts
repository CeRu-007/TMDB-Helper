import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout - 用户登出
 */
export async function POST(request: NextRequest) {
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

    console.log('[Auth] 用户登出成功');
    return response;

  } catch (error) {
    console.error('[Auth] 登出处理失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
