import { NextRequest, NextResponse } from 'next/server'
import { ModelServiceStorage } from '@/lib/data/model-service-storage'
import { ModelProvider, ModelConfig, UsageScenario } from '@/shared/types/model-service'
import { logger } from '@/lib/utils/logger'

// Standardized response helper with UTF-8 charset
function createJsonResponse(data: Record<string, unknown>, status: number = 200) {
  const response = NextResponse.json(data, { status })
  response.headers.set('Content-Type', 'application/json; charset=utf-8')
  return response
}

// Standardized error response
function createErrorResponse(message: string, status: number = 500) {
  logger.error(`模型服务API错误: ${message}`)
  return createJsonResponse({ success: false, error: message }, status)
}

export async function GET(request: NextRequest) {
  try {
    const modelServiceConfig = await ModelServiceStorage.getConfig()
    return createJsonResponse({
      success: true,
      config: modelServiceConfig
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : '获取配置失败'
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { config } = body

    if (!config) {
      return createErrorResponse('缺少配置数据', 400)
    }

    await ModelServiceStorage.saveConfig(config)
    return createJsonResponse({
      success: true,
      message: '模型服务配置已保存'
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : '保存配置失败'
    )
  }
}

// Action handler types
type ActionHandler<T> = (data: T) => Promise<void>

interface ActionHandlers {
  'add-provider': ActionHandler<Omit<ModelProvider, 'id' | 'createdAt' | 'updatedAt'>>
  'update-provider': ActionHandler<ModelProvider>
  'delete-provider': ActionHandler<{ id: string }>
  'add-model': ActionHandler<Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>>
  'update-model': ActionHandler<ModelConfig>
  'delete-model': ActionHandler<{ id: string }>
  'update-scenario': ActionHandler<UsageScenario | UsageScenario[]>
  'update-scenarios': ActionHandler<UsageScenario[]>
}

// Action handlers mapping
const ACTION_HANDLERS: ActionHandlers = {
  'add-provider': (data) => ModelServiceStorage.addProvider(data),
  'update-provider': (data) => ModelServiceStorage.updateProvider(data),
  'delete-provider': (data) => ModelServiceStorage.deleteProvider(data.id),
  'add-model': (data) => ModelServiceStorage.addModel(data),
  'update-model': (data) => ModelServiceStorage.updateModel(data),
  'delete-model': (data) => ModelServiceStorage.deleteModel(data.id),
  'update-scenario': (data) =>
    ModelServiceStorage.updateScenarios(Array.isArray(data) ? data : [data]),
  'update-scenarios': (data) => ModelServiceStorage.updateScenarios(data)
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    if (!action || !data) {
      return createErrorResponse('缺少必要参数: action 或 data', 400)
    }

    const handler = ACTION_HANDLERS[action as keyof typeof ACTION_HANDLERS]
    if (!handler) {
      return createErrorResponse(`未知操作: ${action}`, 400)
    }

    await handler(data)

    // Log scenario updates
    if (action.startsWith('update-scenario')) {
      const count = Array.isArray(data) ? data.length : 1
      logger.info(`更新场景: ${count} 个场景已更新`)
    }

    const updatedConfig = await ModelServiceStorage.getConfig()
    return createJsonResponse({
      success: true,
      config: updatedConfig,
      message: '操作成功'
    })
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : '更新配置失败'
    )
  }
}

