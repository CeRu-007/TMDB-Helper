import { NextRequest, NextResponse } from 'next/server';
import { AuthManager, LoginRequest } from '@/lib/auth-manager';

/**
 * POST /api/auth/login - 用户登录
 */
export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { username, password, rememberMe = false } = body;

    // 验证输入
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 验证登录
    const user = await AuthManager.validateLogin(username, password);
    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 生成JWT Token
    const token = AuthManager.generateToken(user, rememberMe);

    // 创建响应
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        lastLoginAt: user.lastLoginAt
      },
      message: '登录成功'
    });

    // 设置httpOnly cookie
    const maxAge = rememberMe 
      ? user.sessionExpiryDays * 2 * 24 * 60 * 60 // 记住我：双倍有效期
      : user.sessionExpiryDays * 24 * 60 * 60;     // 正常：默认有效期

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/'
    });

    console.log(`[Auth] 用户登录成功: ${username}`);
    return response;

  } catch (error) {
    console.error('[Auth] 登录处理失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
