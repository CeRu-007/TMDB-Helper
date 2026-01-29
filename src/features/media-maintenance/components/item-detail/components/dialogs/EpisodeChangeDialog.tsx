"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { AlertTriangle } from "lucide-react"

interface EpisodeChangeData {
  oldCount: number
  newCount: number
  action: "increase" | "decrease"
}

interface EpisodeChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  episodeChangeData: EpisodeChangeData | null
  onCancel: () => void
  onConfirm: () => void
}

export function EpisodeChangeDialog({
  open,
  onOpenChange,
  episodeChangeData,
  onCancel,
  onConfirm
}: EpisodeChangeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认修改集数</AlertDialogTitle>
          <AlertDialogDescription>
            {episodeChangeData?.action === "increase"
              ? `确定要将集数从 ${episodeChangeData?.oldCount} 增加到 ${episodeChangeData?.newCount} 吗？`
              : `确定要将集数从 ${episodeChangeData?.oldCount} 减少到 ${episodeChangeData?.newCount} 吗？`}
            {episodeChangeData?.action === "decrease" && (
              <div className="mt-2 text-red-500">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                警告：这将删除多余的集数及其完成状态！
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>确认</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}