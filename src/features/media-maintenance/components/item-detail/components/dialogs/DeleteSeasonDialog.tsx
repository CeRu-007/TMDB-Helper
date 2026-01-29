"use client"

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogNoOverlay,
  AlertDialogNoOverlayContent,
} from "@/shared/components/ui/alert-dialog"

interface DeleteSeasonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  seasonToDelete: number | null
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteSeasonDialog({
  open,
  onOpenChange,
  seasonToDelete,
  onCancel,
  onConfirm
}: DeleteSeasonDialogProps) {
  const handleCancel = () => {
    onCancel()
  }

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <AlertDialogNoOverlay open={open} onOpenChange={onOpenChange}>
      <AlertDialogNoOverlayContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除季</AlertDialogTitle>
          <AlertDialogDescription>
            {seasonToDelete !== null ? `确定要删除第 ${seasonToDelete} 季吗？此操作不可撤销。` : '确定要删除选中的季吗？此操作不可撤销。'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>确认</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogNoOverlayContent>
    </AlertDialogNoOverlay>
  )
}