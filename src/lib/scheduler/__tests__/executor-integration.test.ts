import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mergeMultiPlatformCSVs, type PlatformCSVResult } from '@/lib/scheduler/csv-cleaner'
import { scheduleTaskToRow, scheduleTaskRowToScheduleTask, type ScheduleTask, type ScheduleTaskRow } from '@/types/schedule'
import type { FieldCleanup, PlatformSourceConfig } from '@/types/schedule'

describe('多平台定时任务完整测试', () => {
  describe('类型序列化/反序列化测试', () => {
    it('platformConfigs 序列化和反序列化往返', () => {
      const platformConfigs: PlatformSourceConfig[] = [
        {
          url: 'https://mgtv.com/123.html',
          enabled: true,
          keepFields: { name: true, air_date: false, runtime: true, overview: true, backdrop: false },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          enabled: false,
          keepFields: { name: false, air_date: true, runtime: false, overview: true, backdrop: true },
        },
      ]

      const task: ScheduleTask = {
        id: 'test-id',
        itemId: 'item-1',
        cron: '0 2 * * *',
        enabled: true,
        headless: true,
        incremental: true,
        autoImport: false,
        tmdbSeason: 1,
        tmdbLanguage: 'zh-CN',
        tmdbAutoResponse: 'w',
        fieldCleanup: { name: false, air_date: false, runtime: false, overview: false, backdrop: false },
        checkMetadataCompleteness: false,
        platformUrl: 'https://mgtv.com/123.html',
        platformConfigs,
        lastRunAt: null,
        nextRunAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const row = scheduleTaskToRow(task)
      expect(row.platformConfigs).toBe(JSON.stringify(platformConfigs))

      const restored = scheduleTaskRowToScheduleTask(row)
      expect(restored.platformConfigs).toEqual(platformConfigs)
      expect(restored.platformConfigs?.length).toBe(2)
      expect(restored.platformConfigs?.[0].url).toBe('https://mgtv.com/123.html')
      expect(restored.platformConfigs?.[0].keepFields.name).toBe(true)
      expect(restored.platformConfigs?.[1].enabled).toBe(false)
    })

    it('platformConfigs 为 undefined 时序列化为 null', () => {
      const task: ScheduleTask = {
        id: 'test-id',
        itemId: 'item-1',
        cron: '0 2 * * *',
        enabled: true,
        headless: true,
        incremental: true,
        autoImport: false,
        tmdbSeason: 1,
        tmdbLanguage: 'zh-CN',
        tmdbAutoResponse: 'w',
        fieldCleanup: { name: false, air_date: false, runtime: false, overview: false, backdrop: false },
        checkMetadataCompleteness: false,
        lastRunAt: null,
        nextRunAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const row = scheduleTaskToRow(task)
      expect(row.platformConfigs).toBeNull()
    })

    it('platformConfigs 为空数组时序列化为 "[]"', () => {
      const task: ScheduleTask = {
        id: 'test-id',
        itemId: 'item-1',
        cron: '0 2 * * *',
        enabled: true,
        headless: true,
        incremental: true,
        autoImport: false,
        tmdbSeason: 1,
        tmdbLanguage: 'zh-CN',
        tmdbAutoResponse: 'w',
        fieldCleanup: { name: false, air_date: false, runtime: false, overview: false, backdrop: false },
        checkMetadataCompleteness: false,
        platformConfigs: [],
        lastRunAt: null,
        nextRunAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const row = scheduleTaskToRow(task)
      expect(row.platformConfigs).toBe('[]')

      const restored = scheduleTaskRowToScheduleTask(row)
      expect(restored.platformConfigs).toEqual([])
    })

    it('platformConfigs 为 null 时反序列化为 undefined', () => {
      const row: ScheduleTaskRow = {
        id: 'test-id',
        itemId: 'item-1',
        cron: '0 2 * * *',
        enabled: 1,
        headless: 1,
        incremental: 1,
        autoImport: 0,
        tmdbSeason: 1,
        tmdbLanguage: 'zh-CN',
        tmdbAutoResponse: 'w',
        fieldCleanup: '{}',
        checkMetadataCompleteness: 0,
        platformUrl: null,
        platformConfigs: null,
        lastRunAt: null,
        nextRunAt: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const restored = scheduleTaskRowToScheduleTask(row)
      expect(restored.platformConfigs).toBeUndefined()
    })
  })
  describe('mergeMultiPlatformCSVs 场景测试', () => {
    const csvHeader = 'episode_number,name,air_date,runtime,overview,backdrop'

    it('场景1：单平台模式 - 只有一个CSV', () => {
      const csv = `${csvHeader}
1,第1集,2024-01-01,45,剧情简介1,http://img1.jpg
2,第2集,2024-01-08,45,剧情简介2,http://img2.jpg`

      const results: PlatformCSVResult[] = [{
        url: 'https://mgtv.com/123.html',
        csvContent: csv,
        keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
      }]

      const merged = mergeMultiPlatformCSVs(results)
      expect(merged).toBe(csv)
      expect(merged.split('\n').length).toBe(3) // header + 2 rows
    })

    it('场景2：多平台模式 - 主源有数据，副源填充空值', () => {
      const primaryCSV = `${csvHeader}
1,第1集,2024-01-01,45,,http://img1.jpg
2,,2024-01-08,45,剧情简介2,`
      const secondaryCSV = `${csvHeader}
1,Episode 1,2024-01-01,40,Overview from B,http://img_b1.jpg
2,Episode 2,2024-01-08,40,Overview from B,http://img_b2.jpg`

      const results: PlatformCSVResult[] = [
        {
          url: 'https://mgtv.com/123.html',
          csvContent: primaryCSV,
          keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          csvContent: secondaryCSV,
          keptFields: { name: false, air_date: false, runtime: false, overview: true, backdrop: true },
        },
      ]

      const merged = mergeMultiPlatformCSVs(results)
      const lines = merged.split('\n')

      // 第1集：name保留主源（第1集），overview主源为空应从副源填充
      expect(lines[1]).toContain('第1集')
      expect(lines[1]).toContain('Overview from B')

      // 第2集：name主源为空但副源未启用name，应保持空
      expect(lines[2].split(',')[1]).toBe('')
      // 第2集：overview主源有值，应保留主源
      expect(lines[2]).toContain('剧情简介2')
    })

    it('场景3：三平台模式 - 按优先级填充', () => {
      const csv1 = `${csvHeader}
1,第1集,2024-01-01,45,,`
      const csv2 = `${csvHeader}
1,Episode 1,2024-01-01,40,,http://img2.jpg`
      const csv3 = `${csvHeader}
1,エピソード1,2024-01-01,50,概要3,http://img3.jpg`

      const results: PlatformCSVResult[] = [
        {
          url: 'https://mgtv.com/123.html',
          csvContent: csv1,
          keptFields: { name: true, air_date: true, runtime: true, overview: false, backdrop: false },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          csvContent: csv2,
          keptFields: { name: false, air_date: false, runtime: false, overview: false, backdrop: true },
        },
        {
          url: 'https://iqiyi.com/789.html',
          csvContent: csv3,
          keptFields: { name: false, air_date: false, runtime: false, overview: true, backdrop: false },
        },
      ]

      const merged = mergeMultiPlatformCSVs(results)
      const lines = merged.split('\n')

      // name从主源（第1集）
      expect(lines[1]).toContain('第1集')
      // backdrop从第2个平台
      expect(lines[1]).toContain('http://img2.jpg')
      // overview从第3个平台
      expect(lines[1]).toContain('概要3')
    })

    it('场景4：所有平台抓取失败 - 返回空', () => {
      const results: PlatformCSVResult[] = []
      const merged = mergeMultiPlatformCSVs(results)
      expect(merged).toBe('')
    })

    it('场景5：集数对齐 - 副源有更多集数', () => {
      const primaryCSV = `${csvHeader}
1,第1集,2024-01-01,45,简介1,`
      const secondaryCSV = `${csvHeader}
1,Episode 1,2024-01-01,40,Overview1,http://img.jpg
2,Episode 2,2024-01-08,40,Overview2,http://img2.jpg
3,Episode 3,2024-01-15,40,Overview3,http://img3.jpg`

      const results: PlatformCSVResult[] = [
        {
          url: 'https://mgtv.com/123.html',
          csvContent: primaryCSV,
          keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          csvContent: secondaryCSV,
          keptFields: { name: false, air_date: false, runtime: false, overview: true, backdrop: true },
        },
      ]

      const merged = mergeMultiPlatformCSVs(results)
      const lines = merged.split('\n')

      // 主源只有1集，副源有3集，合并后应该只有1集（以主源为基准）
      expect(lines.length).toBe(2) // header + 1 row
    })

    it('场景6：字段保留配置 - 只保留name和overview', () => {
      const primaryCSV = `${csvHeader}
1,第1集,2024-01-01,45,简介1,http://primary.jpg`
      const secondaryCSV = `${csvHeader}
1,Episode 1,2024-01-01,40,Overview1,http://secondary.jpg`

      const results: PlatformCSVResult[] = [
        {
          url: 'https://mgtv.com/123.html',
          csvContent: primaryCSV,
          keptFields: { name: true, air_date: false, runtime: false, overview: true, backdrop: false },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          csvContent: secondaryCSV,
          keptFields: { name: false, air_date: false, runtime: false, overview: false, backdrop: true },
        },
      ]

      const merged = mergeMultiPlatformCSVs(results)
      const lines = merged.split('\n')
      const fields = lines[1].split(',')

      // name: 主源保留 → 第1集
      expect(fields[1]).toBe('第1集')
      // air_date: 两个平台都不保留 → 空
      expect(fields[2]).toBe('')
      // overview: 主源保留 → 简介1
      expect(fields[4]).toBe('简介1')
      // backdrop: 副源保留 → http://secondary.jpg
      expect(fields[5]).toBe('http://secondary.jpg')
    })
  })

  describe('PlatformSourceConfig 配置测试', () => {
    it('配置1：单平台 - 所有字段保留', () => {
      const config: PlatformSourceConfig = {
        url: 'https://mgtv.com/123.html',
        enabled: true,
        keepFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
      }

      expect(config.enabled).toBe(true)
      expect(Object.values(config.keepFields).every(v => v === true)).toBe(true)
    })

    it('配置2：多平台 - 只保留部分字段', () => {
      const configs: PlatformSourceConfig[] = [
        {
          url: 'https://mgtv.com/123.html',
          enabled: true,
          keepFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          enabled: true,
          keepFields: { name: false, air_date: false, runtime: false, overview: true, backdrop: false },
        },
      ]

      const enabledCount = configs.filter(c => c.enabled).length
      expect(enabledCount).toBe(2)

      // 第2个平台只保留overview
      expect(configs[1].keepFields.overview).toBe(true)
      expect(configs[1].keepFields.name).toBe(false)
    })

    it('配置3：禁用的平台不参与合并', () => {
      const configs: PlatformSourceConfig[] = [
        {
          url: 'https://mgtv.com/123.html',
          enabled: true,
          keepFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          enabled: false,
          keepFields: { name: false, air_date: false, runtime: false, overview: true, backdrop: false },
        },
      ]

      const enabledConfigs = configs.filter(c => c.enabled)
      expect(enabledConfigs.length).toBe(1)
      expect(enabledConfigs[0].url).toBe('https://mgtv.com/123.html')
    })
  })

  describe('CSV字段合并逻辑测试', () => {
    it('空值填充：主源空，副源有值', () => {
      const csv1 = `episode_number,name,overview
1,第1集,`
      const csv2 = `episode_number,name,overview
1,Episode 1,Overview from B`

      const results: PlatformCSVResult[] = [
        { url: 'a', csvContent: csv1, keptFields: { name: true, air_date: false, runtime: false, overview: true, backdrop: false } },
        { url: 'b', csvContent: csv2, keptFields: { name: false, air_date: false, runtime: false, overview: true, backdrop: false } },
      ]

      const merged = mergeMultiPlatformCSVs(results)
      expect(merged).toContain('Overview from B')
    })

    it('非空值保留：主源有值，不从副源覆盖', () => {
      const csv1 = `episode_number,name,overview
1,第1集,主源简介`
      const csv2 = `episode_number,name,overview
1,Episode 1,副源简介`

      const results: PlatformCSVResult[] = [
        { url: 'a', csvContent: csv1, keptFields: { name: true, air_date: false, runtime: false, overview: true, backdrop: false } },
        { url: 'b', csvContent: csv2, keptFields: { name: false, air_date: false, runtime: false, overview: true, backdrop: false } },
      ]

      const merged = mergeMultiPlatformCSVs(results)
      expect(merged).toContain('主源简介')
      expect(merged).not.toContain('副源简介')
    })

    it('空白字符串视为空值', () => {
      const csv1 = `episode_number,name,overview
1,第1集,   `
      const csv2 = `episode_number,name,overview
1,Episode 1,Overview from B`

      const results: PlatformCSVResult[] = [
        { url: 'a', csvContent: csv1, keptFields: { name: true, air_date: false, runtime: false, overview: true, backdrop: false } },
        { url: 'b', csvContent: csv2, keptFields: { name: false, air_date: false, runtime: false, overview: true, backdrop: false } },
      ]

      const merged = mergeMultiPlatformCSVs(results)
      // 空白字符串应被副源填充
      expect(merged).toContain('Overview from B')
    })
  })
})
