import React from "react"
import {
  Film,
  Wand2,
  CheckCircle2
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Input } from "@/shared/components/ui/input"
import { VideoAnalysisResultDialogProps } from './types'
import { useTranslation } from "react-i18next"

export function VideoAnalysisResultDialog({
  open,
  onOpenChange,
  result,
  movieTitle,
  onMovieTitleChange,
  onGenerateEpisode
}: VideoAnalysisResultDialogProps) {
  const { t } = useTranslation("episode-generation")

  if (!result) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full md:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-base md:text-lg">
            <Film className="h-4 w-4 md:h-5 md:w-5" />
            <span>{t("videoAnalysis.audioTranscribeResult")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs md:text-sm">
            {t("videoAnalysis.aiTranscribeComplete")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 md:mt-4">
          <div className="mb-2 md:mb-3">
            <h3 className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <Film className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
              {t("videoAnalysis.srtContent")}
            </h3>
            <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">
              {t("videoAnalysis.srtContentDesc")}
            </p>
          </div>

          <div className="h-[180px] md:h-[240px] border rounded-lg bg-gray-50 dark:bg-gray-900 overflow-auto">
            <div className="p-3 md:p-4">
              <pre className="whitespace-pre-wrap text-xs md:text-sm font-mono">
                {result.structuredContent.srt || t("videoAnalysis.noSrtContent")}
              </pre>
            </div>
          </div>
        </div>

        <div className="border-t pt-3 md:pt-4 space-y-3 md:space-y-4 mt-3 md:mt-4">
          {/* 关键信息修正区域 */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 md:p-4">
            <h4 className="text-xs md:text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 md:mb-3 flex items-center">
              <Wand2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
              {t("videoAnalysis.aiCorrection")}
            </h4>
            <p className="text-[10px] md:text-xs text-blue-600 dark:text-blue-300 mb-2 md:mb-3">
              {t("videoAnalysis.aiCorrectionDesc")}
            </p>
            <div className="space-y-2 md:space-y-3">
              <div>
                <Label htmlFor="movieTitle" className="text-xs md:text-sm">
                  {t("videoAnalysis.movieNameHint")}
                </Label>
                <Input
                  id="movieTitle"
                  value={movieTitle}
                  onChange={(e) => onMovieTitleChange(e.target.value)}
                  placeholder={t("videoAnalysis.movieNamePlaceholder")}
                  className="mt-1"
                />
              </div>

            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col-reverse md:flex-row md:justify-between gap-2 md:gap-0">
            <Button variant="outline" className="min-h-[44px]" onClick={() => onOpenChange(false)}>
              {t("videoAnalysisResult.close")}
            </Button>
            <Button onClick={onGenerateEpisode} className="min-h-[44px] bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t("videoAnalysis.generateEpisode")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
