import { NextRequest, NextResponse } from 'next/server';
import { configRepository } from '@/lib/database/repositories/config.repository';
import { getDatabaseAsync } from '@/lib/database/connection';
import { initializeSchema } from '@/lib/database/schema';
import { logger } from '@/lib/utils/logger';

const CONFIG_KEY = 'streaming_platform_preferences';

interface PlatformPreferences {
  favorites: string[];
  order: string[];
  recentlyUsed: string[];
}

const defaultPreferences: PlatformPreferences = {
  favorites: [],
  order: [],
  recentlyUsed: [],
};

/**
 * GET /api/platform/preferences - 获取流媒体平台偏好设置
 */
export async function GET(): Promise<NextResponse> {
  try {
    await getDatabaseAsync();
    await initializeSchema();

    const prefs = await configRepository.get<PlatformPreferences>(CONFIG_KEY);
    return NextResponse.json({
      success: true,
      data: prefs ?? defaultPreferences,
    });
  } catch (error) {
    logger.error('[PlatformPreferences] 读取失败:', error);
    return NextResponse.json({ success: false, error: '读取偏好设置失败' }, { status: 500 });
  }
}

/**
 * PUT /api/platform/preferences - 更新流媒体平台偏好设置
 * Body: { favorites?: string[], order?: string[], recentlyUsed?: string[] }
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    await getDatabaseAsync();
    await initializeSchema();

    const body = (await request.json()) as Partial<PlatformPreferences>;

    // 读取当前值，合并更新
    const current =
      (await configRepository.get<PlatformPreferences>(CONFIG_KEY)) ?? defaultPreferences;

    const updated: PlatformPreferences = {
      favorites: body.favorites ?? current.favorites,
      order: body.order ?? current.order,
      recentlyUsed: body.recentlyUsed ?? current.recentlyUsed,
    };

    const result = await configRepository.set(CONFIG_KEY, updated);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? '保存失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('[PlatformPreferences] 保存失败:', error);
    return NextResponse.json({ success: false, error: '保存偏好设置失败' }, { status: 500 });
  }
}
