import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { logger } from '@/lib/utils/logger';

/**
 * CSV文件验证API
 * 用于验证指定文件路径的CSV文件是否存在且有效
 */
export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json({
        success: false,
        error: '缺少文件路径参数'
      }, { status: 400 });
    }

    // 检查文件是否存在
    const exists = fs.existsSync(filePath);

    if (!exists) {
      return NextResponse.json({
        success: false,
        exists: false,
        error: '文件不存在'
      }, { status: 404 });
    }

    // 检查文件是否为空
    const stats = fs.statSync(filePath);
    const isEmpty = stats.size === 0;

    if (isEmpty) {
      return NextResponse.json({
        success: false,
        exists: true,
        isEmpty: true,
        error: '文件为空'
      }, { status: 400 });
    }

    // 尝试读取和解析CSV文件以验证格式
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        return NextResponse.json({
          success: false,
          exists: true,
          isEmpty: true,
          error: '文件内容为空'
        }, { status: 400 });
      }

      // 验证CSV格式（基本验证）
      const firstLine = lines[0];
      if (!firstLine) {
        return NextResponse.json({
          success: false,
          exists: true,
          isEmpty: true,
          error: '文件为空'
        }, { status: 400 });
      }
      const hasComma = firstLine.includes(',');

      if (!hasComma) {
        return NextResponse.json({
          success: false,
          exists: true,
          isEmpty: false,
          error: '文件格式无效：缺少逗号分隔符'
        }, { status: 400 });
      }

      // 返回验证成功的信息
      return NextResponse.json({
        success: true,
        exists: true,
        isEmpty: false,
        fileSize: stats.size,
        lastModified: stats.mtime,
        message: '文件验证成功'
      });

    } catch (readError) {
      return NextResponse.json({
        success: false,
        exists: true,
        isEmpty: false,
        error: '文件读取失败',
        details: {
          error: readError instanceof Error ? readError.message : String(readError)
        }
      }, { status: 400 });
    }

  } catch (error) {
    logger.error('[API] CSV验证错误:', error);

    return NextResponse.json({
      success: false,
      error: '验证CSV文件失败',
      details: {
        error: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}