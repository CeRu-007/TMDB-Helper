import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TMDBItem } from '@/types/tmdb-item'

const mockRun = vi.fn(() => ({ changes: 1 }))
const mockGet = vi.fn()
const mockAll = vi.fn()
const mockPrepare = vi.fn(() => ({ run: mockRun, get: mockGet, all: mockAll }))
const mockExec = vi.fn()

vi.mock('@/lib/database/connection', () => ({
  getDatabase: () => ({
    prepare: mockPrepare,
    get: mockGet,
    all: mockAll,
    exec: mockExec,
  }),
  transaction: (fn: () => void) => fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}))

import { itemsRepository } from '@/lib/database/repositories/items.repository'

function makeItem(overrides: Partial<TMDBItem> = {}): TMDBItem {
  return {
    id: 'test-1',
    title: '测试剧集',
    mediaType: 'tv',
    status: 'ongoing',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as TMDBItem
}

describe('itemsRepository.create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReturnValue(undefined) // findById returns nothing
  })

  it('includes networks in INSERT params when present', () => {
    const networks = [{ id: 1, name: 'Netflix', logoPath: '/n.png' }]
    const result = itemsRepository.create(makeItem({ networks }))

    expect(result.success).toBe(true)
    const runCall = mockRun.mock.calls[0]
    expect(runCall).toBeDefined()
    expect(runCall[0].networks).toBe('[{"id":1,"name":"Netflix","logoPath":"/n.png"}]')
  })

  it('includes networks in INSERT params for multiple networks', () => {
    const networks = [
      { id: 1, name: 'Netflix' },
      { id: 2, name: 'HBO', logoUrl: 'https://img/hbo.png' },
    ]
    const result = itemsRepository.create(makeItem({ networks }))

    expect(result.success).toBe(true)
    const runCall = mockRun.mock.calls[0]
    expect(JSON.parse(runCall[0].networks)).toEqual(networks)
  })

  it('sets networks to null in INSERT params when undefined', () => {
    const result = itemsRepository.create(makeItem({ networks: undefined }))

    expect(result.success).toBe(true)
    const runCall = mockRun.mock.calls[0]
    expect(runCall[0].networks).toBeNull()
  })

  it('sets networks to empty JSON array when empty array', () => {
    const result = itemsRepository.create(makeItem({ networks: [] }))

    expect(result.success).toBe(true)
    const runCall = mockRun.mock.calls[0]
    expect(runCall[0].networks).toBe('[]')
  })

  it('preserves platformUrls and defaultPlatformUrl alongside networks', () => {
    const item = makeItem({
      platformUrls: ['https://netflix.com/title/123', 'https://hbo.com/title/456'],
      defaultPlatformUrl: 'https://netflix.com/title/123',
      networks: [{ id: 1, name: 'Netflix' }],
    })
    const result = itemsRepository.create(item)

    expect(result.success).toBe(true)
    const runCall = mockRun.mock.calls[0]
    expect(JSON.parse(runCall[0].platformUrls)).toEqual(item.platformUrls)
    expect(runCall[0].defaultPlatformUrl).toBe('https://netflix.com/title/123')
    expect(JSON.parse(runCall[0].networks)).toEqual(item.networks)
  })
})

describe('itemsRepository.update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReturnValue({ id: 'test-1' }) // findById returns existing item
  })

  it('includes networks in UPDATE params when present', () => {
    const networks = [{ id: 1, name: 'Netflix' }]
    const result = itemsRepository.update(makeItem({ networks }))

    expect(result.success).toBe(true)
    const runCall = mockRun.mock.calls[0]
    expect(runCall[0].networks).toBe('[{"id":1,"name":"Netflix"}]')
  })

  it('sets networks to null in UPDATE params when undefined', () => {
    const result = itemsRepository.update(makeItem({ networks: undefined }))

    expect(result.success).toBe(true)
    const runCall = mockRun.mock.calls[0]
    expect(runCall[0].networks).toBeNull()
  })

  it('preserves defaultPlatformUrl and platformUrls with networks in UPDATE', () => {
    const item = makeItem({
      defaultPlatformUrl: 'https://hbo.com/show',
      platformUrls: ['https://netflix.com/title/123'],
      networks: [{ id: 1, name: 'Netflix' }],
    })
    const result = itemsRepository.update(item)

    expect(result.success).toBe(true)
    const runCall = mockRun.mock.calls[0]
    expect(runCall[0].defaultPlatformUrl).toBe('https://hbo.com/show')
    expect(JSON.parse(runCall[0].platformUrls)).toEqual(['https://netflix.com/title/123'])
    expect(JSON.parse(runCall[0].networks)).toEqual([{ id: 1, name: 'Netflix' }])
  })
})
