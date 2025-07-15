"use client"

import React from 'react'
import AddItemDialog from '@/components/add-item-dialog'
import SettingsDialog from '@/components/settings-dialog'
import ItemDetailDialog from '@/components/item-detail-dialog'
import GlobalScheduledTasksDialog from '@/components/global-scheduled-tasks-dialog'
import { TaskExecutionLogsDialog } from '@/components/task-execution-logs-dialog'
import ImportDataDialog from '@/components/import-data-dialog'
import ExportDataDialog from '@/components/export-data-dialog'
import { UseHomeStateReturn } from '@/hooks/use-home-state'
import { useData } from '@/components/client-data-provider'

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
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
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