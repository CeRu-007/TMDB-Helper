"use client"

import React, { useState } from "react"
import { TMDBTable as BaseTMDBTable } from "@/components/tmdb-table"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Grid, LayoutGrid } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { TableHelpTooltip } from "./table-help-tooltip"
import { Trash2 } from "lucide-react"

// 导入CSV数据类型
import { CSVData as CSVDataType } from "@/lib/csv-processor"
export type CSVData = CSVDataType

// 导入TMDBTableProps类型并扩展
import type { TMDBTableProps } from "@/components/tmdb-table"
export interface NewTMDBTableProps extends TMDBTableProps {
  onChange?: (newData: CSVDataType) => void
  onSave?: () => Promise<boolean | undefined>
  onCancel?: () => void
  height?: string
  isSaving?: boolean
}

/**
 * NewTMDBTable 组件
 * 增强版CSV表格编辑器，提供更好的可视化体验和编辑功能
 * 特性：
 * - 固定行高，确保表格整齐一致
 * - 网格线显示，提高可读性
 * - 列宽可调整
 * - 列顺序可拖拽调整
 * - 大数据集虚拟滚动优化
 * - 列操作和行操作功能
 * - 改善的单元格编辑体验
 */
const NewTMDBTableComponent = (props: NewTMDBTableProps) => {
  // 表格配置状态
  const [config, setConfig] = useState({
    showGridLines: true,
    fixedRowHeight: true,
    enableResize: true,
    enableReorder: true,
    showRowNumbers: true,
    alternateRowColors: true,
    showColumnOperations: true,
    showRowOperations: true,
    // 行高设置为40px，与VS Code的CSV编辑器类似
    rowHeight: 40,
  });

  // 选中行状态（从子组件传递上来）
  const [selectedRowsCount, setSelectedRowsCount] = useState(0);
  const [tableRef, setTableRef] = useState<any>(null);
  
  // 切换网格线显示
  const toggleGridLines = () => {
    setConfig({
      ...config,
      showGridLines: !config.showGridLines
    });
  };
  
  // 切换交替行颜色
  const toggleAlternateRowColors = () => {
    setConfig({
      ...config,
      alternateRowColors: !config.alternateRowColors
    });
  };
  
  // 增强的样式类
  const enhancedClassName = cn(
    props.className || "",
    "new-tmdb-table",
    "optimized-table", // 添加新的样式类
    config.showGridLines && "grid-lines",
    config.fixedRowHeight && "fixed-row-height",
    config.alternateRowColors && "alternate-rows"
  );
  
  // 增强的属性
  const enhancedProps = {
    ...props,
    className: enhancedClassName,
    // 启用列宽调整
    enableColumnResizing: config.enableResize,
    // 启用列顺序调整
    enableColumnReordering: config.enableReorder,
    // 设置行高
    rowHeight: config.fixedRowHeight ? config.rowHeight : 40,
    // 传递数据变更回调
    onDataChange: props.onChange || undefined
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  pressed={config.showGridLines}
                  onPressedChange={toggleGridLines}
                  size="sm"
                  aria-label="切换网格线"
                >
                  <Grid className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                <p>切换网格线显示</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  pressed={config.alternateRowColors}
                  onPressedChange={toggleAlternateRowColors}
                  size="sm"
                  aria-label="切换交替行颜色"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                <p>切换交替行颜色</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />
          
          <span className="text-xs text-muted-foreground">
            {props.data?.rows?.length || 0} 行 × {props.data?.headers?.length || 0} 列
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {props.isSaving && (
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
              <span>保存中...</span>
            </div>
          )}
          
          <TableHelpTooltip />
        </div>
      </div>

      {/* 表格区域 - 增强滚动容器 */}
      <div className="flex-1 min-h-0 overflow-hidden csv-table-wrapper">
        {/* 表格主体内容 */}
        <div className="h-full w-full min-h-0 overflow-hidden">
          <BaseTMDBTable 
            {...enhancedProps} 
            showRowNumbers={config.showRowNumbers}
            showColumnOperations={config.showColumnOperations}
            showRowOperations={config.showRowOperations}
          />
        </div>
        
        {/* 滚动提示器 - 视觉反馈区域 */}
        <div className="csv-scroll-indicators">
          <div className="scroll-indicator-left"></div>
          <div className="scroll-indicator-right"></div>
        </div>
      </div>
    </div>
  );
}

// 使用React.memo优化性能
export const NewTMDBTable = React.memo(NewTMDBTableComponent, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时才重新渲染
  return (
    prevProps.data === nextProps.data &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.onSave === nextProps.onSave &&
    prevProps.onCancel === nextProps.onCancel &&
    prevProps.height === nextProps.height &&
    prevProps.isSaving === nextProps.isSaving &&
    prevProps.className === nextProps.className
  )
})

NewTMDBTable.displayName = 'NewTMDBTable'