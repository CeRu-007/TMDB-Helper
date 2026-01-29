"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Button } from "@/shared/components/ui/button"
import { Link2, Info, ExternalLink, FrameIcon } from "lucide-react"
import { CachedImage } from "@/shared/components/ui/cached-image"
import { getPlatformInfo } from "@/lib/utils"
import { PlatformLogo } from "@/shared/components/ui/platform-icon"
import type { TMDBItem } from "@/lib/data/storage"

interface MediaInfoCardProps {
  item: TMDBItem
}

export function MediaInfoCard({
  item
}: MediaInfoCardProps) {
  return (
    <>
      {/* 播出平台区域 - 优先使用TMDB网络logo */}
      <div className="pb-0.5 mb-0.5">
        <h3 className="text-sm font-medium flex items-center">
          <Link2 className="h-3.5 w-3.5 mr-1.5" />
          播出平台
        </h3>
      </div>
      <div className="flex items-center justify-start mb-1">
        {/* 平台Logo区域 - 优先使用TMDB网络logo */}
        <div className="flex items-center justify-start w-full">
          {item.networkLogoUrl ? (
            <div
              className="w-full h-12 flex items-center justify-start cursor-pointer"
              onClick={() => item.platformUrl && window.open(item.platformUrl, '_blank')}
              title={item.networkName || '播出网络'}
            >
              <CachedImage
                src={item.networkLogoUrl}
                alt={item.networkName || '播出网络'}
                className="max-w-full max-h-full object-contain hover:scale-110 transition-all duration-300"
                loading="eager"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const container = e.currentTarget.parentElement;
                  if (container) {
                    const networkIcon = document.createElement('div');
                    networkIcon.innerHTML = `<div class="flex items-center justify-center w-full h-full"><svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" class="text-foreground/70"><path d="M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z"></path><path d="M3.6 8.25h16.8M3.6 15.75h16.8M12 3.6v16.8"></path></svg></div>`;
                    container.appendChild(networkIcon);
                  }
                }}
              />
            </div>
          ) : item.platformUrl ? (
            (() => {
              const platformInfo = getPlatformInfo(item.platformUrl);
              return (
                <div
                  className="w-full h-12 flex items-center justify-start cursor-pointer"
                  onClick={() => platformInfo && window.open(platformInfo.url, '_blank')}
                  title={platformInfo?.name || '播出平台'}
                >
                  {platformInfo ? (
                    <PlatformLogo
                      platform={platformInfo.name}
                      size={32}
                      className="hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <ExternalLink className="h-9 w-9 text-foreground/70" />
                  )}
                </div>
              );
            })()
          ) : (
            <div className="w-full h-12 flex items-center justify-start">
              <FrameIcon className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>
      </div>

      {/* TMDB简介区域 */}
      <div className="pb-0.5 mb-1 mt-3">
        <h3 className="text-sm font-medium flex items-center">
          <Info className="h-3.5 w-3.5 mr-1.5" />
          简介
        </h3>
      </div>
      <div className="bg-background/20 rounded-lg overflow-hidden h-[110px] mb-2 shadow-sm transition-all duration-300 hover:shadow-md">
        <ScrollArea className="h-full">
          <div className="p-3 text-sm">
            {item.overview ? (
              <p className="text-sm break-words">{item.overview}</p>
            ) : (
              <span className="text-muted-foreground text-xs italic">暂无简介信息</span>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}