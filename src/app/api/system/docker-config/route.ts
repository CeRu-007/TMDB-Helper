import { NextRequest, NextResponse } from 'next/server';
import { ServerConfigManager } from '@/lib/data/server-config-manager';
import { TMDB_API_KEY_FALLBACK } from '@/lib/constants/constants';

export async function GET() {
  try {
    if (typeof window !== 'undefined') {
      return NextResponse.json(
        { success: false, error: '此API只能在服务器端调用' },
        { status: 400 }
      );
    }

    const config = ServerConfigManager.getConfig();

    return NextResponse.json({
      success: true,
      config: {
        hasTmdbApiKey: !!(process.env.TMDB_API_KEY || TMDB_API_KEY_FALLBACK),
        tmdbImportPath: config.tmdbImportPath,
        siliconFlowApiKey: config.siliconFlowApiKey ? '***已配置***' : null,
        siliconFlowThumbnailModel: config.siliconFlowThumbnailModel,
        modelScopeApiKey: config.modelScopeApiKey ? '***已配置***' : null,
        modelScopeEpisodeModel: config.modelScopeEpisodeModel,
        generalSettings: config.generalSettings,
        appearanceSettings: config.appearanceSettings,
        videoThumbnailSettings: config.videoThumbnailSettings,
        hasSiliconFlowApiKey: !!config.siliconFlowApiKey,
        hasModelScopeApiKey: !!config.modelScopeApiKey
      }
    });
  } catch (error) {

    return NextResponse.json(
      { success: false, error: `获取配置失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tmdbImportPath,
      siliconFlowApiKey,
      siliconFlowThumbnailModel,
      modelScopeApiKey,
      modelScopeEpisodeModel,
      videoThumbnailSettings,
      generalSettings,
      appearanceSettings,
    } = body;

    if (tmdbImportPath) {
      ServerConfigManager.setConfigItem('tmdbImportPath', tmdbImportPath);
    }

    if (siliconFlowApiKey) {
      ServerConfigManager.setConfigItem('siliconFlowApiKey', siliconFlowApiKey);
    }

    if (siliconFlowThumbnailModel) {
      ServerConfigManager.setConfigItem('siliconFlowThumbnailModel', siliconFlowThumbnailModel);
    }

    if (modelScopeApiKey) {
      ServerConfigManager.setConfigItem('modelScopeApiKey', modelScopeApiKey);
    }

    if (modelScopeEpisodeModel) {
      ServerConfigManager.setConfigItem('modelScopeEpisodeModel', modelScopeEpisodeModel);
    }

    if (generalSettings) {
      ServerConfigManager.setConfigItem('generalSettings', generalSettings);
    }

    if (appearanceSettings) {
      ServerConfigManager.setConfigItem('appearanceSettings', appearanceSettings);
    }

    if (videoThumbnailSettings) {
      ServerConfigManager.setConfigItem('videoThumbnailSettings', videoThumbnailSettings);
    }

    return NextResponse.json({
      success: true,
      message: '配置保存成功'
    });
  } catch (error) {

    return NextResponse.json(
      { success: false, error: `保存配置失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
