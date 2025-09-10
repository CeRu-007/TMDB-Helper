"use client"

import React, { useState } from 'react'
import AddItemDialog from '@/components/add-item-dialog'
import SettingsDialog from '@/components/settings-dialog'
import ItemDetailDialog from '@/components/item-detail-dialog'
import ScheduledTaskDialog from '@/components/scheduled-task-dialog'
import GlobalScheduledTasksDialog from '@/components/global-scheduled-tasks-dialog'
import { TaskExecutionLogsDialog } from '@/components/task-execution-logs-dialog'
import ImportDataDialog from '@/components/import-data-dialog'
import ExportDataDialog from '@/components/export-data-dialog'
import { UseHomeStateReturn } from '@/hooks/use-home-state'
import { useData } from '@/components/client-data-provider'
import { TMDBItem } from '@/lib/storage'
import { toast } from '@/components/ui/use-toast'

interface HomeDialogsProps {
  homeState: UseHomeStateReturn
}

export function HomeDialogs({ homeState }: HomeDialogsProps) {
  const { 
    addItem: handleAddItem, 
    updateItem: handleUpdateItem, 
    deleteItem: handleDeleteItem,
    exportData,
    importData: importDataFromJson
  } = useData()

  // 定时任务对话框状态
  const [showScheduledTaskDialog, setShowScheduledTaskDialog] = useState(false)
  const [scheduledTaskItem, setScheduledTaskItem] = useState<TMDBItem | null>(null)

  return (
    <>
      {/* 添加词条对话框 */}
      <AddItemDialog
        open={homeState.showAddDialog}
        onOpenChange={homeState.setShowAddDialog}
        onAddItem={handleAddItem}
      />

      {/* 设置对话框 */}
      <SettingsDialog
        open={homeState.showSettingsDialog}
        onOpenChange={homeState.setShowSettingsDialog}
      />

      {/* 词条详情对话框 */}
      {homeState.selectedItem && (
        <ItemDetailDialog
          item={homeState.selectedItem}
          open={!!homeState.selectedItem}
          onOpenChange={(open) => {
            if (!open) homeState.setSelectedItem(null)
          }}
          onUpdate={handleUpdateItem}
          onDelete={(id) => handleDeleteItem(id)}
          onOpenScheduledTask={(item) => {
            setScheduledTaskItem(item);
            setShowScheduledTaskDialog(true);
          }}
        />
      )}

      {/* 单项定时任务对话框 */}
      {scheduledTaskItem && (
        <ScheduledTaskDialog
          item={scheduledTaskItem}
          open={showScheduledTaskDialog}
          onOpenChange={(open) => {
            setShowScheduledTaskDialog(open);
            if (!open) setScheduledTaskItem(null);
          }}
          onUpdate={handleUpdateItem}
          onTaskSaved={(task) => {
            
            toast({
              title: "定时任务已保存",
              description: `任务 "${task.name}" 已成功保存`,
            });
          }}
        />
      )}

      {/* 定时任务对话框 */}
      <GlobalScheduledTasksDialog
        open={homeState.showTasksDialog}
        onOpenChange={homeState.setShowTasksDialog}
      />

      {/* 执行日志对话框 */}
      <TaskExecutionLogsDialog
        open={homeState.showExecutionLogs}
        onOpenChange={homeState.setShowExecutionLogs}
      />

      {/* 导入数据对话框 */}
      <ImportDataDialog
        open={homeState.showImportDialog}
        onOpenChange={homeState.setShowImportDialog}
        onImportData={importDataFromJson}
      />

      {/* 导出数据对话框 */}
      <ExportDataDialog
        open={homeState.showExportDialog}
        onOpenChange={homeState.setShowExportDialog}
        onExportData={exportData}
      />
    </>
  )
}