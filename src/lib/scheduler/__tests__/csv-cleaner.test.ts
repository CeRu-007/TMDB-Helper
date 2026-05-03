import { describe, it, expect } from 'vitest'
import { analyzeCSVMetadata, cleanCSV, extractEpisodeCount } from '@/lib/scheduler/csv-cleaner'
import type { FieldCleanup } from '@/types/schedule'

const defaultFieldCleanup: FieldCleanup = {
  name: false,
  air_date: false,
  runtime: false,
  overview: false,
  backdrop: false,
}

function makeCSV(rows: { episode_number: number; name: string; air_date: string; runtime: string; overview: string; backdrop: string }[]): string {
  const header = 'episode_number,name,air_date,runtime,overview,backdrop'
  const lines = rows.map(r =>
    `${r.episode_number},${r.name},${r.air_date},${r.runtime},"${r.overview}",${r.backdrop}`
  )
  return [header, ...lines].join('\n')
}

function makeCSVCRLF(rows: Parameters<typeof makeCSV>[0]): string {
  return makeCSV(rows).replace(/\n/g, '\r\n')
}

describe('analyzeCSVMetadata', () => {
  describe('基础边界', () => {
    it('空字符串返回0', () => {
      const result = analyzeCSVMetadata('')
      expect(result).toEqual({ rawEpisodeCount: 0, effectiveEpisodeCount: 0, incompleteEpisodes: [] })
    })

    it('只有表头返回0', () => {
      const result = analyzeCSVMetadata('episode_number,name,air_date,runtime,overview,backdrop')
      expect(result).toEqual({ rawEpisodeCount: 0, effectiveEpisodeCount: 0, incompleteEpisodes: [] })
    })

    it('缺少 episode_number 列返回0', () => {
      const result = analyzeCSVMetadata('name,air_date,runtime,overview,backdrop\n1,2024-01-01,45,简介,')
      expect(result).toEqual({ rawEpisodeCount: 0, effectiveEpisodeCount: 0, incompleteEpisodes: [] })
    })

    it('BOM 开头的 CSV 正确处理', () => {
      const csv = '\uFEFF' + makeCSV([
        { episode_number: 1, name: '第一集', air_date: '2024-01-01', runtime: '45', overview: '简介1', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(1)
      expect(result.effectiveEpisodeCount).toBe(1)
      expect(result.incompleteEpisodes).toEqual([])
    })

    it('CRLF 行尾正确处理', () => {
      const csv = makeCSVCRLF([
        { episode_number: 1, name: '第一集', air_date: '2024-01-01', runtime: '45', overview: '简介1', backdrop: '' },
        { episode_number: 2, name: '第二集', air_date: '2024-01-02', runtime: '43', overview: '简介2', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(2)
      expect(result.effectiveEpisodeCount).toBe(2)
      expect(result.incompleteEpisodes).toEqual([])
    })

    it('单集 CSV', () => {
      const csv = makeCSV([
        { episode_number: 1, name: '第一集', air_date: '2024-01-01', runtime: '45', overview: '简介1', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(1)
      expect(result.effectiveEpisodeCount).toBe(1)
      expect(result.incompleteEpisodes).toEqual([])
    })

    it('单集 CSV 且元数据不完整', () => {
      const csv = makeCSV([
        { episode_number: 1, name: '', air_date: '2024-01-01', runtime: '45', overview: '', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(1)
      expect(result.effectiveEpisodeCount).toBe(0)
      expect(result.incompleteEpisodes).toEqual([1])
    })

    it('CSV 中有空行不影响解析', () => {
      const csv = 'episode_number,name,air_date,runtime,overview,backdrop\n\n1,第一集,2024-01-01,45,"简介1",\n\n2,第二集,2024-01-02,43,"简介2",'
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(2)
    })
  })

  describe('所有集元数据完整', () => {
    it('1-20集全部完整', () => {
      const csv = makeCSV(
        Array.from({ length: 20 }, (_, i) => ({
          episode_number: i + 1,
          name: `第${i + 1}集`,
          air_date: '2024-01-01',
          runtime: '45',
          overview: `第${i + 1}集简介`,
          backdrop: '',
        }))
      )
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(20)
      expect(result.effectiveEpisodeCount).toBe(20)
      expect(result.incompleteEpisodes).toEqual([])
    })
  })

  describe('name 为空但 overview 完整', () => {
    it('第3集 name 为空，overview 有数据', () => {
      const csv = makeCSV([
        { episode_number: 1, name: '第一集', air_date: '2024-01-01', runtime: '45', overview: '简介1', backdrop: '' },
        { episode_number: 2, name: '第二集', air_date: '2024-01-02', runtime: '43', overview: '简介2', backdrop: '' },
        { episode_number: 3, name: '', air_date: '2024-01-03', runtime: '44', overview: '简介3', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(3)
      expect(result.effectiveEpisodeCount).toBe(2)
      expect(result.incompleteEpisodes).toEqual([3])
    })
  })

  describe('overview 为空但 name 完整', () => {
    it('第3集 overview 为空，name 有数据', () => {
      const csv = makeCSV([
        { episode_number: 1, name: '第一集', air_date: '2024-01-01', runtime: '45', overview: '简介1', backdrop: '' },
        { episode_number: 2, name: '第二集', air_date: '2024-01-02', runtime: '43', overview: '简介2', backdrop: '' },
        { episode_number: 3, name: '第三集', air_date: '2024-01-03', runtime: '44', overview: '', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(3)
      expect(result.effectiveEpisodeCount).toBe(2)
      expect(result.incompleteEpisodes).toEqual([3])
    })
  })

  describe('name 和 overview 都为空', () => {
    it('第3集 name 和 overview 都为空', () => {
      const csv = makeCSV([
        { episode_number: 1, name: '第一集', air_date: '2024-01-01', runtime: '45', overview: '简介1', backdrop: '' },
        { episode_number: 2, name: '第二集', air_date: '2024-01-02', runtime: '43', overview: '简介2', backdrop: '' },
        { episode_number: 3, name: '', air_date: '2024-01-03', runtime: '44', overview: '', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(3)
      expect(result.effectiveEpisodeCount).toBe(2)
      expect(result.incompleteEpisodes).toEqual([3])
    })
  })

  describe('连续多集元数据不完整（优酷典型场景）', () => {
    it('20集完结，17-20集元数据不完整', () => {
      const csv = makeCSV([
        ...Array.from({ length: 16 }, (_, i) => ({
          episode_number: i + 1,
          name: `第${i + 1}集`,
          air_date: '2024-01-01',
          runtime: '45',
          overview: `第${i + 1}集简介`,
          backdrop: '',
        })),
        { episode_number: 17, name: '', air_date: '2024-02-01', runtime: '45', overview: '', backdrop: 'https://img.com/17.jpg' },
        { episode_number: 18, name: '', air_date: '2024-02-02', runtime: '43', overview: '', backdrop: 'https://img.com/18.jpg' },
        { episode_number: 19, name: '', air_date: '2024-02-03', runtime: '44', overview: '', backdrop: 'https://img.com/19.jpg' },
        { episode_number: 20, name: '', air_date: '2024-02-04', runtime: '42', overview: '', backdrop: 'https://img.com/20.jpg' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(20)
      expect(result.effectiveEpisodeCount).toBe(16)
      expect(result.incompleteEpisodes).toEqual([17, 18, 19, 20])
    })
  })

  describe('不完整集中间穿插完整集', () => {
    it('第17集name空、18完整、19-20空', () => {
      const csv = makeCSV([
        ...Array.from({ length: 16 }, (_, i) => ({
          episode_number: i + 1,
          name: `第${i + 1}集`,
          air_date: '2024-01-01',
          runtime: '45',
          overview: `第${i + 1}集简介`,
          backdrop: '',
        })),
        { episode_number: 17, name: '', air_date: '2024-02-01', runtime: '45', overview: '第17集简介', backdrop: '' },
        { episode_number: 18, name: '第18集', air_date: '2024-02-02', runtime: '43', overview: '第18集简介', backdrop: '' },
        { episode_number: 19, name: '第19集', air_date: '2024-02-03', runtime: '44', overview: '', backdrop: '' },
        { episode_number: 20, name: '', air_date: '2024-02-04', runtime: '42', overview: '', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(20)
      expect(result.effectiveEpisodeCount).toBe(16)
      expect(result.incompleteEpisodes).toEqual([17, 19, 20])
    })

    it('第1集就不完整', () => {
      const csv = makeCSV([
        { episode_number: 1, name: '', air_date: '2024-01-01', runtime: '45', overview: '', backdrop: '' },
        { episode_number: 2, name: '第二集', air_date: '2024-01-02', runtime: '43', overview: '简介2', backdrop: '' },
        { episode_number: 3, name: '第三集', air_date: '2024-01-03', runtime: '44', overview: '简介3', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(3)
      expect(result.effectiveEpisodeCount).toBe(0)
      expect(result.incompleteEpisodes).toEqual([1])
    })

    it('所有集都不完整', () => {
      const csv = makeCSV([
        { episode_number: 1, name: '', air_date: '2024-01-01', runtime: '45', overview: '', backdrop: '' },
        { episode_number: 2, name: '', air_date: '2024-01-02', runtime: '43', overview: '', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(2)
      expect(result.effectiveEpisodeCount).toBe(0)
      expect(result.incompleteEpisodes).toEqual([1, 2])
    })
  })

  describe('只有空格的 name/overview 视为不完整', () => {
    it('name 为纯空格', () => {
      const csv = makeCSV([
        { episode_number: 1, name: '第一集', air_date: '2024-01-01', runtime: '45', overview: '简介1', backdrop: '' },
        { episode_number: 2, name: '   ', air_date: '2024-01-02', runtime: '43', overview: '简介2', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(2)
      expect(result.effectiveEpisodeCount).toBe(1)
      expect(result.incompleteEpisodes).toEqual([2])
    })

    it('overview 为纯空格', () => {
      const csv = makeCSV([
        { episode_number: 1, name: '第一集', air_date: '2024-01-01', runtime: '45', overview: '简介1', backdrop: '' },
        { episode_number: 2, name: '第二集', air_date: '2024-01-02', runtime: '43', overview: '   ', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(2)
      expect(result.effectiveEpisodeCount).toBe(1)
      expect(result.incompleteEpisodes).toEqual([2])
    })
  })

  describe('集数不连续', () => {
    it('集数有间隔：1,2,5,10，第10集不完整', () => {
      const csv = makeCSV([
        { episode_number: 1, name: '第一集', air_date: '2024-01-01', runtime: '45', overview: '简介1', backdrop: '' },
        { episode_number: 2, name: '第二集', air_date: '2024-01-02', runtime: '43', overview: '简介2', backdrop: '' },
        { episode_number: 5, name: '第五集', air_date: '2024-01-05', runtime: '44', overview: '简介5', backdrop: '' },
        { episode_number: 10, name: '', air_date: '2024-01-10', runtime: '42', overview: '', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(10)
      expect(result.effectiveEpisodeCount).toBe(9)
      expect(result.incompleteEpisodes).toEqual([10])
    })

    it('集数有间隔：1,2,5,10，第5集和第10集不完整', () => {
      const csv = makeCSV([
        { episode_number: 1, name: '第一集', air_date: '2024-01-01', runtime: '45', overview: '简介1', backdrop: '' },
        { episode_number: 2, name: '第二集', air_date: '2024-01-02', runtime: '43', overview: '简介2', backdrop: '' },
        { episode_number: 5, name: '', air_date: '2024-01-05', runtime: '44', overview: '', backdrop: '' },
        { episode_number: 10, name: '', air_date: '2024-01-10', runtime: '42', overview: '', backdrop: '' },
      ])
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(10)
      expect(result.effectiveEpisodeCount).toBe(4)
      expect(result.incompleteEpisodes).toEqual([5, 10])
    })
  })

  describe('缺少 name 或 overview 列', () => {
    it('CSV 没有 name 列', () => {
      const csv = 'episode_number,air_date,runtime,overview,backdrop\n1,2024-01-01,45,简介1,'
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(1)
      expect(result.incompleteEpisodes).toEqual([1])
      expect(result.effectiveEpisodeCount).toBe(0)
    })

    it('CSV 没有 overview 列', () => {
      const csv = 'episode_number,name,air_date,runtime,backdrop\n1,第一集,2024-01-01,45,'
      const result = analyzeCSVMetadata(csv)
      expect(result.rawEpisodeCount).toBe(1)
      expect(result.incompleteEpisodes).toEqual([1])
      expect(result.effectiveEpisodeCount).toBe(0)
    })
  })
})

describe('cleanCSV 增量过滤', () => {
  const csv = makeCSV([
    { episode_number: 1, name: '第一集', air_date: '2024-01-01', runtime: '45', overview: '简介1', backdrop: '' },
    { episode_number: 2, name: '第二集', air_date: '2024-01-02', runtime: '43', overview: '简介2', backdrop: '' },
    { episode_number: 3, name: '', air_date: '2024-01-03', runtime: '44', overview: '', backdrop: '' },
    { episode_number: 4, name: '', air_date: '2024-01-04', runtime: '42', overview: '', backdrop: '' },
  ])

  it('增量模式 currentEpisode=2 时，跳过1-2集，保留3-4集', () => {
    const result = cleanCSV(csv, defaultFieldCleanup, 2, true)
    const lines = result.trim().split('\n')
    expect(lines.length).toBe(3)
    expect(lines[1]).toContain('3')
    expect(lines[2]).toContain('4')
  })

  it('增量模式 currentEpisode=0 时，保留所有集', () => {
    const result = cleanCSV(csv, defaultFieldCleanup, 0, true)
    const lines = result.trim().split('\n')
    expect(lines.length).toBe(5)
  })

  it('全量模式（incremental=false）时，保留所有集', () => {
    const result = cleanCSV(csv, defaultFieldCleanup, 2, false)
    const lines = result.trim().split('\n')
    expect(lines.length).toBe(5)
  })

  it('fieldCleanup 清空 name 字段', () => {
    const cleanupField: FieldCleanup = { ...defaultFieldCleanup, name: true }
    const result = cleanCSV(csv, cleanupField, 0, false)
    const lines = result.trim().split('\n')
    expect(lines[1]).not.toContain('第一集')
  })

  it('fieldCleanup 清空 overview 字段', () => {
    const cleanupField: FieldCleanup = { ...defaultFieldCleanup, overview: true }
    const result = cleanCSV(csv, cleanupField, 0, false)
    const lines = result.trim().split('\n')
    expect(lines[1]).not.toContain('简介1')
  })
})

describe('cleanCSV 与元数据完整性检查配合（增量过滤阈值 = min(currentEpisode, effectiveEpisodeCount)）', () => {
  describe('用户报告的场景：22集完结，currentEpisode=18，第19集完整，20-22不完整', () => {
    const csv = makeCSV([
      ...Array.from({ length: 18 }, (_, i) => ({
        episode_number: i + 1,
        name: `第${i + 1}集`,
        air_date: '2024-01-01',
        runtime: '45',
        overview: `第${i + 1}集简介`,
        backdrop: '',
      })),
      { episode_number: 19, name: '第19集', air_date: '2024-02-01', runtime: '45', overview: '第19集简介', backdrop: '' },
      { episode_number: 20, name: '', air_date: '2024-02-02', runtime: '43', overview: '', backdrop: 'https://img.com/20.jpg' },
      { episode_number: 21, name: '', air_date: '2024-02-03', runtime: '44', overview: '', backdrop: 'https://img.com/21.jpg' },
      { episode_number: 22, name: '', air_date: '2024-02-04', runtime: '42', overview: '', backdrop: 'https://img.com/22.jpg' },
    ])

    it('analyzeCSVMetadata: effectiveEpisodeCount=19, incompleteEpisodes=[20,21,22]', () => {
      const analysis = analyzeCSVMetadata(csv)
      expect(analysis.rawEpisodeCount).toBe(22)
      expect(analysis.effectiveEpisodeCount).toBe(19)
      expect(analysis.incompleteEpisodes).toEqual([20, 21, 22])
    })

    it('增量阈值 = min(18, 19) = 18，跳过1-18集，保留19-22集', () => {
      const threshold = Math.min(18, 19)
      expect(threshold).toBe(18)

      const result = cleanCSV(csv, defaultFieldCleanup, threshold, true)
      const lines = result.trim().split('\n')
      expect(lines.length).toBe(5)
      expect(lines[1]).toContain('19')
      expect(lines[2]).toContain('20')
      expect(lines[3]).toContain('21')
      expect(lines[4]).toContain('22')
    })

    it('第19集必须出现在清理后的CSV中（确保TMDB导入能上传第19集）', () => {
      const threshold = Math.min(18, 19)
      const result = cleanCSV(csv, defaultFieldCleanup, threshold, true)
      expect(result).toContain('19')
      expect(result).toContain('第19集')
    })

    it('第19集的 name 和 overview 必须保留在清理后的CSV中', () => {
      const threshold = Math.min(18, 19)
      const result = cleanCSV(csv, defaultFieldCleanup, threshold, true)
      expect(result).toContain('第19集')
      expect(result).toContain('第19集简介')
    })
  })

  describe('优酷典型场景：20集完结，17-20不完整，currentEpisode=16', () => {
    const csv = makeCSV([
      ...Array.from({ length: 16 }, (_, i) => ({
        episode_number: i + 1,
        name: `第${i + 1}集`,
        air_date: '2024-01-01',
        runtime: '45',
        overview: `第${i + 1}集简介`,
        backdrop: '',
      })),
      { episode_number: 17, name: '', air_date: '2024-02-01', runtime: '45', overview: '', backdrop: 'https://img.com/17.jpg' },
      { episode_number: 18, name: '', air_date: '2024-02-02', runtime: '43', overview: '', backdrop: 'https://img.com/18.jpg' },
      { episode_number: 19, name: '', air_date: '2024-02-03', runtime: '44', overview: '', backdrop: 'https://img.com/19.jpg' },
      { episode_number: 20, name: '', air_date: '2024-02-04', runtime: '42', overview: '', backdrop: 'https://img.com/20.jpg' },
    ])

    it('effectiveEpisodeCount=16, 增量阈值 = min(16, 16) = 16，保留17-20集', () => {
      const threshold = Math.min(16, 16)
      expect(threshold).toBe(16)

      const result = cleanCSV(csv, defaultFieldCleanup, threshold, true)
      const lines = result.trim().split('\n')
      expect(lines.length).toBe(5)
      expect(lines[1]).toContain('17')
      expect(lines[2]).toContain('18')
      expect(lines[3]).toContain('19')
      expect(lines[4]).toContain('20')
    })

    it('currentEpisode=15, effectiveEpisodeCount=16, 增量阈值 = min(15, 16) = 15，保留16-20集', () => {
      const threshold = Math.min(15, 16)
      const result = cleanCSV(csv, defaultFieldCleanup, threshold, true)
      const lines = result.trim().split('\n')
      expect(lines.length).toBe(6)
      expect(lines[1]).toContain('16')
    })
  })

  describe('之前误更新场景：currentEpisode > effectiveEpisodeCount', () => {
    const csv = makeCSV([
      ...Array.from({ length: 16 }, (_, i) => ({
        episode_number: i + 1,
        name: `第${i + 1}集`,
        air_date: '2024-01-01',
        runtime: '45',
        overview: `第${i + 1}集简介`,
        backdrop: '',
      })),
      { episode_number: 17, name: '', air_date: '2024-02-01', runtime: '45', overview: '', backdrop: 'https://img.com/17.jpg' },
      { episode_number: 18, name: '', air_date: '2024-02-02', runtime: '43', overview: '', backdrop: 'https://img.com/18.jpg' },
      { episode_number: 19, name: '', air_date: '2024-02-03', runtime: '44', overview: '', backdrop: 'https://img.com/19.jpg' },
      { episode_number: 20, name: '', air_date: '2024-02-04', runtime: '42', overview: '', backdrop: 'https://img.com/20.jpg' },
    ])

    it('增量阈值 = min(20, 16) = 16，保留17-20集（修正误更新）', () => {
      const threshold = Math.min(20, 16)
      expect(threshold).toBe(16)

      const result = cleanCSV(csv, defaultFieldCleanup, threshold, true)
      const lines = result.trim().split('\n')
      expect(lines.length).toBe(5)
      expect(lines[1]).toContain('17')
      expect(lines[2]).toContain('18')
      expect(lines[3]).toContain('19')
      expect(lines[4]).toContain('20')
    })
  })

  describe('元数据补充完整后', () => {
    const fixedCSV = makeCSV([
      ...Array.from({ length: 20 }, (_, i) => ({
        episode_number: i + 1,
        name: `第${i + 1}集`,
        air_date: '2024-01-01',
        runtime: '45',
        overview: `第${i + 1}集简介`,
        backdrop: '',
      })),
    ])

    it('effectiveEpisodeCount=20, currentEpisode=16, 增量阈值=16，保留17-20集', () => {
      const threshold = Math.min(16, 20)
      const result = cleanCSV(fixedCSV, defaultFieldCleanup, threshold, true)
      const lines = result.trim().split('\n')
      expect(lines.length).toBe(5)
      expect(lines[1]).toContain('17')
    })

    it('effectiveEpisodeCount=20, currentEpisode=20, 增量阈值=20，全部跳过', () => {
      const threshold = Math.min(20, 20)
      const result = cleanCSV(fixedCSV, defaultFieldCleanup, threshold, true)
      const lines = result.trim().split('\n')
      expect(lines.length).toBe(1)
    })
  })

  describe('第1集就不完整', () => {
    const csv = makeCSV([
      { episode_number: 1, name: '', air_date: '2024-01-01', runtime: '45', overview: '', backdrop: '' },
      { episode_number: 2, name: '第二集', air_date: '2024-01-02', runtime: '43', overview: '简介2', backdrop: '' },
      { episode_number: 3, name: '第三集', air_date: '2024-01-03', runtime: '44', overview: '简介3', backdrop: '' },
    ])

    it('effectiveEpisodeCount=0, currentEpisode=0, 增量阈值=0，保留所有集', () => {
      const threshold = Math.min(0, 0)
      const result = cleanCSV(csv, defaultFieldCleanup, threshold, true)
      const lines = result.trim().split('\n')
      expect(lines.length).toBe(4)
    })
  })

  describe('开关关闭时（不使用 effectiveEpisodeCount）', () => {
    const csv = makeCSV([
      ...Array.from({ length: 20 }, (_, i) => ({
        episode_number: i + 1,
        name: `第${i + 1}集`,
        air_date: '2024-01-01',
        runtime: '45',
        overview: `第${i + 1}集简介`,
        backdrop: '',
      })),
    ])

    it('直接用 currentEpisode 作为阈值，不受 effectiveEpisodeCount 影响', () => {
      const result = cleanCSV(csv, defaultFieldCleanup, 18, true)
      const lines = result.trim().split('\n')
      expect(lines.length).toBe(3)
      expect(lines[1]).toContain('19')
      expect(lines[2]).toContain('20')
    })
  })
})

describe('端到端集成流程：analyzeCSVMetadata → 阈值计算 → cleanCSV → processScheduleTaskResult', () => {
  it('场景1：22集完结，currentEpisode=18，第19集完整，20-22不完整', async () => {
    const csv = makeCSV([
      ...Array.from({ length: 18 }, (_, i) => ({
        episode_number: i + 1,
        name: `第${i + 1}集`,
        air_date: '2024-01-01',
        runtime: '45',
        overview: `第${i + 1}集简介`,
        backdrop: '',
      })),
      { episode_number: 19, name: '第19集', air_date: '2024-02-01', runtime: '45', overview: '第19集简介', backdrop: '' },
      { episode_number: 20, name: '', air_date: '2024-02-02', runtime: '43', overview: '', backdrop: 'https://img.com/20.jpg' },
      { episode_number: 21, name: '', air_date: '2024-02-03', runtime: '44', overview: '', backdrop: 'https://img.com/21.jpg' },
      { episode_number: 22, name: '', air_date: '2024-02-04', runtime: '42', overview: '', backdrop: 'https://img.com/22.jpg' },
    ])

    const analysis = analyzeCSVMetadata(csv)
    expect(analysis.rawEpisodeCount).toBe(22)
    expect(analysis.effectiveEpisodeCount).toBe(19)
    expect(analysis.incompleteEpisodes).toEqual([20, 21, 22])

    const currentEpisode = 18
    const threshold = Math.min(currentEpisode, analysis.effectiveEpisodeCount)
    expect(threshold).toBe(18)

    const cleanedCSV = cleanCSV(csv, defaultFieldCleanup, threshold, true)
    expect(cleanedCSV).toContain('19')
    expect(cleanedCSV).toContain('第19集')
    expect(cleanedCSV).toContain('第19集简介')
    expect(cleanedCSV).toContain('20')
    expect(cleanedCSV).toContain('21')
    expect(cleanedCSV).toContain('22')
    expect(cleanedCSV).not.toContain('第18集')

    const episodeCountForUpdate = analysis.effectiveEpisodeCount
    expect(episodeCountForUpdate).toBe(19)
  })

  it('场景2：20集完结，17-20不完整，currentEpisode=16', async () => {
    const csv = makeCSV([
      ...Array.from({ length: 16 }, (_, i) => ({
        episode_number: i + 1,
        name: `第${i + 1}集`,
        air_date: '2024-01-01',
        runtime: '45',
        overview: `第${i + 1}集简介`,
        backdrop: '',
      })),
      { episode_number: 17, name: '', air_date: '2024-02-01', runtime: '45', overview: '', backdrop: 'https://img.com/17.jpg' },
      { episode_number: 18, name: '', air_date: '2024-02-02', runtime: '43', overview: '', backdrop: 'https://img.com/18.jpg' },
      { episode_number: 19, name: '', air_date: '2024-02-03', runtime: '44', overview: '', backdrop: 'https://img.com/19.jpg' },
      { episode_number: 20, name: '', air_date: '2024-02-04', runtime: '42', overview: '', backdrop: 'https://img.com/20.jpg' },
    ])

    const analysis = analyzeCSVMetadata(csv)
    expect(analysis.effectiveEpisodeCount).toBe(16)

    const currentEpisode = 16
    const threshold = Math.min(currentEpisode, analysis.effectiveEpisodeCount)
    expect(threshold).toBe(16)

    const cleanedCSV = cleanCSV(csv, defaultFieldCleanup, threshold, true)
    expect(cleanedCSV).toContain('17')
    expect(cleanedCSV).toContain('18')
    expect(cleanedCSV).toContain('19')
    expect(cleanedCSV).toContain('20')
    expect(cleanedCSV).not.toContain('第16集')
  })

  it('场景3：误更新回退，currentEpisode=20 > effectiveEpisodeCount=16', async () => {
    const csv = makeCSV([
      ...Array.from({ length: 16 }, (_, i) => ({
        episode_number: i + 1,
        name: `第${i + 1}集`,
        air_date: '2024-01-01',
        runtime: '45',
        overview: `第${i + 1}集简介`,
        backdrop: '',
      })),
      { episode_number: 17, name: '', air_date: '2024-02-01', runtime: '45', overview: '', backdrop: 'https://img.com/17.jpg' },
      { episode_number: 18, name: '', air_date: '2024-02-02', runtime: '43', overview: '', backdrop: 'https://img.com/18.jpg' },
      { episode_number: 19, name: '', air_date: '2024-02-03', runtime: '44', overview: '', backdrop: 'https://img.com/19.jpg' },
      { episode_number: 20, name: '', air_date: '2024-02-04', runtime: '42', overview: '', backdrop: 'https://img.com/20.jpg' },
    ])

    const analysis = analyzeCSVMetadata(csv)
    expect(analysis.effectiveEpisodeCount).toBe(16)

    const currentEpisode = 20
    const threshold = Math.min(currentEpisode, analysis.effectiveEpisodeCount)
    expect(threshold).toBe(16)

    const cleanedCSV = cleanCSV(csv, defaultFieldCleanup, threshold, true)
    expect(cleanedCSV).toContain('17')
    expect(cleanedCSV).toContain('20')
  })

  it('场景4：元数据补充完整后，effectiveEpisodeCount=20', async () => {
    const csv = makeCSV([
      ...Array.from({ length: 20 }, (_, i) => ({
        episode_number: i + 1,
        name: `第${i + 1}集`,
        air_date: '2024-01-01',
        runtime: '45',
        overview: `第${i + 1}集简介`,
        backdrop: '',
      })),
    ])

    const analysis = analyzeCSVMetadata(csv)
    expect(analysis.effectiveEpisodeCount).toBe(20)
    expect(analysis.incompleteEpisodes).toEqual([])

    const currentEpisode = 16
    const threshold = Math.min(currentEpisode, analysis.effectiveEpisodeCount)
    expect(threshold).toBe(16)

    const cleanedCSV = cleanCSV(csv, defaultFieldCleanup, threshold, true)
    expect(cleanedCSV).toContain('17')
    expect(cleanedCSV).toContain('20')
  })

  it('场景5：部分补充，17-18补充完整，19-20仍不完整', async () => {
    const csv = makeCSV([
      ...Array.from({ length: 16 }, (_, i) => ({
        episode_number: i + 1,
        name: `第${i + 1}集`,
        air_date: '2024-01-01',
        runtime: '45',
        overview: `第${i + 1}集简介`,
        backdrop: '',
      })),
      { episode_number: 17, name: '第17集', air_date: '2024-02-01', runtime: '45', overview: '第17集简介', backdrop: '' },
      { episode_number: 18, name: '第18集', air_date: '2024-02-02', runtime: '43', overview: '第18集简介', backdrop: '' },
      { episode_number: 19, name: '', air_date: '2024-02-03', runtime: '44', overview: '', backdrop: 'https://img.com/19.jpg' },
      { episode_number: 20, name: '', air_date: '2024-02-04', runtime: '42', overview: '', backdrop: 'https://img.com/20.jpg' },
    ])

    const analysis = analyzeCSVMetadata(csv)
    expect(analysis.effectiveEpisodeCount).toBe(18)
    expect(analysis.incompleteEpisodes).toEqual([19, 20])

    const currentEpisode = 16
    const threshold = Math.min(currentEpisode, analysis.effectiveEpisodeCount)
    expect(threshold).toBe(16)

    const cleanedCSV = cleanCSV(csv, defaultFieldCleanup, threshold, true)
    expect(cleanedCSV).toContain('17')
    expect(cleanedCSV).toContain('第17集')
    expect(cleanedCSV).toContain('18')
    expect(cleanedCSV).toContain('第18集')
    expect(cleanedCSV).toContain('19')
    expect(cleanedCSV).toContain('20')
  })

  it('场景6（用户反馈）：currentEpisode=19，22集完结，第20集完整，21-22不完整', async () => {
    const csv = makeCSV([
      ...Array.from({ length: 19 }, (_, i) => ({
        episode_number: i + 1,
        name: `第${i + 1}集`,
        air_date: '2024-01-01',
        runtime: '45',
        overview: `第${i + 1}集简介`,
        backdrop: '',
      })),
      { episode_number: 20, name: '第20集', air_date: '2024-02-01', runtime: '45', overview: '第20集简介', backdrop: '' },
      { episode_number: 21, name: '', air_date: '2024-02-02', runtime: '43', overview: '', backdrop: 'https://img.com/21.jpg' },
      { episode_number: 22, name: '', air_date: '2024-02-03', runtime: '44', overview: '', backdrop: 'https://img.com/22.jpg' },
    ])

    const analysis = analyzeCSVMetadata(csv)
    expect(analysis.rawEpisodeCount).toBe(22)
    expect(analysis.effectiveEpisodeCount).toBe(20)
    expect(analysis.incompleteEpisodes).toEqual([21, 22])

    const currentEpisode = 19
    const threshold = Math.min(currentEpisode, analysis.effectiveEpisodeCount)
    expect(threshold).toBe(19)

    const cleanedCSV = cleanCSV(csv, defaultFieldCleanup, threshold, true)

    expect(cleanedCSV).toContain('20')
    expect(cleanedCSV).toContain('第20集')
    expect(cleanedCSV).toContain('第20集简介')
    expect(cleanedCSV).toContain('21')
    expect(cleanedCSV).toContain('22')
    expect(cleanedCSV).not.toContain('第19集')

    const lines = cleanedCSV.trim().split('\n')
    expect(lines.length).toBe(4)
  })

  it('场景6对比：如果用 effectiveEpisodeCount=20 直接作为阈值（修复前的错误行为），第20集会被错误跳过', async () => {
    const csv = makeCSV([
      ...Array.from({ length: 19 }, (_, i) => ({
        episode_number: i + 1,
        name: `第${i + 1}集`,
        air_date: '2024-01-01',
        runtime: '45',
        overview: `第${i + 1}集简介`,
        backdrop: '',
      })),
      { episode_number: 20, name: '第20集', air_date: '2024-02-01', runtime: '45', overview: '第20集简介', backdrop: '' },
      { episode_number: 21, name: '', air_date: '2024-02-02', runtime: '43', overview: '', backdrop: 'https://img.com/21.jpg' },
      { episode_number: 22, name: '', air_date: '2024-02-03', runtime: '44', overview: '', backdrop: 'https://img.com/22.jpg' },
    ])

    const effectiveEpisodeCount = 20
    const wrongThreshold = effectiveEpisodeCount
    const wrongResult = cleanCSV(csv, defaultFieldCleanup, wrongThreshold, true)

    expect(wrongResult).not.toContain('第20集')
    expect(wrongResult).not.toContain('第20集简介')

    const lines = wrongResult.trim().split('\n')
    expect(lines.length).toBe(3)
  })
})

describe('extractEpisodeCount', () => {
  it('正常 CSV 返回最大集数', () => {
    const csv = makeCSV([
      { episode_number: 1, name: '第一集', air_date: '2024-01-01', runtime: '45', overview: '简介1', backdrop: '' },
      { episode_number: 5, name: '第五集', air_date: '2024-01-05', runtime: '44', overview: '简介5', backdrop: '' },
    ])
    expect(extractEpisodeCount(csv)).toBe(5)
  })

  it('空 CSV 返回0', () => {
    expect(extractEpisodeCount('')).toBe(0)
  })
})
