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
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation('media')

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
          <AlertDialogTitle>{t('dialogs.confirmDelete')}</AlertDialogTitle>
          <AlertDialogDescription>
            {seasonToDelete !== null
              ? t('dialogs.confirmDeleteSeason', { season: seasonToDelete })
              : t('dialogs.confirmDeleteSeasonGeneric')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t('dialogs.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t('dialogs.confirm')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogNoOverlayContent>
    </AlertDialogNoOverlay>
  )
}
