'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Settings,
  RefreshCw,
  BarChart3
} from 'lucide-react';

interface ConflictStats {
  detector: {
    totalTasks: number;
    conflictsByType: Record<string, number>;
    conflictsBySeverity: Record<string, number>;
  };
  resolver: {
    totalResolutions: number;
    strategyCounts: Record<string, number>;
    averageAdjustmentMs: number;
    successRate: number;
  };
}

interface ConflictInfo {
  taskId: string;
  taskName: string;
  scheduledTime: Date;
  conflictType: 'time' | 'resource' | 'priority';
  severity: 'low' | 'medium' | 'high';
  conflictingTasks: string[];
}

export function TaskConflictMonitor() {
  const [stats, setStats] = useState<ConflictStats | null>(null);
  const [recentConflicts, setRecentConflicts] = useState<ConflictInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 获取冲突统计数据
  const fetchConflictStats = async () => {
    try {
      setIsLoading(true);
      
      // 这里应该调用TaskScheduler的getConflictStats方法
      // 由于是客户端组件，需要通过API或直接访问调度器实例
      const { taskScheduler } = await import('@/lib/scheduler');
      const conflictStats = taskScheduler.getConflictStats();
      
      setStats(conflictStats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('获取冲突统计失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 清理冲突数据
  const handleCleanupData = async () => {
    try {
      const { taskScheduler } = await import('@/lib/scheduler');
      taskScheduler.cleanupConflictData();
      await fetchConflictStats();
    } catch (error) {
      console.error('清理冲突数据失败:', error);
    }
  };

  useEffect(() => {
    fetchConflictStats();
    
    // 每30秒自动刷新数据
    const interval = setInterval(fetchConflictStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'stagger': return 'default';
      case 'queue': return 'secondary';
      case 'priority': return 'outline';
      case 'hybrid': return 'default';
      default: return 'outline';
    }
  };

  if (isLoading && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            加载冲突监控数据...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          任务冲突监控
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
          </span>
          <Button variant="outline" size="sm" onClick={fetchConflictStats}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={handleCleanupData}>
            <Settings className="h-4 w-4 mr-1" />
            清理数据
          </Button>
        </div>
      </div>

      {stats && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="conflicts">冲突详情</TabsTrigger>
            <TabsTrigger value="resolutions">解决方案</TabsTrigger>
            <TabsTrigger value="performance">性能指标</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">总任务数</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.detector.totalTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    当前已调度的任务
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">冲突解决次数</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.resolver.totalResolutions}</div>
                  <p className="text-xs text-muted-foreground">
                    累计解决的冲突
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">解决成功率</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(stats.resolver.successRate * 100).toFixed(1)}%
                  </div>
                  <Progress value={stats.resolver.successRate * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">平均调整时间</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(stats.resolver.averageAdjustmentMs / 1000)}s
                  </div>
                  <p className="text-xs text-muted-foreground">
                    时间错开策略的平均调整
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>冲突类型分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.detector.conflictsByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{type}</Badge>
                        <span className="text-sm">
                          {type === 'time' ? '时间冲突' : 
                           type === 'resource' ? '资源冲突' : 
                           type === 'priority' ? '优先级冲突' : type}
                        </span>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>冲突严重程度</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.detector.conflictsBySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(severity) as any}>
                          {severity === 'high' ? '高' : 
                           severity === 'medium' ? '中' : 
                           severity === 'low' ? '低' : severity}
                        </Badge>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resolutions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>解决策略使用情况</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.resolver.strategyCounts).map(([strategy, count]) => (
                    <div key={strategy} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStrategyColor(strategy) as any}>
                          {strategy === 'stagger' ? '时间错开' : 
                           strategy === 'queue' ? '队列执行' : 
                           strategy === 'priority' ? '优先级调整' : 
                           strategy === 'hybrid' ? '混合策略' : strategy}
                        </Badge>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                冲突检测和解决系统正在正常运行。平均解决时间为 {Math.round(stats.resolver.averageAdjustmentMs / 1000)} 秒，
                成功率为 {(stats.resolver.successRate * 100).toFixed(1)}%。
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>系统健康状态</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>冲突检测器状态</span>
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      正常
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>冲突解决器状态</span>
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      正常
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>任务调度器状态</span>
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      正常
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
