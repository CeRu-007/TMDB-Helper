import { schedulePlatformManager } from './platform-manager'
import { bilibiliAdapter } from './adapters/bilibili-adapter'
import { tencentAdapter } from './adapters/tencent-adapter'

// 注册所有可用的平台适配器
export function initializePlatformAdapters() {
  schedulePlatformManager.registerAdapter(bilibiliAdapter)

  // 其他平台适配器待实现
  // schedulePlatformManager.registerAdapter(tencentAdapter)
}

export const PLATFORM_CONFIG = {
  enabled: ['bilibili'],
  metadata: {
    bilibili: {
      name: '哔哩哔哩',
      description: '主流动漫平台，拥有丰富的番剧资源',
      features: ['时间表', '追番', '弹幕'],
      apiVersion: 'v1'
    },
    'tencent-video': {
      name: '腾讯视频',
      description: '腾讯旗下视频平台，动漫资源丰富',
      features: ['时间表', 'VIP内容', '独播'],
      apiVersion: 'v1',
      status: 'not-implemented'
    }
  }
}

// 初始化函数
export function initializeScheduleModule() {
  initializePlatformAdapters()
}