import React from 'react'
import {
  LayoutGrid,
  Sparkles,
  Tv,
  Baby,
  Popcorn,
  Ticket,
  Clapperboard
} from 'lucide-react'

export interface Category {
  id: string
  name: string
  icon: React.ReactNode
}

// 分类列表
export const categories: Category[] = [
  { id: "all", name: "全部", icon: <LayoutGrid className="h-4 w-4 mr-2" /> },
  { id: "anime", name: "动漫", icon: <Sparkles className="h-4 w-4 mr-2" /> },
  { id: "tv", name: "电视剧", icon: <Tv className="h-4 w-4 mr-2" /> },
  { id: "kids", name: "少儿", icon: <Baby className="h-4 w-4 mr-2" /> },
  { id: "variety", name: "综艺", icon: <Popcorn className="h-4 w-4 mr-2" /> },
  { id: "short", name: "短剧", icon: <Ticket className="h-4 w-4 mr-2" /> },
]