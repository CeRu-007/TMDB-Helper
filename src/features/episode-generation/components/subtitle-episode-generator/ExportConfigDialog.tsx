import React, { useState } from "react"
import {
  Download,
  Loader2,
  CheckCircle,
  XCircle
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Label } from "@/shared/components/ui/label"
import { ExportConfigDialogProps } from './types'

export function ExportConfigDialog({
  open,
  onOpenChange,
  config,
  onConfigChange,
  onExport
}: ExportConfigDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{ success: boolean; message?: string } | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setExportResult(null)

    try {
      const result = await onExport()
      setExportResult({
        success: result.success,
        message: result.success ? 'import.csv文件已成功覆盖！现在可以在对应词条详情页面使用集成工具上传到TMDB对应词条了。' : '导出失败'
      })
    } catch (error) {
      setExportResult({
        success: false,
        message: `导出失败：${error instanceof Error ? error.message : '未知错误'}`
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleClose = () => {
    setExportResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>导出到TMDB格式</DialogTitle>
          <DialogDescription>
            配置导出选项，将生成的分集简介导出为TMDB-Import工具兼容的CSV格式
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!exportResult && (
            <>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeTitle"
                    checked={config.includeTitle}
                    onCheckedChange={(checked) => {
                      if (typeof onConfigChange === 'function') {
                        onConfigChange({ ...config, includeTitle: !!checked })
                      }
                    }}
                  />
                  <Label htmlFor="includeTitle" className="text-sm">
                    包含标题 (name列)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeOverview"
                    checked={config.includeOverview}
                    onCheckedChange={(checked) => {
                      if (typeof onConfigChange === 'function') {
                        onConfigChange({ ...config, includeOverview: !!checked })
                      }
                    }}
                  />
                  <Label htmlFor="includeOverview" className="text-sm">
                    包含简介 (overview列)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeRuntime"
                    checked={config.includeRuntime}
                    onCheckedChange={(checked) => {
                      if (typeof onConfigChange === 'function') {
                        onConfigChange({ ...config, includeRuntime: !!checked })
                      }
                    }}
                  />
                  <Label htmlFor="includeRuntime" className="text-sm">
                    包含分钟数 (runtime列)
                  </Label>
                </div>
              </div>

              <div className="text-xs text-gray-500 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <p>• 分钟数将根据字幕文件的最后时间戳计算（四舍五入）</p>
                <p>• 导出将直接覆盖 TMDB-Import-master/import.csv 文件</p>
                <p>• 集数顺序按照上传的字幕文件顺序排列</p>
              </div>
            </>
          )}

          {exportResult && (
            <div className={`p-4 rounded-lg ${exportResult.success ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
              <div className="flex items-center space-x-2">
                {exportResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <p className={`text-sm font-medium ${exportResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  {exportResult.success ? '导出成功！' : '导出失败'}
                </p>
              </div>
              {exportResult.message && (
                <p className={`text-sm mt-2 ${exportResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {exportResult.message}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!exportResult ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || (!config.includeTitle && !config.includeOverview && !config.includeRuntime)}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    导出
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              关闭
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}