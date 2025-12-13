"use client"

import { Button } from "@/components/common/button"
import { Plus } from "lucide-react"

interface EmptyStateProps {
  onAddItem: () => void
}

export function EmptyState({ onAddItem }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg border border-blue-200 dark:border-blue-800 max-w-md">
        <h2 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">开始使用TMDB维护助手</h2>
        <p className="text-blue-600 dark:text-blue-300 mb-4">点击右上角的"+"按钮添加您的第一个词条</p>
        <Button onClick={onAddItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          添加词条
        </Button>
      </div>
    </div>
  )
}