'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/common/dialog';
import { Button } from '@/components/common/button';
import { Label } from '@/components/common/label';
import { Checkbox } from '@/components/common/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/common/radio-group';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/common/card';
import { Badge } from '@/components/common/badge';
import { Alert, AlertDescription } from '@/components/common/alert';
import { Download, FileText, Database, Settings, Info } from 'lucide-react';
import { useData } from '@/components/features/auth/client-data-provider';
import { StorageManager, TMDBItem, ScheduledTask } from '@/lib/data/storage';
import { useToast } from '@/lib/hooks/use-toast';
import { dataRecoveryManager } from '@/lib/data/data-recovery-manager';

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExportOptions {
  includeItems: boolean;
  includeTasks: boolean;
  format: 'json' | 'csv';
  exactCopy: boolean; // 导出与data文件夹完全一致的文件
}

export default function ExportDataDialog({
  open,
  onOpenChange,
}: ExportDataDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    includeItems: true,
    includeTasks: true,
    format: 'json',
    exactCopy: false,
  });
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<{
    itemCount: number;
    taskCount: number;
  } | null>(null);

  const { items, exportData } = useData();
  const { toast } = useToast();

  // 加载统计信息
  React.useEffect(() => {
    if (open) {
      loadStats();
    }
  }, [open]);

  const loadStats = async () => {
    try {
      const tasks = await StorageManager.getScheduledTasks();
      setStats({
        itemCount: items.length,
        taskCount: tasks.length,
      });
    } catch (error) {
      setStats({
        itemCount: items.length,
        taskCount: 0,
      });
    }
  };

  // 处理导出
  const handleExport = async () => {
    setExporting(true);

    try {
      if (options.format === 'json') {
        if (options.exactCopy) {
          // 导出与data文件夹完全一致的文件
          await exportExactCopy();
        } else {
          // 导出新格式 - 包含任务的完整备份
          await exportFullBackup();
        }
      } else if (options.format === 'csv') {
        // 导出CSV格式
        await exportToCSV();
      }

      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      // 显示用户友好的错误提示
      toast({
        title: '导出失败',
        description: `${errorMessage}。请检查数据完整性后重试。`,
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      setExporting(false);
    }
  };

  // 导出精确副本
  const exportExactCopy = async () => {
    try {
      // 尝试从API获取数据
      const response = await fetch('/api/storage/file-operations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `API请求失败: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();

      if (result.success && result.items) {
        const data = JSON.stringify(result.items, null, 2);
        downloadFile(data, 'tmdb_items.json', 'application/json');

        toast({
          title: '导出成功',
          description: `已导出 ${result.items.length} 个项目`,
          duration: 3000,
        });
      } else {
        throw new Error(result.error || 'API返回数据无效');
      }
    } catch (apiError) {
      // 降级到内存数据
      try {
        if (items && items.length > 0) {
          const data = JSON.stringify(items, null, 2);
          downloadFile(data, 'tmdb_items.json', 'application/json');

          toast({
            title: '导出成功',
            description: `已从内存导出 ${items.length} 个项目`,
            duration: 3000,
          });
        } else {
          throw new Error('内存中没有可用数据');
        }
      } catch (memoryError) {
        throw new Error(
          `数据导出失败: API错误(${apiError instanceof Error ? apiError.message : '未知'})，内存错误(${memoryError instanceof Error ? memoryError.message : '未知'})`,
        );
      }
    }
  };

  // 导出完整备份
  const exportFullBackup = async () => {
    try {
      let exportItems: TMDBItem[] = [];
      let exportTasks: ScheduledTask[] = [];
      let dataSource = 'unknown';

      // 尝试从API获取项目数据
      try {
        const response = await fetch('/api/storage/file-operations', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.items) {
            exportItems = result.items;
            dataSource = 'API';
          }
        }
      } catch (apiError) {}

      // 如果API失败，使用内存数据
      if (exportItems.length === 0 && items && items.length > 0) {
        exportItems = items;
        dataSource = 'Memory';
      }

      // 获取定时任务数据
      try {
        exportTasks = await StorageManager.getScheduledTasks();
      } catch (taskError) {
        exportTasks = [];

        // 已切换到服务端存储，此兜底逻辑不再需要
      }

      // 验证数据
      if (exportItems.length === 0) {
        throw new Error('没有找到可导出的项目数据');
      }

      // 创建完整的导出格式
      const exportData = {
        items: exportItems,
        tasks: exportTasks,
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        dataSource,
        stats: {
          itemCount: exportItems.length,
          taskCount: exportTasks.length,
        },
      };

      const data = JSON.stringify(exportData, null, 2);
      const filename = `tmdb-helper-backup-${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(data, filename, 'application/json');

      toast({
        title: '导出成功',
        description: `已导出 ${exportItems.length} 个项目和 ${exportTasks.length} 个任务`,
        duration: 3000,
      });
    } catch (error) {
      // 使用数据恢复管理器作为降级方案
      await exportWithRecoveryManager();
    }
  };

  // 使用数据恢复管理器导出
  const exportWithRecoveryManager = async () => {
    try {
      const result = await dataRecoveryManager.safeExportData({
        includeBackup: true,
        validateData: true,
        autoFix: true,
        maxRetries: 3,
      });

      if (result.success && result.data && result.filename) {
        downloadFile(result.data, result.filename, 'application/json');

        toast({
          title: '导出成功',
          description: `已安全导出 ${result.stats?.itemCount || 0} 个项目和 ${result.stats?.taskCount || 0} 个任务`,
          duration: 3000,
        });
      } else {
        throw new Error(result.error || '数据恢复管理器导出失败');
      }
    } catch (recoveryError) {
      // 最后的降级方案：使用原始的exportData方法
      try {
        const fallbackData = await exportData();
        downloadFile(
          fallbackData,
          `tmdb-helper-fallback-${new Date().toISOString().split('T')[0]}.json`,
          'application/json',
        );

        toast({
          title: '导出成功',
          description: '已使用备用方法导出数据',
          duration: 3000,
        });
      } catch (fallbackError) {
        throw new Error(
          `所有导出方法都失败: ${recoveryError instanceof Error ? recoveryError.message : '未知错误'}`,
        );
      }
    }
  };

  // 导出CSV格式
  const exportToCSV = async () => {
    if (!options.includeItems) return;

    const csvHeaders = [
      'ID',
      '标题',
      '原标题',
      '类型',
      'TMDB ID',
      'TMDB URL',
      '海报URL',
      '播出星期',
      '播出时间',
      '总集数',
      '已完成',
      '状态',
      '平台URL',
      '备注',
      '分类',
      '创建时间',
    ];

    const csvRows = items.map((item) => [
      item.id,
      item.title,
      item.originalTitle || '',
      item.mediaType,
      item.tmdbId,
      item.tmdbUrl || '',
      item.posterUrl || '',
      item.weekday,
      item.airTime || '',
      item.totalEpisodes || '',
      item.completed ? '是' : '否',
      item.status === 'ongoing' ? '进行中' : '已完成',
      item.platformUrl || '',
      item.notes || '',
      item.category || '',
      item.createdAt,
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');

    downloadFile(
      csvContent,
      `tmdb-helper-items-${new Date().toISOString().split('T')[0]}.csv`,
      'text/csv',
    );
  };

  // 下载文件
  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string,
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            导出数据
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 数据统计 */}
          {stats && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  数据统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">项目数量：</span>
                    <Badge variant="outline">{stats.itemCount}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">定时任务：</span>
                    <Badge variant="outline">{stats.taskCount}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 导出格式 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                导出格式
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={options.format}
                onValueChange={(value) =>
                  setOptions((prev) => ({
                    ...prev,
                    format: value as 'json' | 'csv',
                  }))
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="json" />
                  <Label htmlFor="json" className="flex-1">
                    <div>
                      <div className="font-medium">JSON 格式</div>
                      <div className="text-sm text-muted-foreground">
                        完整的数据备份，包含所有字段和结构
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="flex-1">
                    <div>
                      <div className="font-medium">CSV 格式</div>
                      <div className="text-sm text-muted-foreground">
                        表格格式，便于在Excel等软件中查看
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 导出选项 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                导出选项
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {options.format === 'json' && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeItems"
                      checked={options.includeItems}
                      onCheckedChange={(checked) =>
                        setOptions((prev) => ({
                          ...prev,
                          includeItems: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="includeItems" className="flex-1">
                      <div>
                        <div className="font-medium">包含项目数据</div>
                        <div className="text-sm text-muted-foreground">
                          导出所有影视项目信息
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeTasks"
                      checked={options.includeTasks}
                      onCheckedChange={(checked) =>
                        setOptions((prev) => ({
                          ...prev,
                          includeTasks: checked as boolean,
                        }))
                      }
                    />
                    <Label htmlFor="includeTasks" className="flex-1">
                      <div>
                        <div className="font-medium">包含定时任务</div>
                        <div className="text-sm text-muted-foreground">
                          导出所有定时任务配置
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="exactCopy"
                      checked={options.exactCopy}
                      onCheckedChange={(checked) =>
                        setOptions((prev) => ({
                          ...prev,
                          exactCopy: checked as boolean,
                          includeItems: true,
                          includeTasks: !checked,
                        }))
                      }
                    />
                    <Label htmlFor="exactCopy" className="flex-1">
                      <div>
                        <div className="font-medium">导出data文件副本</div>
                        <div className="text-sm text-muted-foreground">
                          导出与data/tmdb_items.json完全一致的文件
                        </div>
                      </div>
                    </Label>
                  </div>
                </>
              )}

              {options.format === 'csv' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    CSV 格式仅包含项目数据，不包含定时任务信息
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              onClick={handleExport}
              disabled={
                exporting ||
                (options.format === 'json' &&
                  !options.includeItems &&
                  !options.includeTasks)
              }
            >
              {exporting ? '导出中...' : '开始导出'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
