import React from "react"

interface MainContentAreaProps {
  children: React.ReactNode
  contentKey: string
}

export function MainContentArea({ children, contentKey }: MainContentAreaProps) {
  const isOverflowHidden = contentKey === 'thumbnails-extract' || contentKey === 'thumbnails-crop' || contentKey === 'item-detail'

  return (
    <main className="flex-1 overflow-hidden">
      <div
        id="main-content-container"
        className={`h-full relative ${
          isOverflowHidden ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {children}
      </div>
    </main>
  )
}