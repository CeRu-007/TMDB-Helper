import { NextRequest, NextResponse } from 'next/server'
import { ModelServiceStorage } from '@/lib/data/model-service-storage'
import { ModelServiceConfig, ModelProvider, ModelConfig, UsageScenario } from '@/shared/types/model-service'
import { ApiResponse } from '@/types/common'
import { logger } from '@/lib/utils/logger'

// Standardized error response helper
function createErrorResponse(message: string, status: number = 500) {
  logger.error(`模型服务API错误: ${message}`)
  return NextResponse.json({
    success: false,
    error: message
  }, { status })
}

// Standardized success response helper
function createSuccessResponse<T>(data: T, message?: string) {
  return NextResponse.json<ApiResponse<T>>({
    success: true,
    data,
    ...(message && { message })
  })
}

// Cache control headers for GET requests
const CACHE_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
}

export async function GET(request: NextRequest) {
  try {
    const modelServiceConfig = await ModelServiceStorage.getConfig()
    return createSuccessResponse({ config: modelServiceConfig })
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
    return createSuccessResponse({}, '模型服务配置已保存')
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

// Action handlers mapping for better maintainability
const ACTION_HANDLERS: ActionHandlers = {
  'add-provider': (data: Omit<ModelProvider, 'id' | 'createdAt' | 'updatedAt'>) =>
    ModelServiceStorage.addProvider(data),
  'update-provider': (data: ModelProvider) =>
    ModelServiceStorage.updateProvider(data),
  'delete-provider': (data: { id: string }) =>
    ModelServiceStorage.deleteProvider(data.id),
  'add-model': (data: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>) =>
    ModelServiceStorage.addModel(data),
  'update-model': (data: ModelConfig) =>
    ModelServiceStorage.updateModel(data),
  'delete-model': (data: { id: string }) =>
    ModelServiceStorage.deleteModel(data.id),
  'update-scenario': (data: UsageScenario | UsageScenario[]) =>
    ModelServiceStorage.updateScenarios(Array.isArray(data) ? data : [data]),
  'update-scenarios': (data: UsageScenario[]) =>
    ModelServiceStorage.updateScenarios(data)
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
    return createSuccessResponse({ config: updatedConfig }, '操作成功')
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : '更新配置失败'
    )
  }
}

