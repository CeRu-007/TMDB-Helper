import { NextRequest, NextResponse } from 'next/server';

/**
 * 通用路由处理程序
 * 将请求转发到Pages Router的API实现
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // 重定向到Pages Router的API实现
  return NextResponse.redirect(new URL(`/api/csv/${params.path.join('/')}`, request.url));
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // 重定向到Pages Router的API实现
  return NextResponse.redirect(new URL(`/api/csv/${params.path.join('/')}`, request.url));
} 