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
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation('media')

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('dialogs.confirmChangeEpisodeCount')}</AlertDialogTitle>
          <AlertDialogDescription>
            {episodeChangeData?.action === "increase"
              ? t('dialogs.confirmIncreaseEpisode', { old: episodeChangeData?.oldCount, new: episodeChangeData?.newCount })
              : t('dialogs.confirmDecreaseEpisode', { old: episodeChangeData?.oldCount, new: episodeChangeData?.newCount })}
            {episodeChangeData?.action === "decrease" && (
              <div className="mt-2 text-red-500">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                {t('dialogs.warningDeleteEpisodes')}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t('dialogs.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t('dialogs.confirm')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
