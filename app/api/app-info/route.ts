import { NextResponse } from 'next/server';
import packageJson from '@/package.json';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description || 'TMDB数据管理工具',
        author: packageJson.author || 'TMDB Helper Team',
        homepage: packageJson.homepage || '',
        repository: packageJson.repository || ''
      }
    });
  } catch (error) {
    console.error('获取应用信息失败:', error);
    return NextResponse.json(
      { success: false, error: '获取应用信息失败' },
      { status: 500 }
    );
  }
}