import { NextRequest, NextResponse } from 'next/server';
import { getUpdateManager } from '@/lib/updates/update-manager';
import packageJson from '../../../../../package.json';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const force = searchParams.get('force') === 'true';

  try {
    const updateManager = getUpdateManager();
    const result = await updateManager.checkForUpdates(packageJson.version, force);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Update check error:', error);

    try {
      const updateManager = getUpdateManager();
      const cached = await updateManager.checkForUpdates(packageJson.version, true);

      return NextResponse.json({
        success: true,
        data: {
          ...cached,
          isCached: true,
          error: error instanceof Error ? error.message : '检查更新失败',
        },
      });
    } catch {
      return NextResponse.json({
        success: false,
        error: '检查更新失败，请稍后重试',
      }, { status: 500 });
    }
  }
}