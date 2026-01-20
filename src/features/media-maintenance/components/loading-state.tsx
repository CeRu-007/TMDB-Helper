"use client"

import { Loader2 } from "lucide-react"

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
      <h2 className="text-xl font-semibold mb-2">正在加载数据...</h2>
      <p className="text-gray-500 text-center mb-6">首次加载可能需要几秒钟</p>
    </div>
  )
}