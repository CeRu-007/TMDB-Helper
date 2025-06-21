import { NextResponse } from 'next/server';
import { readItems } from '@/lib/server-storage';

// GET /api/storage/items - 获取所有项目
export async function GET() {
  try {
    const items = readItems();
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error('获取项目失败:', error);
    return NextResponse.json(
      { error: '获取项目失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 