export interface DashboardData {
  profile: {
    type: string
    totalItems: number
    completedItems: number
    completionRate: number
    topCategory: string | null
    topCategoryRate: number
    automatedItems: number
    automationRate: number
    peakHour: number | null
    peakWeekday: number | null
    firstItemTitle: string | null
    firstItemDate: string | null
    topPosterUrls: string[]
    categoryDistribution: Array<{ category: string; count: number }>
  }
  milestones: Array<{
    date: string
    title: string
    description: string
    icon: string
  }>
  funFacts: Array<{
    key: string
    value: string | number
    label: string
    icon: string
  }>
  achievements: Array<{
    id: string
    icon: string
    name: string
    description: string
    unlocked: boolean
    unlockedAt?: string
  }>
  monthlyComparison: Array<{
    month: string
    newItems: number
    completedItems: number
  }>
  smartSuggestions: Array<{
    type: string
    message: string
    priority: number
  }>
  stats: {
    totalItems: number
    completedItems: number
    inProgressItems: number
    todayUpdatedItems: number
    enabledScheduleTasks: number
    completionRate: number
  }
  weekdayDistribution: Array<{ weekday: number; count: number }>
  completionProgress: Array<{
    id: string
    title: string
    category: string | null
    posterUrl: string | null
    totalEpisodes: number
    completedEpisodes: number
    progress: number
  }>
  recentUpdatedItems: Array<{
    id: string
    title: string
    category: string | null
    posterUrl: string | null
    updatedAt: string
    completed: number
  }>
}
