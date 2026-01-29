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
import type { TMDBItem } from "@/lib/data/storage"

interface DeleteItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: TMDBItem
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteItemDialog({
  open,
  onOpenChange,
  item,
  onCancel,
  onConfirm
}: DeleteItemDialogProps) {
  return (
    <AlertDialogNoOverlay open={open} onOpenChange={onOpenChange}>
      <AlertDialogNoOverlayContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除 "{item.title}" 吗？此操作不可撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600"
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogNoOverlayContent>
    </AlertDialogNoOverlay>
  )
}