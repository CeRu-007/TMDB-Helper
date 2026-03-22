'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Download, FileText, Database, Info } from 'lucide-react';
import { useData } from '@/shared/components/client-data-provider';
import { useToast } from '@/lib/hooks/use-toast';

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExportOptions {
  format: 'json' | 'csv';
}

export default function ExportDataDialog({
  open,
  onOpenChange,
}: ExportDataDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'json',
  });
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<{
    itemCount: number;
  } | null>(null);

  const { items, exportData } = useData();
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      setStats({
        itemCount: items.length,
      });
    }
  }, [open, items.length]);

  const handleExport = async () => {
    setExporting(true);

    try {
      if (options.format === 'csv') {
        exportToCSV();
        onOpenChange(false);
        return;
      }

      const result = await exportData();

      if (!result || result.length === 0) {
        throw new Error('没有可导出的数据');
      }

      const filename = `tmdb-helper-backup-${new Date().toISOString().split('T')[0]}.json`;
      const data = JSON.stringify({
        items: result,
        version: '2.0.0',
        exportDate: new Date().toISOString(),
      }, null, 2);
      downloadFile(data, filename, 'application/json');

      toast({
        title: '导出成功',
        description: `已导出 ${result.length} 个项目`,
        duration: 3000,
      });

      onOpenChange(false);
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

  const exportToCSV = () => {
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
          {stats && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  数据统计
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm">项目数量：</span>
                  <Badge variant="outline">{stats.itemCount}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

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

          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? '导出中...' : '导出'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
