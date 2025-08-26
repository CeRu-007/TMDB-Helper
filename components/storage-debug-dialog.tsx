"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, RefreshCw, AlertTriangle } from 'lucide-react';
import { StorageManager } from '@/lib/storage';

interface StorageStatus {
  hasItems: boolean;
  itemCount: number;
  storageType: 'localStorage' | 'fileStorage';
  isClientEnvironment: boolean;
  isStorageAvailable: boolean;
  lastError?: string;
}

interface StorageDebugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StorageDebugDialog({ open, onOpenChange }: StorageDebugDialogProps) {
  const [loading, setLoading] = useState(false);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [rawData, setRawData] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const checkStorageStatus = async () => {
    setLoading(true);
    try {
      // 获取存储状态
      const status = await StorageManager.getStorageStatus();
      setStorageStatus(status);

      // 获取服务端存储数据
      try {
        const items = await StorageManager.getItemsWithRetry();
        const tasks = await StorageManager.getScheduledTasks();

        setRawData(JSON.stringify({
          items: items || null,
          tasks: tasks || null,
          note: "数据现在存储在服务端data文件夹中"
        }, null, 2));
      } catch (error) {
        setRawData(JSON.stringify({
          error: "无法获取服务端数据",
          message: error instanceof Error ? error.message : "未知错误"
        }, null, 2));
      }
    } catch (error) {
      console.error('检查存储状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearStorage = async () => {
    try {
      // 清空服务端存储
      const response = await fetch('/api/storage/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('服务端存储已清空');
        checkStorageStatus();
      } else {
        console.error('清空服务端存储失败');
      }
    } catch (error) {
      console.error('清空存储失败:', error);
    }
  };

  const initializeStorage = async () => {
    try {
      // 创建一个示例项目
      const sampleItem = {
        id: Date.now().toString(),
        title: "测试项目",
        mediaType: "tv" as const,
        tmdbId: "12345",
        weekday: 1,
        completed: false,
        status: "ongoing" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await StorageManager.addItem(sampleItem);
      if (success) {
        console.log('示例项目已添加到服务端存储');
        checkStorageStatus();
      } else {
        console.error('添加示例项目失败');
      }
    } catch (error) {
      console.error('初始化存储失败:', error);
    }
  };

  const migrateToFileStorage = async () => {
    setMigrating(true);
    setMigrationResult('迁移功能已移除，数据现在统一存储在服务端');

    try {
      if (typeof window !== 'undefined' && localStorage) {
        const itemsData = localStorage.getItem('tmdb_helper_items');

        if (!itemsData) {
          throw new Error('localStorage中没有项目数据');
        }

        const items = JSON.parse(itemsData);

        const response = await fetch('/api/migrate-storage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items }),
        });

        const result = await response.json();

        if (result.success) {
          setMigrationResult(result);
          checkStorageStatus();
        } else {
          throw new Error(result.error || '迁移失败');
        }
      }
    } catch (error) {
      console.error('迁移失败:', error);
      setMigrationResult({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    if (open) {
      checkStorageStatus();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            存储状态调试
          </DialogTitle>
          <DialogDescription>
            检查和调试系统存储状态，解决项目数据问题。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button 
              onClick={checkStorageStatus}
              disabled={loading}
              size="sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              刷新状态
            </Button>
            <Button 
              onClick={initializeStorage}
              variant="outline"
              size="sm"
            >
              创建测试项目
            </Button>
            <Button
              onClick={migrateToFileStorage}
              disabled={migrating}
              variant="outline"
              size="sm"
            >
              {migrating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              迁移到文件存储
            </Button>
            <Button
              onClick={clearStorage}
              variant="destructive"
              size="sm"
            >
              清空存储
            </Button>
          </div>

          {/* 存储状态 */}
          {storageStatus && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-gray-600">项目数量</div>
                  <div className="text-2xl font-bold">
                    {storageStatus.itemCount}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-gray-600">存储类型</div>
                  <div className="text-lg font-medium">
                    {storageStatus.storageType}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-gray-600">环境状态</div>
                  <div className="space-y-1">
                    <Badge variant={storageStatus.isClientEnvironment ? "default" : "destructive"}>
                      {storageStatus.isClientEnvironment ? "客户端" : "服务端"}
                    </Badge>
                    <Badge variant={storageStatus.isStorageAvailable ? "default" : "destructive"}>
                      {storageStatus.isStorageAvailable ? "存储可用" : "存储不可用"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 错误信息 */}
              {storageStatus.lastError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    错误: {storageStatus.lastError}
                  </AlertDescription>
                </Alert>
              )}

              {/* 迁移结果 */}
              {migrationResult && (
                <Alert variant={migrationResult.success ? "default" : "destructive"}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {migrationResult.success ? (
                      <div>
                        <div className="font-medium">迁移成功！</div>
                        <div className="mt-1 text-sm">
                          总项目: {migrationResult.stats?.totalItems || 0}，
                          新增: {migrationResult.stats?.addedItems || 0}，
                          更新: {migrationResult.stats?.updatedItems || 0}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">迁移失败</div>
                        <div className="mt-1 text-sm">{migrationResult.error}</div>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* 状态提示 */}
              {!storageStatus.hasItems && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    系统中没有项目数据。这可能是因为：
                    <ul className="mt-2 ml-4 list-disc">
                      <li>首次使用系统，还没有添加任何项目</li>
                      <li>localStorage数据被清空</li>
                      <li>存储访问权限问题</li>
                      <li>浏览器隐私模式限制</li>
                      <li>需要将localStorage数据迁移到文件存储</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* 原始数据 */}
          {rawData && (
            <div className="space-y-2">
              <h4 className="font-medium">原始存储数据:</h4>
              <pre className="text-xs bg-gray-50 p-3 rounded border max-h-60 overflow-y-auto">
                {rawData}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
