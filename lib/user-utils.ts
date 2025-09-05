import { NextRequest } from 'next/server';

/**
 * 临时替代函数 - 获取用户ID
 * 在没有用户管理系统的情况下，返回默认用户ID
 */
export function getUserIdFromRequest(request: NextRequest): string {
  // 简单实现：返回默认用户ID
  // 在实际应用中，这里应该从认证token或session中获取用户ID
  return 'default-user';
}