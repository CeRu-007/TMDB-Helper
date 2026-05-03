import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseAsync } from '@/lib/database/connection'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabaseAsync()

    const profile = getProfile(db)
    const milestones = getMilestones(db)
    const funFacts = getFunFacts(db)
    const achievements = getAchievements(db)
    const monthlyComparison = getMonthlyComparison(db)
    const smartSuggestions = getSmartSuggestions(db)
    const stats = getStats(db)
    const weekdayDistribution = getWeekdayDistribution(db)
    const completionProgress = getCompletionProgress(db)
    const recentUpdatedItems = getRecentUpdatedItems(db)

    return NextResponse.json({
      success: true,
      data: {
        profile,
        milestones,
        funFacts,
        achievements,
        monthlyComparison,
        smartSuggestions,
        stats,
        weekdayDistribution,
        completionProgress,
        recentUpdatedItems,
      },
    })
  } catch (error) {
    logger.error('[Dashboard API] 获取仪表盘数据失败:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '获取仪表盘数据失败' },
      { status: 500 }
    )
  }
}

function getProfile(db: any) {
  const totalItems = (db.prepare('SELECT COUNT(*) as c FROM items WHERE deletedAt IS NULL').get() as { c: number }).c
  const completedItems = (db.prepare('SELECT COUNT(*) as c FROM items WHERE deletedAt IS NULL AND completed = 1').get() as { c: number }).c

  const categoryRows = db.prepare(`
    SELECT COALESCE(category, 'uncategorized') as category, COUNT(*) as count
    FROM items WHERE deletedAt IS NULL GROUP BY category ORDER BY count DESC
  `).all() as Array<{ category: string; count: number }>

  const topCategory = categoryRows.length > 0 ? categoryRows[0].category : null
  const topCategoryCount = categoryRows.length > 0 ? categoryRows[0].count : 0
  const topCategoryRate = totalItems > 0 ? Math.round((topCategoryCount / totalItems) * 100) : 0

  const automatedItems = (db.prepare('SELECT COUNT(DISTINCT itemId) as c FROM schedule_tasks WHERE enabled = 1').get() as { c: number }).c
  const automationRate = totalItems > 0 ? Math.round((automatedItems / totalItems) * 100) : 0

  const peakHourRow = db.prepare(`
    SELECT CAST(strftime('%H', createdAt) AS INTEGER) as hour, COUNT(*) as count
    FROM items WHERE deletedAt IS NULL AND createdAt IS NOT NULL
    GROUP BY hour ORDER BY count DESC LIMIT 1
  `).get() as { hour: number; count: number } | undefined
  const peakHour = peakHourRow?.hour ?? null

  const peakWeekdayRow = db.prepare(`
    SELECT weekday, COUNT(*) as count
    FROM items WHERE deletedAt IS NULL AND weekday IS NOT NULL
    GROUP BY weekday ORDER BY count DESC LIMIT 1
  `).get() as { weekday: number; count: number } | undefined
  const peakWeekday = peakWeekdayRow?.weekday ?? null

  const isPerfectionist = completedItems === totalItems && totalItems > 0
  const firstItemDate = (db.prepare('SELECT MIN(createdAt) as d FROM items WHERE deletedAt IS NULL').get() as { d: string | null }).d
  const daysSinceStart = firstItemDate ? Math.floor((Date.now() - new Date(firstItemDate).getTime()) / 86400000) : 0
  const isVeteran = daysSinceStart >= 90
  const isAutomator = automationRate >= 60 && automatedItems >= 3

  const isNightOwl = peakHour !== null && (peakHour >= 22 || peakHour <= 4)

  let type = 'explorer'
  if (topCategoryRate >= 60) {
    type = topCategory === 'anime' ? 'anime_guardian' :
           topCategory === 'tv' ? 'drama_hunter' :
           topCategory === 'kids' ? 'kids_protector' :
           topCategory === 'variety' ? 'variety_master' :
           topCategory === 'short' ? 'short_runner' : 'specialist'
  } else if (isPerfectionist) {
    type = 'perfectionist'
  } else if (isAutomator) {
    type = 'automator'
  } else if (isNightOwl) {
    type = 'night_owl'
  } else if (isVeteran) {
    type = 'veteran'
  }

  const firstItem = db.prepare(`
    SELECT title, createdAt FROM items WHERE deletedAt IS NULL ORDER BY createdAt ASC LIMIT 1
  `).get() as { title: string; createdAt: string } | undefined

  const topPosterRows = db.prepare(`
    SELECT posterUrl, backdropUrl FROM items
    WHERE deletedAt IS NULL AND (posterUrl IS NOT NULL AND posterUrl != '' OR backdropUrl IS NOT NULL AND backdropUrl != '')
    ORDER BY RANDOM() LIMIT 9
  `).all() as Array<{ posterUrl: string | null; backdropUrl: string | null }>

  const topPosterUrls = topPosterRows
    .map(row => row.backdropUrl || row.posterUrl)
    .filter((url): url is string => !!url)

  return {
    type,
    totalItems,
    completedItems,
    completionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    topCategory,
    topCategoryRate,
    automatedItems,
    automationRate,
    peakHour,
    peakWeekday,
    firstItemTitle: firstItem?.title || null,
    firstItemDate: firstItem?.createdAt || null,
    topPosterUrls,
    categoryDistribution: categoryRows,
  }
}

function getMilestones(db: any): Array<{ date: string; title: string; description: string; icon: string }> {
  const milestones: Array<{ date: string; title: string; description: string; icon: string }> = []

  const first = db.prepare(`
    SELECT title, createdAt FROM items WHERE deletedAt IS NULL ORDER BY createdAt ASC LIMIT 1
  `).get() as { title: string; createdAt: string } | undefined
  if (first) {
    milestones.push({ date: first.createdAt, title: 'first_item', description: first.title, icon: 'sprout' })
  }

  const totalItems = (db.prepare('SELECT COUNT(*) as c FROM items WHERE deletedAt IS NULL').get() as { c: number }).c
  const thresholds = [10, 50, 100, 200, 500, 1000]
  for (const t of thresholds) {
    if (totalItems < t) break
    const row = db.prepare(`
      SELECT createdAt as date FROM items WHERE deletedAt IS NULL ORDER BY createdAt ASC LIMIT 1 OFFSET ?
    `).get(t - 1) as { date: string } | undefined
    if (row?.date) {
      milestones.push({
        date: row.date,
        title: `items_${t}`,
        description: '',
        icon: t >= 500 ? 'trophy' : t >= 100 ? 'medal' : t >= 50 ? 'award' : 'star',
      })
    }
  }

  const firstCompleted = db.prepare(`
    SELECT title, updatedAt FROM items WHERE deletedAt IS NULL AND completed = 1 ORDER BY updatedAt ASC LIMIT 1
  `).get() as { title: string; updatedAt: string } | undefined
  if (firstCompleted) {
    milestones.push({ date: firstCompleted.updatedAt, title: 'first_completed', description: firstCompleted.title, icon: 'check-circle' })
  }

  const firstAi = db.prepare(`SELECT MIN(createdAt) as date FROM chatHistories`).get() as { date: string } | undefined
  if (firstAi?.date) {
    milestones.push({ date: firstAi.date, title: 'first_ai', description: '', icon: 'bot' })
  }

  const firstSchedule = db.prepare(`SELECT MIN(createdAt) as date FROM schedule_tasks`).get() as { date: string } | undefined
  if (firstSchedule?.date) {
    milestones.push({ date: firstSchedule.date, title: 'first_schedule', description: '', icon: 'calendar-check' })
  }

  return milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

function getFunFacts(db: any): Array<{ key: string; value: string | number; label: string; icon: string }> {
  const facts: Array<{ key: string; value: string | number; label: string; icon: string }> = []

  const progressRows = db.prepare(`
    SELECT SUM(COALESCE(currentEpisode, 0)) as done, SUM(totalEpisodes) as total
    FROM seasons
  `).get() as { done: number | null; total: number | null }
  const totalEpisodesDone = progressRows?.done || 0
  facts.push({ key: 'episodes_done', value: totalEpisodesDone, label: 'episodes_done_desc', icon: 'tv' })

  const automatedItems = (db.prepare('SELECT COUNT(DISTINCT itemId) as c FROM schedule_tasks WHERE enabled = 1').get() as { c: number }).c
  facts.push({ key: 'automated_items', value: automatedItems, label: 'automated_items_desc', icon: 'bot' })

  const totalCategories = (db.prepare('SELECT COUNT(DISTINCT category) as c FROM items WHERE deletedAt IS NULL AND category IS NOT NULL').get() as { c: number }).c
  facts.push({ key: 'categories', value: totalCategories, label: 'categories_desc', icon: 'tag' })

  const totalSeasons = (db.prepare('SELECT COUNT(*) as c FROM seasons').get() as { c: number }).c
  facts.push({ key: 'total_seasons', value: totalSeasons, label: 'total_seasons_desc', icon: 'layers' })

  const mostInvestedRow = db.prepare(`
    SELECT i.title, SUM(COALESCE(s.currentEpisode, 0)) as done
    FROM items i
    JOIN seasons s ON i.id = s.itemId
    WHERE i.deletedAt IS NULL
    GROUP BY i.id
    ORDER BY done DESC
    LIMIT 1
  `).get() as { title: string; done: number } | undefined
  if (mostInvestedRow && mostInvestedRow.done > 0) {
    facts.push({ key: 'most_invested', value: mostInvestedRow.title, label: 'most_invested_desc', icon: 'clapperboard' })
  }

  const taskStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success
    FROM schedule_logs
  `).get() as { total: number; success: number } | undefined
  if (taskStats && taskStats.total > 0) {
    const successRate = Math.round((taskStats.success / taskStats.total) * 100)
    facts.push({ key: 'task_success_rate', value: `${successRate}%`, label: 'task_success_rate_desc', icon: 'check-circle' })
  }

  const peakDayRow = db.prepare(`
    SELECT date(startAt) as day, COUNT(*) as count
    FROM schedule_logs
    WHERE startAt IS NOT NULL
    GROUP BY day ORDER BY count DESC LIMIT 1
  `).get() as { day: string; count: number } | undefined
  if (peakDayRow) {
    facts.push({ key: 'peak_day', value: peakDayRow.count, label: 'peak_day_desc', icon: 'flame' })
    facts.push({ key: 'peak_day_date', value: peakDayRow.day, label: 'peak_day_date_desc', icon: 'calendar' })
  }

  const mostEditedRow = db.prepare(`
    SELECT i.title, COUNT(sl.id) as log_count
    FROM items i
    JOIN schedule_tasks st ON i.id = st.itemId
    JOIN schedule_logs sl ON st.id = sl.taskId
    WHERE i.deletedAt IS NULL
    GROUP BY i.id
    ORDER BY log_count DESC
    LIMIT 1
  `).get() as { title: string; log_count: number } | undefined
  if (mostEditedRow && mostEditedRow.log_count > 0) {
    facts.push({ key: 'most_edited', value: mostEditedRow.title, label: 'most_edited_desc', icon: 'pencil' })
  }

  return facts
}

function getAchievements(db: any): Array<{ id: string; icon: string; name: string; description: string; unlocked: boolean; unlockedAt?: string }> {
  const totalItems = (db.prepare('SELECT COUNT(*) as c FROM items WHERE deletedAt IS NULL').get() as { c: number }).c
  const completedItems = (db.prepare('SELECT COUNT(*) as c FROM items WHERE deletedAt IS NULL AND completed = 1').get() as { c: number }).c
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  const firstItemDate = (db.prepare('SELECT MIN(createdAt) as d FROM items WHERE deletedAt IS NULL').get() as { d: string | null }).d
  const daysSinceStart = firstItemDate ? Math.floor((Date.now() - new Date(firstItemDate).getTime()) / 86400000) : 0

  const hasAiUsage = (db.prepare('SELECT COUNT(*) as c FROM chatHistories').get() as { c: number }).c > 0

  const hasSchedule = (db.prepare('SELECT COUNT(*) as c FROM schedule_tasks WHERE enabled = 1').get() as { c: number }).c > 0
  const automatedItems = (db.prepare('SELECT COUNT(DISTINCT itemId) as c FROM schedule_tasks WHERE enabled = 1').get() as { c: number }).c

  const totalCategories = (db.prepare('SELECT COUNT(DISTINCT category) as c FROM items WHERE deletedAt IS NULL AND category IS NOT NULL').get() as { c: number }).c

  const progressRows = db.prepare(`
    SELECT SUM(COALESCE(currentEpisode, 0)) as done FROM seasons
  `).get() as { done: number | null }
  const totalEpisodesDone = progressRows?.done || 0

  const maxDailyRow = db.prepare(`
    SELECT MAX(cnt) as max_count FROM (
      SELECT date(startAt) as day, COUNT(*) as cnt
      FROM schedule_logs WHERE startAt IS NOT NULL
      GROUP BY day
    )
  `).get() as { max_count: number | null }
  const maxDailyOps = maxDailyRow?.max_count || 0

  const nthItemDate = (n: number): string | undefined => {
    const row = db.prepare('SELECT createdAt FROM items WHERE deletedAt IS NULL ORDER BY createdAt ASC LIMIT 1 OFFSET ?').get(n - 1) as { createdAt: string } | undefined
    return row?.createdAt
  }

  const firstAiDate = (db.prepare('SELECT MIN(createdAt) as d FROM chatHistories').get() as { d: string | null }).d || undefined
  const firstScheduleDate = (db.prepare('SELECT MIN(createdAt) as d FROM schedule_tasks').get() as { d: string | null }).d || undefined

  const firstCompletedDate = (db.prepare('SELECT MIN(updatedAt) as d FROM items WHERE deletedAt IS NULL AND completed = 1').get() as { d: string | null }).d || undefined

  const veteranDate = daysSinceStart >= 30 ? new Date(new Date(firstItemDate!).getTime() + 30 * 86400000).toISOString() : undefined
  const longRunnerDate = daysSinceStart >= 180 ? new Date(new Date(firstItemDate!).getTime() + 180 * 86400000).toISOString() : undefined

  const allAchievements = [
    { id: 'first_step', icon: 'sprout', name: 'first_step', description: 'first_step_desc', condition: totalItems >= 1, unlockedAt: totalItems >= 1 ? firstItemDate || undefined : undefined },
    { id: 'fifty_items', icon: 'award', name: 'fifty_items', description: 'fifty_items_desc', condition: totalItems >= 50, unlockedAt: totalItems >= 50 ? nthItemDate(50) : undefined },
    { id: 'hundred_items', icon: 'medal', name: 'hundred_items', description: 'hundred_items_desc', condition: totalItems >= 100, unlockedAt: totalItems >= 100 ? nthItemDate(100) : undefined },
    { id: 'five_hundred', icon: 'trophy', name: 'five_hundred', description: 'five_hundred_desc', condition: totalItems >= 500, unlockedAt: totalItems >= 500 ? nthItemDate(500) : undefined },
    { id: 'lightning', icon: 'zap', name: 'lightning', description: 'lightning_desc', condition: maxDailyOps >= 10, unlockedAt: undefined },
    { id: 'ai_pioneer', icon: 'bot', name: 'ai_pioneer', description: 'ai_pioneer_desc', condition: hasAiUsage, unlockedAt: hasAiUsage ? firstAiDate : undefined },
    { id: 'perfectionist', icon: 'sparkles', name: 'perfectionist', description: 'perfectionist_desc', condition: completionRate === 100 && totalItems > 0, unlockedAt: completionRate === 100 && totalItems > 0 ? firstCompletedDate : undefined },
    { id: 'episode_master', icon: 'clapperboard', name: 'episode_master', description: 'episode_master_desc', condition: totalEpisodesDone >= 500, unlockedAt: undefined },
    { id: 'scheduler', icon: 'calendar-check', name: 'scheduler', description: 'scheduler_desc', condition: hasSchedule, unlockedAt: hasSchedule ? firstScheduleDate : undefined },
    { id: 'automator', icon: 'settings', name: 'automator', description: 'automator_desc', condition: automatedItems >= 5, unlockedAt: undefined },
    { id: 'veteran', icon: 'mountain', name: 'veteran', description: 'veteran_desc', condition: daysSinceStart >= 30, unlockedAt: veteranDate },
    { id: 'long_runner', icon: 'footprints', name: 'long_runner', description: 'long_runner_desc', condition: daysSinceStart >= 180, unlockedAt: longRunnerDate },
    { id: 'thousand_episodes', icon: 'film', name: 'thousand_episodes', description: 'thousand_episodes_desc', condition: totalEpisodesDone >= 1000, unlockedAt: undefined },
    { id: 'all_categories', icon: 'palette', name: 'all_categories', description: 'all_categories_desc', condition: totalCategories >= 5, unlockedAt: undefined },
  ]

  return allAchievements.map(a => ({
    id: a.id,
    icon: a.icon,
    name: a.name,
    description: a.description,
    unlocked: a.condition,
    unlockedAt: a.unlockedAt,
  }))
}

function getMonthlyComparison(db: any): Array<{ month: string; newItems: number; completedItems: number }> {
  const newRows = db.prepare(`
    SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as newItems
    FROM items WHERE deletedAt IS NULL AND createdAt IS NOT NULL AND date(createdAt) >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', createdAt) ORDER BY month ASC
  `).all() as Array<{ month: string; newItems: number }>

  const completedRows = db.prepare(`
    SELECT strftime('%Y-%m', updatedAt) as month, COUNT(*) as completedItems
    FROM items WHERE deletedAt IS NULL AND completed = 1 AND updatedAt IS NOT NULL AND date(updatedAt) >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', updatedAt) ORDER BY month ASC
  `).all() as Array<{ month: string; completedItems: number }>

  const completedMap = new Map(completedRows.map(r => [r.month, r.completedItems]))
  const allMonths = new Set([...newRows.map(r => r.month), ...completedRows.map(r => r.month)])

  return Array.from(allMonths).sort().map(month => ({
    month,
    newItems: newRows.find(r => r.month === month)?.newItems || 0,
    completedItems: completedMap.get(month) || 0,
  }))
}

function getSmartSuggestions(db: any): Array<{ type: string; message: string; priority: number }> {
  const suggestions: Array<{ type: string; message: string; priority: number }> = []

  const totalItems = (db.prepare('SELECT COUNT(*) as c FROM items WHERE deletedAt IS NULL').get() as { c: number }).c
  if (totalItems === 0) {
    suggestions.push({ type: 'info', message: '暂无词条数据，请先添加需要维护的词条', priority: 10 })
    return suggestions
  }

  const completedItems = (db.prepare('SELECT COUNT(*) as c FROM items WHERE deletedAt IS NULL AND completed = 1').get() as { c: number }).c
  const itemsWithoutCategory = (db.prepare('SELECT COUNT(*) as c FROM items WHERE deletedAt IS NULL AND category IS NULL').get() as { c: number }).c
  const failedTasks = (db.prepare("SELECT COUNT(*) as c FROM schedule_logs WHERE status = 'failed' AND date(startAt) >= date('now', '-7 days')").get() as { c: number }).c

  const inProgressItems = db.prepare(`
    SELECT i.id FROM items i
    LEFT JOIN seasons s ON i.id = s.itemId
    WHERE i.deletedAt IS NULL AND i.completed = 0 AND s.currentEpisode IS NOT NULL AND s.currentEpisode > 0
    LIMIT 1
  `).get()
  const hasProgress = !!inProgressItems

  if (failedTasks > 0) {
    suggestions.push({ type: 'warning', message: `近7天有 ${failedTasks} 个定时任务执行失败，请检查配置`, priority: 1 })
  }
  if (itemsWithoutCategory > 0) {
    suggestions.push({ type: 'tip', message: `${itemsWithoutCategory} 个词条未设置分类，建议补充分类信息`, priority: 2 })
  }
  if (!hasProgress && totalItems > 0) {
    suggestions.push({ type: 'tip', message: '还没有开始更新维护进度，点击词条即可更新当前集数', priority: 3 })
  }

  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  if (completionRate >= 90) {
    suggestions.push({ type: 'success', message: `维护完成率已达 ${completionRate}%，继续保持！`, priority: 5 })
  }

  return suggestions
}

function getStats(db: any) {
  const totalItems = (db.prepare('SELECT COUNT(*) as c FROM items WHERE deletedAt IS NULL').get() as { c: number }).c
  const completedItems = (db.prepare('SELECT COUNT(*) as c FROM items WHERE deletedAt IS NULL AND completed = 1').get() as { c: number }).c
  const inProgressItems = (db.prepare('SELECT COUNT(*) as c FROM items WHERE deletedAt IS NULL AND completed = 0').get() as { c: number }).c
  const today = new Date().toISOString().split('T')[0]
  const todayUpdatedItems = (db.prepare('SELECT COUNT(*) as c FROM items WHERE deletedAt IS NULL AND date(updatedAt) = ?').get(today) as { c: number }).c
  const enabledScheduleTasks = (db.prepare('SELECT COUNT(*) as c FROM schedule_tasks WHERE enabled = 1').get() as { c: number }).c

  return {
    totalItems,
    completedItems,
    inProgressItems,
    todayUpdatedItems,
    enabledScheduleTasks,
    completionRate: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
  }
}

function getWeekdayDistribution(db: any): Array<{ weekday: number; count: number }> {
  return db.prepare(`
    SELECT weekday, COUNT(*) as count
    FROM items WHERE deletedAt IS NULL AND weekday IS NOT NULL
    GROUP BY weekday ORDER BY weekday
  `).all() as Array<{ weekday: number; count: number }>
}

function getCompletionProgress(db: any): Array<{
  id: string; title: string; category: string | null; posterUrl: string | null
  totalEpisodes: number; completedEpisodes: number; progress: number
}> {
  const items = db.prepare(`
    SELECT i.id, i.title, i.category, i.posterUrl, i.totalEpisodes,
           COALESCE(s.total_eps, 0) as season_total_eps,
           COALESCE(s.completed_eps, 0) as season_completed_eps
    FROM items i
    LEFT JOIN (
      SELECT itemId, SUM(totalEpisodes) as total_eps, SUM(COALESCE(currentEpisode, 0)) as completed_eps
      FROM seasons GROUP BY itemId
    ) s ON i.id = s.itemId
    WHERE i.deletedAt IS NULL AND i.completed = 0
    ORDER BY i.updatedAt DESC LIMIT 20
  `).all() as Array<{
    id: string; title: string; category: string | null; posterUrl: string | null
    totalEpisodes: number; season_total_eps: number; season_completed_eps: number
  }>
  return items.map(item => {
    const total = item.season_total_eps || item.totalEpisodes || 0
    const completed = item.season_completed_eps || 0
    return { id: item.id, title: item.title, category: item.category, posterUrl: item.posterUrl, totalEpisodes: total, completedEpisodes: completed, progress: total > 0 ? Math.round((completed / total) * 100) : 0 }
  })
}

function getRecentUpdatedItems(db: any): Array<{
  id: string; title: string; category: string | null; posterUrl: string | null; updatedAt: string; completed: number
}> {
  return db.prepare(`
    SELECT id, title, category, posterUrl, updatedAt, completed
    FROM items WHERE deletedAt IS NULL ORDER BY updatedAt DESC LIMIT 10
  `).all() as Array<{
    id: string; title: string; category: string | null; posterUrl: string | null; updatedAt: string; completed: number
  }>
}
