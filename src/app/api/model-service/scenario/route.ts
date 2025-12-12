import { NextRequest, NextResponse } from 'next/server'
import { ModelServiceStorage } from '@/lib/data/model-service-storage'

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
    const scenarioConfig = modelServiceConfig.scenarios?.find((s: any) => s.type === scenario)

    if (!scenarioConfig || !scenarioConfig.primaryModelId) {
      return NextResponse.json({
        success: true,
        models: [],
        providers: []
      })
    }

    // 获取该场景的模型 - 使用 selectedModelIds 数组
    const selectedModelIds = scenarioConfig.selectedModelIds || []
    const models = modelServiceConfig.models.filter((model: any) =>
      selectedModelIds.includes(model.id)
    )

    // 获取相关的提供商信息
    const providerIds = [...new Set(models.map(m => m.providerId))]
    const providers = modelServiceConfig.providers.filter((provider: any) =>
      providerIds.includes(provider.id)
    )

    return NextResponse.json({
      success: true,
      scenario: scenarioConfig,
      models,
      providers
    })
  } catch (error) {
    console.error('获取使用场景配置失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}