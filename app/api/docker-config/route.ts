import { NextRequest, NextResponse } from 'next/server';
import { DockerConfigManager } from '@/lib/docker-config-manager';

export async function GET() {
  try {
    const config = DockerConfigManager.getConfig();
    
    return NextResponse.json({
      success: true,
      config: {
        tmdbApiKey: config.tmdbApiKey ? '***已配置***' : null,
        tmdbImportPath: config.tmdbImportPath,
        siliconFlowApiKey: config.siliconFlowApiKey ? '***已配置***' : null,
        siliconFlowThumbnailModel: config.siliconFlowThumbnailModel,
        userSettings: config.userSettings,
        appConfig: config.appConfig,
        taskSchedulerConfig: config.taskSchedulerConfig,
        videoThumbnailSettings: config.videoThumbnailSettings,
        generalSettings: config.generalSettings,
        appearanceSettings: config.appearanceSettings,
        isDockerEnvironment: DockerConfigManager.isDockerEnvironment()
      }
    });
  } catch (error) {
    console.error('获取Docker配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tmdbApiKey, 
      tmdbImportPath, 
      siliconFlowApiKey,
      siliconFlowThumbnailModel,
      userSettings,
      appConfig,
      taskSchedulerConfig,
      videoThumbnailSettings,
      generalSettings,
      appearanceSettings,
      action 
    } = body;

    if (action === 'migrate') {
      // 迁移localStorage数据到Docker配置
      const localStorageData = body.localStorageData || {};
      DockerConfigManager.migrateFromLocalStorage(localStorageData);
      
      return NextResponse.json({
        success: true,
        message: '配置迁移成功'
      });
    }

    // 保存TMDB配置
    if (tmdbApiKey) {
      // 验证API密钥格式
      if (!/^[a-f0-9]{32}$/i.test(tmdbApiKey)) {
        return NextResponse.json(
          { success: false, error: 'TMDB API密钥格式不正确' },
          { status: 400 }
        );
      }
      DockerConfigManager.setTmdbApiKey(tmdbApiKey);
    }

    if (tmdbImportPath) {
      DockerConfigManager.setTmdbImportPath(tmdbImportPath);
    }

    // 保存硅基流动API配置
    if (siliconFlowApiKey) {
      DockerConfigManager.setSiliconFlowApiKey(siliconFlowApiKey);
    }

    if (siliconFlowThumbnailModel) {
      const config = DockerConfigManager.getConfig();
      config.siliconFlowThumbnailModel = siliconFlowThumbnailModel;
      DockerConfigManager.saveConfig(config);
    }

    // 保存其他配置
    if (userSettings) {
      DockerConfigManager.setUserSettings(userSettings);
    }

    if (appConfig) {
      DockerConfigManager.setAppConfig(appConfig);
    }

    if (taskSchedulerConfig) {
      DockerConfigManager.setTaskSchedulerConfig(taskSchedulerConfig);
    }

    if (videoThumbnailSettings) {
      DockerConfigManager.setVideoThumbnailSettings(videoThumbnailSettings);
    }

    if (generalSettings) {
      DockerConfigManager.setGeneralSettings(generalSettings);
    }

    if (appearanceSettings) {
      DockerConfigManager.setAppearanceSettings(appearanceSettings);
    }

    return NextResponse.json({
      success: true,
      message: '配置保存成功'
    });
  } catch (error) {
    console.error('保存Docker配置失败:', error);
    return NextResponse.json(
      { success: false, error: '保存配置失败' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    DockerConfigManager.clearConfig();
    
    return NextResponse.json({
      success: true,
      message: '配置清除成功'
    });
  } catch (error) {
    console.error('清除Docker配置失败:', error);
    return NextResponse.json(
      { success: false, error: '清除配置失败' },
      { status: 500 }
    );
  }
}