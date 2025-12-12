import { NextRequest, NextResponse } from 'next/server'
import { ModelServiceStorage } from '@/lib/data/model-service-storage'
import { ModelServiceConfig } from '@/types/model-service'

export async function GET(request: NextRequest) {
  try {
    const modelServiceConfig = await ModelServiceStorage.getConfig()

    return NextResponse.json({
      success: true,
      config: modelServiceConfig
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('获取模型服务配置失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { config } = body

    if (!config) {
      return NextResponse.json({
        success: false,
        error: '缺少配置数据'
      }, { status: 400 })
    }

    await ModelServiceStorage.saveConfig(config)

    return NextResponse.json({
      success: true,
      message: '模型服务配置已保存'
    })
  } catch (error) {
    console.error('保存模型服务配置失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    console.log('PUT /api/model-service:', { action, data: data })

    const currentConfig = await ModelServiceStorage.getConfig()

    switch (action) {
      case 'add-provider':
        await ModelServiceStorage.addProvider(data)
        break
      case 'update-provider':
        await ModelServiceStorage.updateProvider(data)
        break
      case 'delete-provider':
        await ModelServiceStorage.deleteProvider(data.id)
        break
      case 'add-model':
        await ModelServiceStorage.addModel(data)
        break
      case 'update-model':
        await ModelServiceStorage.updateModel(data)
        break
      case 'delete-model':
        await ModelServiceStorage.deleteModel(data.id)
        break
      case 'update-scenario':
      case 'update-scenarios':
        // 如果data是数组，则更新所有场景
        if (Array.isArray(data)) {
          // 替换所有场景
          await ModelServiceStorage.updateScenarios(data)
          console.log('Updated scenarios:', data.length, 'scenarios')
        } else {
          // 单个场景更新
          const scenarios = currentConfig.scenarios.filter(s => s.type !== data.type)
          scenarios.push(data)
          await ModelServiceStorage.updateScenarios(scenarios)
        }
        break
      default:
        return NextResponse.json({
          success: false,
          error: '未知操作'
        }, { status: 400 })
    }

    // 获取更新后的配置
    const updatedConfig = await ModelServiceStorage.getConfig()

    return NextResponse.json({
      success: true,
      message: '操作成功',
      config: updatedConfig
    })
  } catch (error) {
    console.error('更新模型服务配置失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

