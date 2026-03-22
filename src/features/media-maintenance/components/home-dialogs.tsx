"use client"

import React from 'react'
import AddItemDialog from '@/features/media-maintenance/components/add-item-dialog'
import SettingsDialog from '@/features/system/components/settings-dialog/SettingsDialog'
import ItemDetailDialog from '@/features/media-maintenance/components/item-detail-dialog'
import ImportDataDialog from '@/features/data-management/components/import-data-dialog'
import ExportDataDialog from '@/features/data-management/components/export-data-dialog'
import { UseHomeStateReturn } from '@/stores/hooks'
import { useData } from '@/shared/components/client-data-provider'

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
        initialSection="api"
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
        />
      )}

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
