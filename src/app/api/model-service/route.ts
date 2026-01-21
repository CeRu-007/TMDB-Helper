import { NextRequest, NextResponse } from 'next/server'
import { ModelServiceStorage } from '@/lib/data/model-service-storage'
import { ModelServiceConfig } from '@/shared/types/model-service'

// Standardized error response helper
function createErrorResponse(message: string, status: number = 500) {
  console.error(`模型服务API错误: ${message}`)
  return NextResponse.json({
    success: false,
    error: message
  }, { status })
}

// Standardized success response helper
function createSuccessResponse(data: any, message?: string) {
  return NextResponse.json({
    success: true,
    ...(message && { message }),
    ...data
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

// Action handlers mapping for better maintainability
const ACTION_HANDLERS = {
  'add-provider': (data: any) => ModelServiceStorage.addProvider(data),
  'update-provider': (data: any) => ModelServiceStorage.updateProvider(data),
  'delete-provider': (data: any) => ModelServiceStorage.deleteProvider(data.id),
  'add-model': (data: any) => ModelServiceStorage.addModel(data),
  'update-model': (data: any) => ModelServiceStorage.updateModel(data),
  'delete-model': (data: any) => ModelServiceStorage.deleteModel(data.id),
  'update-scenario': (data: any) => ModelServiceStorage.updateScenarios(Array.isArray(data) ? data : [data]),
  'update-scenarios': (data: any) => ModelServiceStorage.updateScenarios(Array.isArray(data) ? data : [data])
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
      console.log(`更新场景: ${count} 个场景已更新`)
    }

    const updatedConfig = await ModelServiceStorage.getConfig()
    return createSuccessResponse({ config: updatedConfig }, '操作成功')
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : '更新配置失败'
    )
  }
}

