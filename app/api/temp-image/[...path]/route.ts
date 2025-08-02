import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// 临时文件目录
const TEMP_DIR = path.join(process.cwd(), 'temp', 'video-analysis');

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 构建文件路径
    const filePath = path.join(TEMP_DIR, ...params.path);
    
    // 安全检查：确保路径在临时目录内
    const normalizedPath = path.normalize(filePath);
    const normalizedTempDir = path.normalize(TEMP_DIR);
    
    if (!normalizedPath.startsWith(normalizedTempDir)) {
      return NextResponse.json({
        error: '非法的文件路径'
      }, { status: 403 });
    }
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({
        error: '文件不存在'
      }, { status: 404 });
    }
    
    // 读取文件
    const fileBuffer = await fs.readFile(filePath);
    
    // 根据文件扩展名设置Content-Type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }
    
    // 返回文件
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300', // 缓存5分钟
      },
    });
    
  } catch (error) {
    console.error('读取临时文件失败:', error);
    return NextResponse.json({
      error: '读取文件失败'
    }, { status: 500 });
  }
}
