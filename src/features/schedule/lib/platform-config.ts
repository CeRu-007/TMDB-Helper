import { schedulePlatformManager } from './platform-manager'
import { tencentAdapter } from './adapters/tencent-adapter'

// 注册所有可用的平台适配器
export function initializePlatformAdapters() {
  // B站和爱奇艺适配器已在 platform-manager.ts 构造函数中注册

  // 其他平台适配器待实现
  // schedulePlatformManager.registerAdapter(tencentAdapter)
}

export const PLATFORM_CONFIG = {
  enabled: ['bilibili', 'iqiyi'],
  metadata: {
    bilibili: {
      name: '哔哩哔哩',
      description: '主流动漫平台，拥有丰富的番剧资源',
      features: ['时间表', '追番', '弹幕'],
      apiVersion: 'v1'
    },
    iqiyi: {
      name: '爱奇艺',
      description: '国内知名视频平台，提供丰富的动漫和影视内容',
      features: ['时间表', '追番', 'VIP内容'],
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