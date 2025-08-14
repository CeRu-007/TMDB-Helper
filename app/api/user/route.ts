import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

/**
 * 用户身份识别API
 * 单用户（管理员）模式 - 始终返回admin用户
 */

const SESSION_COOKIE_NAME = 'tmdb_helper_session';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1年
const ADMIN_USER_ID = 'user_admin_system'; // 固定的管理员用户ID

/**
 * 从请求中提取用户ID（单用户模式 - 始终返回admin）
 */
async function extractUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // 在单用户模式下，始终返回admin用户ID
  return ADMIN_USER_ID;
}

/**
 * 生成新的用户ID（单用户模式 - 始终返回admin）
 */
function generateUserId(): string {
  return ADMIN_USER_ID;
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
    let userId = await extractUserIdFromRequest(request);
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

    let userId = providedUserId || await extractUserIdFromRequest(request);

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
    const userId = await extractUserIdFromRequest(request);

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
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  return await extractUserIdFromRequest(request);
}

/**
 * 验证请求中的用户ID（供其他API使用）
 */
export async function validateUserIdFromRequest(request: NextRequest): Promise<{
  isValid: boolean;
  userId: string | null;
  error?: string
}> {
  const userId = await extractUserIdFromRequest(request);
  
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
