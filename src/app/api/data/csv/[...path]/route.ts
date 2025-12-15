import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { parseCsvContent } from '@/lib/data/csv-processor-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathArray } = await params;
  const action = pathArray[0];

  try {
    switch (action) {
      case 'files':
        return handleGetFiles(request);
      default:
        return NextResponse.json(
          { success: false, error: `不支持的GET操作: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathArray } = await params;
  const action = pathArray[0];

  try {
    switch (action) {
      case 'read':
        return handleReadCsv(request);
      case 'save':
        return handleSaveCsv(request);
      case 'verify':
        return handleVerifyCsv(request);
      case 'upload':
        return handleUploadCsv(request);
      default:
        return NextResponse.json(
          { success: false, error: `不支持的POST操作: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathArray } = await params;
  const action = pathArray[0];

  try {
    switch (action) {
      case 'delete':
        return handleDeleteCsv(request);
      default:
        return NextResponse.json(
          { success: false, error: `不支持的DELETE操作: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 },
    );
  }
}

// 处理读取CSV文件 - 使用原始parseCsvContent函数
async function handleReadCsv(request: NextRequest) {
  try {
    const { workingDirectory } = await request.json();

    if (!workingDirectory) {
      return NextResponse.json(
        { success: false, error: '缺少工作目录参数' },
        { status: 400 },
      );
    }

    const filePath = path.join(workingDirectory, 'import.csv');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: `文件不存在: ${filePath}` },
        { status: 404 },
      );
    }

    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf-8');

    // 使用原始的parseCsvContent函数解析CSV内容
    const csvData = parseCsvContent(content);

    return NextResponse.json({ success: true, data: csvData });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '读取CSV文件失败' },
      { status: 500 },
    );
  }
}

// 处理保存CSV文件 - 兼容组件的调用方式
async function handleSaveCsv(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { filePath, content, data } = requestData;

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: '缺少文件路径参数' },
        { status: 400 },
      );
    }

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let csvContent = '';

    // 处理不同的数据格式
    if (content) {
      // 直接传递的文本内容
      csvContent = content;
    } else if (data) {
      // 传递的结构化数据，需要序列化
      const { serializeCsvData } =
        await import('@/lib/data/csv-processor-client');
      csvContent = serializeCsvData(data);
    } else {
      csvContent = '';
    }

    // 写入文件
    fs.writeFileSync(filePath, csvContent, 'utf-8');

    return NextResponse.json({ success: true, message: 'CSV文件保存成功' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '保存CSV文件失败' },
      { status: 500 },
    );
  }
}

// 处理验证CSV文件
async function handleVerifyCsv(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: '缺少文件路径参数' },
        { status: 400 },
      );
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: true,
        exists: false,
        message: '文件不存在',
      });
    }

    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    return NextResponse.json({
      success: true,
      exists: true,
      size: stats.size,
      lineCount: lines.length,
      lastModified: stats.mtime.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '验证CSV文件失败' },
      { status: 500 },
    );
  }
}

// 处理上传CSV文件
async function handleUploadCsv(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: '文件上传功能需要进一步实现' },
    { status: 501 },
  );
}

// 处理删除CSV文件
async function handleDeleteCsv(request: NextRequest) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: '缺少文件路径参数' },
        { status: 400 },
      );
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: '文件不存在' },
        { status: 404 },
      );
    }

    fs.unlinkSync(filePath);

    return NextResponse.json({ success: true, message: 'CSV文件删除成功' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '删除CSV文件失败' },
      { status: 500 },
    );
  }
}

// 处理获取文件列表
async function handleGetFiles(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const workingDirectory = url.searchParams.get('workingDirectory');

    if (!workingDirectory) {
      return NextResponse.json(
        { success: false, error: '缺少工作目录参数' },
        { status: 400 },
      );
    }

    if (!fs.existsSync(workingDirectory)) {
      return NextResponse.json({ success: true, files: [] });
    }

    const files = fs
      .readdirSync(workingDirectory)
      .filter((file) => file.endsWith('.csv'))
      .map((file) => {
        const filePath = path.join(workingDirectory, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
        };
      });

    return NextResponse.json({ success: true, files });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '获取文件列表失败' },
      { status: 500 },
    );
  }
}
