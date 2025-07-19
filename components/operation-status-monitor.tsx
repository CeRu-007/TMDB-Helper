'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Database
} from 'lucide-react';

interface OperationStatus {
  totalQueued: number;
  processingItems: number;
  queuesByItem: Record<string, number>;
}

interface ValidationStats {
  totalValidations: number;
  averageInconsistencies: number;
  totalFixed: number;
  lastValidationTime: number;
  isValidating: boolean;
}

interface OptimisticOperation {
  id: string;
  type: 'add' | 'update' | 'delete';
  entity: 'item' | 'task';
  status: 'pending' | 'confirmed' | 'failed' | 'retrying' | 'merged';
  timestamp: number;
  lastError?: string;
}

export function OperationStatusMonitor() {
  const [queueStatus, setQueueStatus] = useState<OperationStatus>({
    totalQueued: 0,
    processingItems: 0,
    queuesByItem: {}
  });
  
  const [validationStats, setValidationStats] = useState<ValidationStats>({
    totalValidations: 0,
    averageInconsistencies: 0,
    totalFixed: 0,
    lastValidationTime: 0,
    isValidating: false
  });
  
  const [optimisticOps, setOptimisticOps] = useState<OptimisticOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 获取状态数据
  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      
      // 获取队列状态
      const { operationQueueManager } = await import('@/lib/operation-queue-manager');
      const queueData = operationQueueManager.getQueueStatus();
      setQueueStatus(queueData);

      // 获取验证统计
      const { dataConsistencyValidator } = await import('@/lib/data-consistency-validator');
      const validationData = dataConsistencyValidator.getValidationStats();
      setValidationStats(validationData);

      // 获取乐观更新操作
      const { optimisticUpdateManager } = await import('@/lib/optimistic-update-manager');
      const operations = optimisticUpdateManager.getPendingOperations();
      setOptimisticOps(operations);

      setLastUpdate(new Date());
    } catch (error) {
      console.error('获取操作状态失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 手动验证数据一致性
  const handleManualValidation = async () => {
    try {
      const { dataConsistencyValidator } = await import('@/lib/data-consistency-validator');
      await dataConsistencyValidator.validateConsistency();
      await fetchStatus();
    } catch (error) {
      console.error('手动验证失败:', error);
    }
  };

  // 清理队列
  const handleCleanupQueue = async () => {
    try {
      const { operationQueueManager } = await import('@/lib/operation-queue-manager');
      operationQueueManager.cleanup();
      await fetchStatus();
    } catch (error) {
      console.error('清理队列失败:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // 每5秒自动刷新
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      case 'retrying': return 'outline';
      case 'merged': return 'default';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'failed': return <XCircle className="h-3 w-3" />;
      case 'retrying': return <RefreshCw className="h-3 w-3 animate-spin" />;
      case 'merged': return <TrendingUp className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  if (isLoading && optimisticOps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            加载操作状态...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          操作状态监控
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
          </span>
          <Button variant="outline" size="sm" onClick={fetchStatus}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={handleManualValidation}>
            <Database className="h-4 w-4 mr-1" />
            验证一致性
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="queue">操作队列</TabsTrigger>
          <TabsTrigger value="optimistic">乐观更新</TabsTrigger>
          <TabsTrigger value="validation">数据验证</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">队列中操作</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueStatus.totalQueued}</div>
                <p className="text-xs text-muted-foreground">
                  等待执行的操作
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">处理中项目</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{queueStatus.processingItems}</div>
                <p className="text-xs text-muted-foreground">
                  正在处理的项目
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">乐观更新</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{optimisticOps.length}</div>
                <p className="text-xs text-muted-foreground">
                  待确认的操作
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">数据一致性</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {validationStats.averageInconsistencies.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">
                  平均不一致项目数
                </p>
              </CardContent>
            </Card>
          </div>

          {(queueStatus.totalQueued > 10 || optimisticOps.filter(op => op.status === 'failed').length > 0) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                检测到异常状态：
                {queueStatus.totalQueued > 10 && ` 队列中有${queueStatus.totalQueued}个操作等待处理`}
                {optimisticOps.filter(op => op.status === 'failed').length > 0 && 
                  ` 有${optimisticOps.filter(op => op.status === 'failed').length}个操作失败`}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>操作队列状态</CardTitle>
              <Button variant="outline" size="sm" onClick={handleCleanupQueue}>
                清理队列
              </Button>
            </CardHeader>
            <CardContent>
              {Object.keys(queueStatus.queuesByItem).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">队列为空</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(queueStatus.queuesByItem).map(([itemId, count]) => (
                    <div key={itemId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">项目 {itemId}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{count} 个操作</span>
                        <Progress value={(count / 10) * 100} className="w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimistic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>乐观更新操作</CardTitle>
            </CardHeader>
            <CardContent>
              {optimisticOps.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">没有待处理的乐观更新</p>
              ) : (
                <div className="space-y-3">
                  {optimisticOps.map((op) => (
                    <div key={op.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(op.status)}
                        <div>
                          <div className="font-medium">{op.type} {op.entity}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(op.timestamp).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(op.status) as any}>
                          {op.status === 'pending' ? '等待中' :
                           op.status === 'confirmed' ? '已确认' :
                           op.status === 'failed' ? '失败' :
                           op.status === 'retrying' ? '重试中' :
                           op.status === 'merged' ? '已合并' : op.status}
                        </Badge>
                        {op.lastError && (
                          <span className="text-xs text-destructive max-w-40 truncate">
                            {op.lastError}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>数据一致性验证</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">总验证次数</div>
                  <div className="text-2xl font-bold">{validationStats.totalValidations}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">修复项目数</div>
                  <div className="text-2xl font-bold">{validationStats.totalFixed}</div>
                </div>
              </div>
              
              {validationStats.isValidating && (
                <Alert>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>正在验证数据一致性...</AlertDescription>
                </Alert>
              )}
              
              {validationStats.lastValidationTime > 0 && (
                <div className="text-sm text-muted-foreground">
                  最后验证时间: {new Date(validationStats.lastValidationTime).toLocaleString('zh-CN')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
