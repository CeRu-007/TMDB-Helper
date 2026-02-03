import { NextRequest, NextResponse } from 'next/server'
import { ModelServiceStorage } from '@/lib/data/model-service-storage'
import { logger } from '@/lib/utils/logger'

// 类型定义
interface ScenarioConfig {
  type: string;
  selectedModelIds: string[];
  primaryModelId: string;
  [key: string]: unknown;
}

interface ModelConfig {
  id: string;
  providerId: string;
  [key: string]: unknown;
}

interface ProviderConfig {
  id: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scenario = searchParams.get('scenario')

    if (!scenario) {
      return NextResponse.json({
        success: false,
        error: '缺少场景参数'
      }, { status: 400 })
    }

    const modelServiceConfig = await ModelServiceStorage.getConfig()

    // 获取场景配置
    const scenarioConfig = modelServiceConfig.scenarios?.find((s: ScenarioConfig) => s.type === scenario)

    if (!scenarioConfig) {
      return NextResponse.json({
        success: false,
        error: `场景 '${scenario}' 不存在`
      }, { status: 404 })
    }

    // 获取该场景的模型 - 同时使用 selectedModelIds 和 primaryModelId
    const selectedModelIds = scenarioConfig.selectedModelIds || []
    const primaryModelId = scenarioConfig.primaryModelId

    // 合并所有模型ID，确保 primaryModelId 被包含
    const allModelIds = [...new Set([...selectedModelIds, primaryModelId].filter(Boolean))]
    const models = modelServiceConfig.models.filter((model: ModelConfig) =>
      allModelIds.includes(model.id)
    )

    // 获取相关的提供商信息
    const providerIds = [...new Set(models.map(m => m.providerId))]
    const providers = modelServiceConfig.providers.filter((provider: ProviderConfig) =>
      providerIds.includes(provider.id)
    )

    return NextResponse.json({
      success: true,
      scenario: scenarioConfig,
      models,
      providers
    })
  } catch (error) {
    logger.error('获取使用场景配置失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}