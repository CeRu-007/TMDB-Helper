import { NextResponse } from 'next/server';
import { getDatabaseAsync } from '@/lib/database/connection';
import { initializeSchema } from '@/lib/database/schema';
import { AuthService } from '@/lib/auth/auth-service';

export async function GET() {
  try {
    await getDatabaseAsync();
    await initializeSchema();

    const hasAdmin = AuthService.hasAdmin();

    return NextResponse.json({
      success: true,
      initialized: hasAdmin,
      message: hasAdmin ? '系统已初始化' : '系统未初始化，等待管理员注册',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, initialized: false, message: '初始化检查失败' },
      { status: 503 }
    );
  }
}
