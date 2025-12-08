// Docker 版本管理相关 API 已移除
// 保留最小可用的占位实现，避免构建错误

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    feature: 'docker-version',
    removed: true,
    message: 'Docker 版本管理功能已移除'
  }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({
    error: 'Docker 版本管理功能已移除'
  }, { status: 410 })
}