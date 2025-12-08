import { NextRequest } from 'next/server';
import { AuthManager } from './auth-manager';

/**
 * 获取用户ID
 * 优先从认证头获取，否则返回系统管理员用户ID
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string> {
  // 从请求头获取用户ID
  const userIdFromHeader = request.headers.get('x-user-id');
  
  if (userIdFromHeader) {
    return userIdFromHeader;
  }
  
  // 如果没有提供用户ID，返回系统管理员用户ID
  return AuthManager.getSystemUserId();
}