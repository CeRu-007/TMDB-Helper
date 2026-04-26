import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { initializeSchema } from '@/lib/database/schema';
import { getDatabaseAsync } from '@/lib/database/connection';
import { logger } from '@/lib/utils/logger';

export async function GET(_request: NextRequest) {
  try {
    await getDatabaseAsync();
    await initializeSchema();
    const hasAdmin = AuthService.hasAdmin();
    return NextResponse.json({
      success: true,
      hasAdmin,
      message: hasAdmin ? '管理员已存在' : '尚未注册管理员',
    });
  } catch (error) {
    logger.error('[Auth] 检查管理员状态失败:', error);
    return NextResponse.json(
      { success: false, error: '检查失败', hasAdmin: false },
      { status: 500 }
    );
  }
}
