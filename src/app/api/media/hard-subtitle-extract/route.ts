import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { HardSubtitleExtractTask, TaskStatus } from './types'

// 任务存储（内存中，生产环境应使用数据库）
const tasks = new Map<string, HardSubtitleExtractTask>()

/**
 * POST /api/media/hard-subtitle-extract
 * 启动硬字幕提取任务
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    // 获取视频文件或URL
    const videoFile = formData.get('video') as File | null
    const videoUrl = formData.get('videoUrl') as string | null
    const configStr = formData.get('config') as string | null

    if (!videoFile && !videoUrl) {
      return NextResponse.json(
        { error: '请提供视频文件或视频URL' },
        { status: 400 }
      )
    }

    const config = configStr ? JSON.parse(configStr) : {}

    // 创建任务ID
    const taskId = uuidv4()

    // 创建任务
    const task: HardSubtitleExtractTask = {
      id: taskId,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      config: {
        vadThreshold: config.vadThreshold ?? 30,
        minSpeechDuration: config.minSpeechDuration ?? 1.0,
        silenceThreshold: config.silenceThreshold ?? 0.5,
        sampleInterval: config.sampleInterval ?? 2.0,
        useVAD: config.useVAD ?? true,
        ocrModelId: config.ocrModelId ?? 'qwen-vl',
        subtitleRegions: config.subtitleRegions ?? []
      },
      videoUrl: videoUrl || undefined,
      videoFileName: videoFile?.name || undefined,
      result: undefined,
      error: undefined
    }

    // 保存任务
    tasks.set(taskId, task)

    // 启动异步处理
    processTask(taskId, videoFile).catch(console.error)

    return NextResponse.json({
      success: true,
      taskId
    })
  } catch (error) {
    console.error('启动任务失败:', error)
    return NextResponse.json(
      {
        error: '启动任务失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/media/hard-subtitle-extract?taskId=xxx
 * 查询任务状态
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: '缺少taskId参数' },
        { status: 400 }
      )
    }

    const task = tasks.get(taskId)

    if (!task) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      result: task.result,
      error: task.error
    })
  } catch (error) {
    console.error('查询任务状态失败:', error)
    return NextResponse.json(
      {
        error: '查询任务状态失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

/**
 * 处理任务
 */
async function processTask(taskId: string, videoFile: File | null) {
  const task = tasks.get(taskId)
  if (!task) return

  try {
    task.status = 'processing'
    task.updatedAt = Date.now()
    tasks.set(taskId, task)

    // 步骤1: 处理视频文件
    task.progress = 5
    task.statusMessage = '正在处理视频...'
    tasks.set(taskId, task)

    // 这里需要集成 ffmpeg 处理视频
    // 暂时使用模拟数据
    await simulateStep(1000)

    // 步骤2: 提取音频并进行VAD检测
    task.progress = 15
    task.statusMessage = '正在进行语音检测...'
    tasks.set(taskId, task)

    await simulateStep(1500)

    // 步骤3: 采样视频帧
    task.progress = 30
    task.statusMessage = '正在采样视频帧...'
    tasks.set(taskId, task)

    await simulateStep(1000)

    // 步骤4: OCR识别
    task.progress = 50
    task.statusMessage = '正在进行OCR识别...'
    tasks.set(taskId, task)

    await simulateStep(3000)

    // 步骤5: 生成字幕
    task.progress = 80
    task.statusMessage = '正在生成字幕...'
    tasks.set(taskId, task)

    await simulateStep(1000)

    // 步骤6: 完成
    task.progress = 100
    task.statusMessage = '完成'
    task.status = 'completed'
    task.updatedAt = Date.now()

    // 生成模拟结果
    task.result = {
      subtitles: [
        {
          id: '1',
          index: 1,
          startTime: '00:00:01,000',
          endTime: '00:00:03,500',
          text: '这是一个测试字幕',
          confidence: 0.95
        },
        {
          id: '2',
          index: 2,
          startTime: '00:00:04,000',
          endTime: '00:00:06,500',
          text: '硬字幕提取功能测试',
          confidence: 0.92
        }
      ],
      frames: [
        {
          timestamp: 1.5,
          imageUrl: '/api/media/hard-subtitle-extract/frame/1',
          recognizedText: '这是一个测试字幕',
          confidence: 0.95
        },
        {
          timestamp: 5.0,
          imageUrl: '/api/media/hard-subtitle-extract/frame/2',
          recognizedText: '硬字幕提取功能测试',
          confidence: 0.92
        }
      ],
      srtContent: `1
00:00:01,000 --> 00:00:03,500
这是一个测试字幕

2
00:00:04,000 --> 00:00:06,500
硬字幕提取功能测试
`
    }

    tasks.set(taskId, task)

  } catch (error) {
    task.status = 'error'
    task.error = error instanceof Error ? error.message : '未知错误'
    task.updatedAt = Date.now()
    tasks.set(taskId, task)
  }
}

/**
 * 模拟处理步骤（实际实现时替换为真实逻辑）
 */
async function simulateStep(duration: number) {
  return new Promise(resolve => setTimeout(resolve, duration))
}
