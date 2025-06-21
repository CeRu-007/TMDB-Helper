import { NextRequest, NextResponse } from 'next/server';
import { exportData, importData } from '@/lib/server-storage';

// GET /api/storage/data - 导出数据
export async function GET() {
  try {
    const data = exportData();
    return new NextResponse(data, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="tmdb_helper_data.json"'
      }
    });
  } catch (error) {
    console.error('导出数据失败:', error);
    return NextResponse.json(
      { error: '导出数据失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST /api/storage/data - 导入数据
export async function POST(request: NextRequest) {
  try {
    const jsonData = await request.text();
    
    if (!jsonData) {
      return NextResponse.json({ error: '缺少数据' }, { status: 400 });
    }
    
    const success = importData(jsonData);
    
    if (success) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: '导入数据失败' }, { status: 500 });
    }
  } catch (error) {
    console.error('导入数据失败:', error);
    return NextResponse.json(
      { error: '导入数据失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 