"use client"

import { useState } from "react"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Link2, Info, ExternalLink, FrameIcon, ChevronDown } from "lucide-react"
import { CachedImage } from "@/shared/components/ui/cached-image"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { getPlatformInfo } from "@/lib/utils"
import { PlatformLogo } from "@/shared/components/ui/platform-icon"
import type { TMDBItem } from "@/lib/data/storage"
import { useTranslation } from "react-i18next"

interface MediaInfoCardProps {
  item: TMDBItem
}

export function MediaInfoCard({
  item
}: MediaInfoCardProps) {
  const { t } = useTranslation('media')
  const [platformOpen, setPlatformOpen] = useState(false)

  const hasPlatforms = !!(item.networks?.length || item.networkLogoUrl || (item.platformUrls && item.platformUrls.length > 0))

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 播出平台区域 - 优先使用TMDB网络logo，下方展示所有平台URL图标 */}
      <div className="pb-0.5 mb-0.5">
        <h3 className="text-sm font-medium flex items-center">
          <Link2 className="h-3.5 w-3.5 mr-1.5" />
          {t('mediaInfo.broadcastPlatform')}
          {hasPlatforms && (
            <Popover open={platformOpen} onOpenChange={setPlatformOpen}>
              <PopoverTrigger asChild>
                <button
                  className="ml-1 h-4 w-4 flex items-center justify-center rounded hover:bg-accent focus:outline-none"
                  aria-label={t('mediaInfo.viewPlatforms')}
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2 min-w-[120px]" side="bottom" align="start">
                {platformOpen && (
                  <div className="flex flex-wrap items-center gap-2 max-w-[240px]">
                    {item.networks?.map((n) => (
                      <div key={n.id} className="h-8 flex items-center" title={n.name}>
                        {n.logoUrl ? (
                          <CachedImage
                            src={n.logoUrl}
                            alt={n.name}
                            className="max-h-full w-auto object-contain"
                            style={{ width: 'auto', height: '100%' }}
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">{n.name}</span>
                        )}
                      </div>
                    ))}
                    {item.platformUrls?.map((url, idx) => {
                      const info = getPlatformInfo(url)
                      return info ? (
                        <div key={`url-${idx}`} className="h-8 flex items-center" title={info.name}>
                          <PlatformLogo platform={info.name} size={24} />
                        </div>
                      ) : null
                    })}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}
        </h3>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        {/* TMDB网络Logo - 仅展示网络信息，不可点击 */}
        {item.networkLogoUrl && (
          <div
            className="h-8 flex items-center justify-start opacity-80"
            title={item.networkName || t('mediaInfo.broadcastNetwork')}
          >
            <CachedImage
              src={item.networkLogoUrl}
              alt={item.networkName || t('mediaInfo.broadcastNetwork')}
              className="max-h-full w-auto object-contain"
              style={{ width: 'auto', height: '100%' }}
              loading="eager"
              decoding="async"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* 平台URL图标列表 - 每个可点击跳转 */}
        {item.platformUrls?.map((url, idx) => {
          const info = getPlatformInfo(url)
          return (
            <div
              key={idx}
              className="h-8 flex items-center justify-start cursor-pointer"
              onClick={() => window.open(url, '_blank')}
              title={info?.name || url}
            >
              {info ? (
                <PlatformLogo
                  platform={info.name}
                  size={24}
                  className="hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <ExternalLink className="h-5 w-5 text-foreground/70 hover:text-foreground transition-colors" />
              )}
            </div>
          )
        })}

        {/* 无任何平台数据时显示占位 */}
        {!item.networkLogoUrl && (!item.platformUrls || item.platformUrls.length === 0) && (
          <div className="h-8 flex items-center justify-start">
            <FrameIcon className="h-6 w-6 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* TMDB简介区域 */}
      <div className="pb-0.5 mb-1 mt-3">
        <h3 className="text-sm font-medium flex items-center">
          <Info className="h-3.5 w-3.5 mr-1.5" />
          {t('mediaInfo.synopsis')}
        </h3>
      </div>
      <div className="bg-background/20 rounded-lg overflow-hidden flex-1 min-h-[110px] mb-2 shadow-sm transition-all duration-300 hover:shadow-md">
        <ScrollArea className="h-full">
          <div className="p-3 text-sm">
            {item.overview ? (
              <p className="text-sm break-words">{item.overview}</p>
            ) : (
              <span className="text-muted-foreground text-xs italic">-</span>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
