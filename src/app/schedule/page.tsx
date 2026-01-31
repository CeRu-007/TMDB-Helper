import { Metadata } from 'next'
import { ScheduleView } from '@/features/schedule/components/schedule-view'

export const metadata: Metadata = {
  title: '时间表 - TMDB Helper',
  description: '查看番剧更新时间表，追剧不再错过',
}

export default function SchedulePage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ScheduleView className="h-full" />
    </div>
  )
}
