/**
 * 分布式锁管理器
 * 防止任务重复执行和并发冲突
 */

import { logger } from './logger';

export interface LockInfo {
  id: string;
  taskId: string;
  acquiredAt: string;
  expiresAt: string;
  processId: string;
  lockType: 'task_execution' | 'storage_write' | 'validation';
}

export class DistributedLock {
  private static readonly LOCK_PREFIX = 'tmdb_helper_lock_';
  private static readonly DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5分钟默认超时
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟清理间隔（减少频繁清理）
  private static readonly PROCESS_ID = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // private static cleanupTimer: NodeJS.Timeout | null = null; // 已移除定时器
  private static activeLocks = new Map<string, LockInfo>();

  /**
   * 初始化分布式锁系统
   */
  static initialize(): void {
    // 已移除定时器检查

    logger.info(`[DistributedLock] 初始化分布式锁系统，进程ID: ${this.PROCESS_ID}`);
    
    // 只在启动时清理一次过期锁（移除定时器）
    this.cleanupExpiredLocks();

    // 页面卸载时清理所有锁
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.releaseAllLocks();
      });
    }
  }

  /**
   * 获取锁
   */
  static async acquireLock(
    lockKey: string, 
    lockType: LockInfo['lockType'] = 'task_execution',
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<{ success: boolean; lockId?: string; error?: string }> {
    const fullLockKey = `${this.LOCK_PREFIX}${lockKey}`;
    const lockId = `${this.PROCESS_ID}_${Date.now()}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeout);

    try {
      // 检查是否已存在锁
      const existingLock = await this.getLockInfo(fullLockKey);
      
      if (existingLock) {
        // 检查锁是否过期
        if (new Date(existingLock.expiresAt) > now) {
          // 检查是否是同一进程的锁
          if (existingLock.processId === this.PROCESS_ID) {
            logger.info(`[DistributedLock] 同一进程重复获取锁: ${lockKey}`);
            return { success: true, lockId: existingLock.id };
          }
          
          logger.info(`[DistributedLock] 锁已被占用: ${lockKey}, 占用者: ${existingLock.processId}`);
          return { 
            success: false, 
            error: `锁已被占用，预计释放时间: ${new Date(existingLock.expiresAt).toLocaleString()}` 
          };
        } else {
          // 锁已过期，清理它
          logger.info(`[DistributedLock] 清理过期锁: ${lockKey}`);
          await this.releaseLock(fullLockKey);
        }
      }

      // 创建新锁
      const lockInfo: LockInfo = {
        id: lockId,
        taskId: lockKey,
        acquiredAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        processId: this.PROCESS_ID,
        lockType
      };

      // 尝试原子性地设置锁
      const success = await this.setLockAtomic(fullLockKey, lockInfo);
      
      if (success) {
        this.activeLocks.set(fullLockKey, lockInfo);
        logger.info(`[DistributedLock] 成功获取锁: ${lockKey}, 锁ID: ${lockId}`);
        return { success: true, lockId };
      } else {
        logger.info(`[DistributedLock] 获取锁失败: ${lockKey} (原子操作失败)`);
        return { success: false, error: '获取锁失败，可能存在并发冲突' };
      }

    } catch (error) {
      logger.error(`[DistributedLock] 获取锁时出错: ${lockKey}`, error);
      return { 
        success: false, 
        error: `获取锁时出错: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * 释放锁
   */
  static async releaseLock(lockKey: string): Promise<boolean> {
    const fullLockKey = lockKey.startsWith(this.LOCK_PREFIX) ? lockKey : `${this.LOCK_PREFIX}${lockKey}`;
    
    try {
      const lockInfo = await this.getLockInfo(fullLockKey);
      
      if (lockInfo && lockInfo.processId === this.PROCESS_ID) {
        // 只能释放自己进程的锁
        await this.removeLockFromStorage(fullLockKey);
        this.activeLocks.delete(fullLockKey);
        logger.info(`[DistributedLock] 成功释放锁: ${lockKey}`);
        return true;
      } else if (lockInfo) {
        logger.warn(`[DistributedLock] 尝试释放其他进程的锁: ${lockKey}, 锁拥有者: ${lockInfo.processId}`);
        return false;
      } else {
        logger.info(`[DistributedLock] 锁不存在或已释放: ${lockKey}`);
        return true;
      }
    } catch (error) {
      logger.error(`[DistributedLock] 释放锁时出错: ${lockKey}`, error);
      return false;
    }
  }

  /**
   * 检查锁状态
   */
  static async isLocked(lockKey: string): Promise<boolean> {
    const fullLockKey = `${this.LOCK_PREFIX}${lockKey}`;
    
    try {
      const lockInfo = await this.getLockInfo(fullLockKey);
      
      if (!lockInfo) {
        return false;
      }

      // 检查锁是否过期
      if (new Date(lockInfo.expiresAt) <= new Date()) {
        // 锁已过期，清理它
        await this.releaseLock(fullLockKey);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`[DistributedLock] 检查锁状态时出错: ${lockKey}`, error);
      return false;
    }
  }

  /**
   * 延长锁的有效期
   */
  static async extendLock(lockKey: string, additionalTime: number = this.DEFAULT_TIMEOUT): Promise<boolean> {
    const fullLockKey = `${this.LOCK_PREFIX}${lockKey}`;
    
    try {
      const lockInfo = await this.getLockInfo(fullLockKey);
      
      if (!lockInfo || lockInfo.processId !== this.PROCESS_ID) {
        logger.warn(`[DistributedLock] 无法延长锁，锁不存在或不属于当前进程: ${lockKey}`);
        return false;
      }

      const newExpiresAt = new Date(Date.now() + additionalTime);
      const updatedLockInfo = {
        ...lockInfo,
        expiresAt: newExpiresAt.toISOString()
      };

      const success = await this.setLockAtomic(fullLockKey, updatedLockInfo);
      
      if (success) {
        this.activeLocks.set(fullLockKey, updatedLockInfo);
        logger.info(`[DistributedLock] 成功延长锁: ${lockKey}, 新过期时间: ${newExpiresAt.toLocaleString()}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`[DistributedLock] 延长锁时出错: ${lockKey}`, error);
      return false;
    }
  }

  /**
   * 获取锁信息
   */
  private static async getLockInfo(fullLockKey: string): Promise<LockInfo | null> {
    try {
      // 首先检查内存中的锁
      const memoryLock = this.activeLocks.get(fullLockKey);
      if (memoryLock) {
        return memoryLock;
      }

      // 从服务端获取锁信息
      try {
        const response = await fetch(`/api/system/config?key=lock_${fullLockKey}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.value) {
            return JSON.parse(data.value);
          }
        }
      } catch (error) {
        logger.warn(`获取锁信息失败: ${fullLockKey}`, error);
      }

      return null;
    } catch (error) {
      logger.error(`[DistributedLock] 获取锁信息时出错: ${fullLockKey}`, error);
      return null;
    }
  }

  /**
   * 原子性地设置锁
   */
  private static async setLockAtomic(fullLockKey: string, lockInfo: LockInfo): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // 使用localStorage的原子性操作
        const existingData = localStorage.getItem(fullLockKey);
        
        if (existingData) {
          const existingLock = JSON.parse(existingData);
          // 检查现有锁是否过期
          if (new Date(existingLock.expiresAt) > new Date()) {
            return false; // 锁仍然有效
          }
        }

        localStorage.setItem(fullLockKey, JSON.stringify(lockInfo));
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`[DistributedLock] 原子设置锁时出错: ${fullLockKey}`, error);
      return false;
    }
  }

  /**
   * 从存储中移除锁
   */
  private static async removeLockFromStorage(fullLockKey: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(fullLockKey);
      }
    } catch (error) {
      logger.error(`[DistributedLock] 移除锁时出错: ${fullLockKey}`, error);
    }
  }

  /**
   * 清理过期锁
   */
  private static async cleanupExpiredLocks(): Promise<void> {
    try {
      const now = new Date();
      const expiredLocks: string[] = [];

      // 检查内存中的锁
      for (const [lockKey, lockInfo] of this.activeLocks.entries()) {
        if (new Date(lockInfo.expiresAt) <= now) {
          expiredLocks.push(lockKey);
        }
      }

      // 检查localStorage中的锁
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.LOCK_PREFIX)) {
            try {
              const lockData = localStorage.getItem(key);
              if (lockData) {
                const lockInfo = JSON.parse(lockData);
                if (new Date(lockInfo.expiresAt) <= now) {
                  expiredLocks.push(key);
                }
              }
            } catch (e) {
              // 无效的锁数据，也清理掉
              expiredLocks.push(key);
            }
          }
        }
      }

      // 清理过期锁
      for (const lockKey of expiredLocks) {
        await this.removeLockFromStorage(lockKey);
        this.activeLocks.delete(lockKey);
      }

      if (expiredLocks.length > 0) {
        logger.info(`[DistributedLock] 清理了 ${expiredLocks.length} 个过期锁`);
      }
    } catch (error) {
      logger.error(`[DistributedLock] 清理过期锁时出错:`, error);
    }
  }

  /**
   * 释放所有当前进程的锁
   */
  private static async releaseAllLocks(): Promise<void> {
    logger.info(`[DistributedLock] 释放所有锁，进程ID: ${this.PROCESS_ID}`);
    
    const locksToRelease = Array.from(this.activeLocks.keys());
    
    for (const lockKey of locksToRelease) {
      await this.releaseLock(lockKey);
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 获取所有锁的状态信息
   */
  static async getAllLockStatus(): Promise<{
    activeLocks: LockInfo[];
    expiredLocks: LockInfo[];
    totalLocks: number;
  }> {
    const activeLocks: LockInfo[] = [];
    const expiredLocks: LockInfo[] = [];
    const now = new Date();

    try {
      // 检查localStorage中的所有锁
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.LOCK_PREFIX)) {
            try {
              const lockData = localStorage.getItem(key);
              if (lockData) {
                const lockInfo = JSON.parse(lockData);
                if (new Date(lockInfo.expiresAt) > now) {
                  activeLocks.push(lockInfo);
                } else {
                  expiredLocks.push(lockInfo);
                }
              }
            } catch (e) {
              // 忽略无效的锁数据
            }
          }
        }
      }

      return {
        activeLocks,
        expiredLocks,
        totalLocks: activeLocks.length + expiredLocks.length
      };
    } catch (error) {
      logger.error(`[DistributedLock] 获取锁状态时出错:`, error);
      return {
        activeLocks: [],
        expiredLocks: [],
        totalLocks: 0
      };
    }
  }

  /**
   * 强制清理所有锁（仅用于调试）
   */
  static async forceCleanupAllLocks(): Promise<number> {
    let cleanedCount = 0;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.LOCK_PREFIX)) {
            keysToRemove.push(key);
          }
        }

        for (const key of keysToRemove) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }

      this.activeLocks.clear();
      logger.info(`[DistributedLock] 强制清理了 ${cleanedCount} 个锁`);
      
      return cleanedCount;
    } catch (error) {
      logger.error(`[DistributedLock] 强制清理锁时出错:`, error);
      return cleanedCount;
    }
  }
}

// 自动初始化
if (typeof window !== 'undefined') {
  DistributedLock.initialize();
}