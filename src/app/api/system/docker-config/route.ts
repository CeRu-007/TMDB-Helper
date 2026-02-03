import { NextRequest, NextResponse } from 'next/server';
import { ServerConfigManager, ServerConfig } from '@/lib/data/server-config-manager';

export async function GET() {
  try {
    // 检查是否在服务器环境中
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
        hasTmdbApiKey: !!process.env.TMDB_API_KEY,
        tmdbImportPath: config.tmdbImportPath,
        siliconFlowApiKey: config.siliconFlowApiKey ? '***已配置***' : null,
        siliconFlowThumbnailModel: config.siliconFlowThumbnailModel,
        modelScopeApiKey: config.modelScopeApiKey ? '***已配置***' : null,
        modelScopeEpisodeModel: config.modelScopeEpisodeModel,
        generalSettings: config.generalSettings,
        appearanceSettings: config.appearanceSettings,
        videoThumbnailSettings: config.videoThumbnailSettings,
        taskSchedulerConfig: config.taskSchedulerConfig,
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
      taskSchedulerConfig,
      videoThumbnailSettings,
      generalSettings,
      appearanceSettings,
      action 
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

    if (taskSchedulerConfig) {
      ServerConfigManager.setConfigItem('taskSchedulerConfig', taskSchedulerConfig);
    }

    return NextResponse.json({
      success: true,
      message: '配置保存成功'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: '保存配置失败' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    ServerConfigManager.resetToDefault();
    
    return NextResponse.json({
      success: true,
      message: '配置已重置为默认值'
    });
  } catch (error) {
    
    return NextResponse.json(
      { success: false, error: `重置配置失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
