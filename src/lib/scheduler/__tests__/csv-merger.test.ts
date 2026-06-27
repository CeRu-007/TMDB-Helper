import { describe, it, expect } from 'vitest'
import { mergeMultiPlatformCSVs, PlatformCSVResult } from '@/lib/scheduler/csv-cleaner'

describe('mergeMultiPlatformCSVs', () => {
  const baseCSV = `episode_number,name,air_date,overview
1,Episode 1,2024-01-01,Overview from platform A
2,Episode 2,2024-01-08,Overview from platform A
3,,2024-01-15,`

  const otherCSV = `episode_number,name,air_date,overview
1,Episode 1 Title,2024-01-01,Overview from platform B
2,Episode 2 Title,2024-01-08,Overview from platform B
3,Episode 3 Title,2024-01-15,Overview from platform B`

  it('should return empty string for empty results', () => {
    expect(mergeMultiPlatformCSVs([])).toBe('')
  })

  it('should return single CSV unchanged when only one result', () => {
    const results: PlatformCSVResult[] = [
      {
        url: 'https://platform-a.com',
        csvContent: baseCSV,
        keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
      },
    ]

    const merged = mergeMultiPlatformCSVs(results)
    expect(merged).toBe(baseCSV)
  })

  it('should merge CSVs filling empty fields from other platforms', () => {
    const results: PlatformCSVResult[] = [
      {
        url: 'https://platform-a.com',
        csvContent: baseCSV,
        keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
      },
      {
        url: 'https://platform-b.com',
        csvContent: otherCSV,
        keptFields: { name: false, air_date: false, runtime: false, overview: true, backdrop: false },
      },
    ]

    const merged = mergeMultiPlatformCSVs(results)
    const lines = merged.split('\n')

    // Episode 3 should have overview from platform B
    expect(lines[3]).toContain('Overview from platform B')
    // Episode 3 name should remain empty (not kept from platform B)
    const fields = lines[3].split(',')
    expect(fields[1]).toBe('')
  })

  it('should keep fields from base platform when enabled', () => {
    const results: PlatformCSVResult[] = [
      {
        url: 'https://platform-a.com',
        csvContent: baseCSV,
        keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
      },
      {
        url: 'https://platform-b.com',
        csvContent: otherCSV,
        keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
      },
    ]

    const merged = mergeMultiPlatformCSVs(results)
    const lines = merged.split('\n')

    // Episode 1 should keep base platform values
    expect(lines[1]).toContain('Episode 1')
    expect(lines[1]).toContain('2024-01-01')
  })

  it('should handle multiple platforms', () => {
    const thirdCSV = `episode_number,name,air_date,overview
1,Episode 1 Third,2024-01-01,Overview from platform C
2,Episode 2 Third,2024-01-08,Overview from platform C
3,Episode 3 Third,2024-01-15,Overview from platform C`

    const results: PlatformCSVResult[] = [
      {
        url: 'https://platform-a.com',
        csvContent: baseCSV,
        keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
      },
      {
        url: 'https://platform-b.com',
        csvContent: otherCSV,
        keptFields: { name: false, air_date: false, runtime: false, overview: false, backdrop: false },
      },
      {
        url: 'https://platform-c.com',
        csvContent: thirdCSV,
        keptFields: { name: false, air_date: false, runtime: false, overview: true, backdrop: false },
      },
    ]

    const merged = mergeMultiPlatformCSVs(results)
    const lines = merged.split('\n')

    // Episode 3 should have overview from platform C (last one with enabled field)
    expect(lines[3]).toContain('Overview from platform C')
  })
})
