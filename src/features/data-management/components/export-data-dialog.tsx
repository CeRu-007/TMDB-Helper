'use client';

import React, { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Download, FileText, Database, Settings, Info } from 'lucide-react';
import { useData } from '@/shared/components/client-data-provider';
import { StorageManager, TMDBItem, ScheduledTask } from '@/lib/data/storage';
import { useToast } from '@/shared/lib/hooks/use-toast';
import { dataRecoveryManager } from '@/shared/lib/data/data-recovery-manager';

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
      const success = await performExport();
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
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

  // 统一的导出处理逻辑
  const performExport = async (): Promise<boolean> => {
    if (options.format === 'csv') {
      await exportToCSV();
      return true;
    }

    // JSON export
    const exportData = options.exactCopy
      ? await getExactCopyData()
      : await getFullBackupData();

    if (!exportData || exportData.items.length === 0) {
      throw new Error('没有可导出的数据');
    }

    const filename = options.exactCopy
      ? 'tmdb_items.json'
      : `tmdb-helper-backup-${new Date().toISOString().split('T')[0]}.json`;

    const data = JSON.stringify(exportData, null, 2);
    downloadFile(data, filename, 'application/json');

    const itemCount = exportData.items.length;
    const taskCount = (exportData as any).tasks?.length || 0;

    toast({
      title: '导出成功',
      description: options.exactCopy
        ? `已导出 ${itemCount} 个项目`
        : `已导出 ${itemCount} 个项目和 ${taskCount} 个任务`,
      duration: 3000,
    });

    return true;
  };

  // 获取精确副本数据
  const getExactCopyData = async () => {
    try {
      const response = await fetch('/api/storage/file-operations', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.items) {
        return { items: result.items };
      }
      throw new Error(result.error || 'API返回数据无效');
    } catch (error) {
      // Fallback to memory data
      if (items && items.length > 0) {
        logger.warn('使用内存数据作为API降级方案');
        return { items };
      }
      throw new Error('无法获取数据');
    }
  };

  // 获取完整备份数据
  const getFullBackupData = async () => {
    const [exportItems, exportTasks] = await Promise.allSettled([
      getBackupItems(),
      getBackupTasks()
    ]);

    const items = exportItems.status === 'fulfilled' ? exportItems.value : [];
    const tasks = exportTasks.status === 'fulfilled' ? exportTasks.value : [];

    if (items.length === 0) {
      throw new Error('没有找到可导出的项目数据');
    }

    return {
      items,
      tasks,
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      stats: {
        itemCount: items.length,
        taskCount: tasks.length,
      },
    };
  };

  // 获取备份项目数据
  const getBackupItems = async (): Promise<TMDBItem[]> => {
    try {
      const response = await fetch('/api/storage/file-operations', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        return result.success && result.items ? result.items : [];
      }
    } catch (error) {
      logger.warn('API获取项目失败，使用内存数据');
    }

    return items || [];
  };

  // 获取备份任务数据
  const getBackupTasks = async (): Promise<ScheduledTask[]> => {
    try {
      return await StorageManager.getScheduledTasks();
    } catch (error) {
      logger.warn('获取定时任务失败');
      return [];
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
