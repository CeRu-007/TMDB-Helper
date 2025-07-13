"use client"

import React from "react"

export function ImageCropperSimple() {
  const renderEmptyState = () => (
    <div className="space-y-6">
      <p>Empty state</p>
    </div>
  )

  // 主渲染
  return (
    <div className="space-y-6">
      <p>Main content</p>
      {renderEmptyState()}
    </div>
  )
}
