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
import { Loader2, Clock, AlertTriangle, CheckCircle, PauseCircle, RefreshCw, Settings } from 'lucide-react';

interface SchedulerStatus {
  scheduler: {
    isInitialized: boolean;
    activeTimers: number;
    runningTasks: number;
    timerDetails: Array<{taskId: string, nextRun?: string}>;
  };
  tasks: {
    total: number;
    enabled: number;
    disabled: number;
    running: number;
  };
  issues: {
    orphanedTimers: number;
    missingTimers: number;
    orphanedTimerDetails: any[];
    missingTimerDetails: any[];
  };
  taskDetails: Array<{
    id: string;
    name: string;
    enabled: boolean;
    type: string;
    schedule: any;
    nextRun?: string;
    lastRun?: string;
    lastRunStatus?: string;
    lastRunError?: string;
    isRunning: boolean;
    hasActiveTimer: boolean;
    itemId: string;
  }>;
  timestamp: string;
}

interface SchedulerDebugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SchedulerDebugDialog({ open, onOpenChange }: SchedulerDebugDialogProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [operating, setOperating] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scheduler-status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
      } else {
        console.error('获取调度器状态失败:', data.error);
      }
    } catch (error) {
      console.error('获取调度器状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOperation = async (action: string) => {
    setOperating(true);
    try {
      const response = await fetch('/api/scheduler-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`操作 ${action} 成功:`, data);
        // 重新获取状态
        await fetchStatus();
      } else {
        console.error(`操作 ${action} 失败:`, data.error);
      }
    } catch (error) {
      console.error(`操作 ${action} 失败:`, error);
    } finally {
      setOperating(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchStatus();
    }
  }, [open]);

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '未设置';
    try {
      return new Date(timeStr).toLocaleString('zh-CN');
    } catch {
      return timeStr;
    }
  };

  const getStatusIcon = (task: any) => {
    if (task.isRunning) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    if (!task.enabled) {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }
    if (!task.hasActiveTimer) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (task.lastRunStatus === 'failed') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (task.lastRunStatus === 'user_interrupted') {
      return <PauseCircle className="h-4 w-4 text-orange-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = (task: any) => {
    if (task.isRunning) return '执行中';
    if (!task.enabled) return '已禁用';
    if (!task.hasActiveTimer) return '缺少定时器';
    if (task.lastRunStatus === 'failed') return '上次失败';
    if (task.lastRunStatus === 'user_interrupted') return '用户中断';
    return '正常';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            调度器状态调试
          </DialogTitle>
          <DialogDescription>
            检查定时任务调度器的运行状态和问题诊断。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button 
              onClick={fetchStatus}
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
              onClick={() => handleOperation('reinitialize')}
              disabled={operating}
              variant="outline"
              size="sm"
            >
              重新初始化
            </Button>
            <Button 
              onClick={() => handleOperation('validate')}
              disabled={operating}
              variant="outline"
              size="sm"
            >
              验证关联
            </Button>
          </div>

          {status && (
            <div className="space-y-4">
              {/* 调度器状态 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-gray-600">调度器状态</div>
                  <div className="flex items-center gap-2">
                    {status.scheduler.isInitialized ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">
                      {status.scheduler.isInitialized ? '已初始化' : '未初始化'}
                    </span>
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-gray-600">活跃定时器</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {status.scheduler.activeTimers}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-gray-600">执行中任务</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {status.scheduler.runningTasks}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-gray-600">启用任务</div>
                  <div className="text-2xl font-bold text-green-600">
                    {status.tasks.enabled} / {status.tasks.total}
                  </div>
                </div>
              </div>

              {/* 问题检测 */}
              {(status.issues.orphanedTimers > 0 || status.issues.missingTimers > 0) && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    发现问题: {status.issues.orphanedTimers} 个孤立定时器, {status.issues.missingTimers} 个缺失定时器
                  </AlertDescription>
                </Alert>
              )}

              {/* 任务详情 */}
              <div className="space-y-2">
                <h4 className="font-medium">任务详情:</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {status.taskDetails.map((task) => (
                    <div key={task.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task)}
                          <span className="font-medium">{task.name}</span>
                          <Badge variant={task.enabled ? "default" : "secondary"}>
                            {getStatusText(task)}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          下次: {formatTime(task.nextRun)}
                        </div>
                      </div>
                      {task.lastRunError && (
                        <div className="mt-2 text-sm text-red-600">
                          错误: {task.lastRunError}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 时间戳 */}
              <div className="text-xs text-gray-500">
                更新时间: {formatTime(status.timestamp)}
              </div>
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
