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
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation('media')

  return (
    <AlertDialogNoOverlay open={open} onOpenChange={onOpenChange}>
      <AlertDialogNoOverlayContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('dialogs.confirmDelete')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('dialogs.confirmDeleteItem', { title: item.title })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{t('dialogs.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-500 hover:bg-red-600"
          >
            {t('dialogs.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogNoOverlayContent>
    </AlertDialogNoOverlay>
  )
}
