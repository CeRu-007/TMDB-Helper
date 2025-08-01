import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

/**
 * 用户身份识别API
 * 处理用户ID的获取和验证
 */

const SESSION_COOKIE_NAME = 'tmdb_helper_session';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1年

/**
 * 从请求中提取用户ID
 */
function extractUserIdFromRequest(request: NextRequest): string | null {
  // 1. 尝试从cookie获取
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (sessionCookie?.value) {
    return sessionCookie.value;
  }

  // 2. 尝试从请求头获取
  const authHeader = request.headers.get('x-user-id');
  if (authHeader) {
    return authHeader;
  }

  // 3. 尝试从查询参数获取
  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get('userId');
  if (userIdParam) {
    return userIdParam;
  }

  return null;
}

/**
 * 生成新的用户ID
 */
function generateUserId(): string {
  return 'user_' + uuidv4().replace(/-/g, '').substring(0, 16);
}

/**
 * 验证用户ID格式
 */
function isValidUserId(userId: string): boolean {
  return /^user_[a-f0-9]{16}$/.test(userId);
}

/**
 * GET /api/user - 获取或创建用户ID
 */
export async function GET(request: NextRequest) {
  try {
    let userId = extractUserIdFromRequest(request);
    let isNewUser = false;

    // 如果没有用户ID或格式无效，创建新的
    if (!userId || !isValidUserId(userId)) {
      userId = generateUserId();
      isNewUser = true;
      console.log(`创建新用户: ${userId}`);
    } else {
      console.log(`现有用户: ${userId}`);
    }

    // 创建响应
    const response = NextResponse.json({
      success: true,
      userId,
      isNewUser,
      timestamp: new Date().toISOString()
    });

    // 设置cookie
    response.cookies.set(SESSION_COOKIE_NAME, userId, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false, // 允许客户端JavaScript访问
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('获取用户ID失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取用户ID失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user - 更新用户信息
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { displayName, avatarUrl, userId: providedUserId } = body;

    let userId = providedUserId || extractUserIdFromRequest(request);

    if (!userId || !isValidUserId(userId)) {
      return NextResponse.json(
        { success: false, error: '无效的用户ID' },
        { status: 400 }
      );
    }

    // 验证头像URL格式（如果提供）
    if (avatarUrl && avatarUrl.trim()) {
      try {
        const url = new URL(avatarUrl.trim());
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return NextResponse.json(
            { success: false, error: '头像URL必须是有效的HTTP或HTTPS地址' },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, error: '无效的头像URL格式' },
          { status: 400 }
        );
      }
    }

    // 这里可以添加更多的用户信息更新逻辑
    // 目前只是简单的验证和响应

    const responseData: any = {
      success: true,
      userId,
      updated: true,
      timestamp: new Date().toISOString()
    };

    if (displayName !== undefined) {
      responseData.displayName = displayName || `用户${userId.substring(5, 11)}`;
    }

    if (avatarUrl !== undefined) {
      responseData.avatarUrl = avatarUrl;
    }

    const response = NextResponse.json(responseData);

    // 确保cookie是最新的
    response.cookies.set(SESSION_COOKIE_NAME, userId, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '更新用户信息失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user - 清除用户数据
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = extractUserIdFromRequest(request);

    if (!userId || !isValidUserId(userId)) {
      return NextResponse.json(
        { success: false, error: '无效的用户ID' },
        { status: 400 }
      );
    }

    // 创建响应
    const response = NextResponse.json({
      success: true,
      message: '用户数据已清除',
      userId,
      timestamp: new Date().toISOString()
    });

    // 删除cookie
    response.cookies.delete(SESSION_COOKIE_NAME);

    return response;
  } catch (error) {
    console.error('清除用户数据失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '清除用户数据失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * 从请求中获取用户ID的辅助函数（供其他API使用）
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  return extractUserIdFromRequest(request);
}

/**
 * 验证请求中的用户ID（供其他API使用）
 */
export function validateUserIdFromRequest(request: NextRequest): { 
  isValid: boolean; 
  userId: string | null; 
  error?: string 
} {
  const userId = extractUserIdFromRequest(request);
  
  if (!userId) {
    return {
      isValid: false,
      userId: null,
      error: '缺少用户ID'
    };
  }
  
  if (!isValidUserId(userId)) {
    return {
      isValid: false,
      userId,
      error: '无效的用户ID格式'
    };
  }
  
  return {
    isValid: true,
    userId
  };
}
