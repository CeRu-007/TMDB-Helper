import { NextRequest, NextResponse } from 'next/server';
import { ServerUserManager } from '@/lib/server-user-manager';
import { AuthMiddleware } from '@/lib/auth-middleware';

/**
 * POST /api/user/migrate - 迁移用户数据
 */
export const POST = AuthMiddleware.withAuth(async (request: NextRequest) => {
  try {
    const clientData = await request.json();
    
    // 验证数据格式
    if (!clientData || typeof clientData !== 'object') {
      return NextResponse.json(
        { success: false, error: '无效的数据格式' },
        { status: 400 }
      );
    }

    // 迁移数据到服务端
    const success = ServerUserManager.migrateFromClientData(clientData);
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: '用户数据迁移成功' 
      });
    } else {
      return NextResponse.json(
        { success: false, error: '用户数据迁移失败' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('用户数据迁移失败:', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
});