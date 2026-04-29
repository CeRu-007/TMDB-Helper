import { useEffect, useCallback } from "react"
import type { UseTMDBTableKeyboardOptions } from "../types"

export function useTMDBTableKeyboard({
  isActive,
  selectedCells,
  activeCell,
  isEditing,
  onDelete,
  onCopy,
  onPaste,
  onUndo,
  onRedo,
  onSelectAll,
  onNavigate,
  onEdit,
  onEscape,
}: UseTMDBTableKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive || isEditing) return

      // 删除选中内容
      if (e.key === "Delete" && selectedCells.length > 0) {
        e.preventDefault()
        onDelete?.()
        return
      }

      // 复制
      if (
        e.key === "c" &&
        (e.ctrlKey || e.metaKey) &&
        selectedCells.length > 0
      ) {
        e.preventDefault()
        onCopy?.()
        return
      }

      // 粘贴
      if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        onPaste?.()
        return
      }

      // 撤销
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        onUndo?.()
        return
      }

      // 重做
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault()
        onRedo?.()
        return
      }

      // 全选
      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        onSelectAll?.()
        return
      }

      // 键盘导航
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault()
        onNavigate?.(e.key, e.shiftKey)
        return
      }

      // 开始编辑
      if ((e.key === "Enter" || e.key === "F2") && activeCell) {
        e.preventDefault()
        onEdit?.()
        return
      }

      // 取消选择
      if (e.key === "Escape") {
        e.preventDefault()
        onEscape?.()
        return
      }
    },
    [
      isActive,
      isEditing,
      selectedCells,
      activeCell,
      onDelete,
      onCopy,
      onPaste,
      onUndo,
      onRedo,
      onSelectAll,
      onNavigate,
      onEdit,
      onEscape,
    ]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])
}
