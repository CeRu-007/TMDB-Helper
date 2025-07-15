/**
 * 测试工具和Mock数据
 * 为单元测试和集成测试提供支持
 */

import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'
import { AppStateProvider } from './state-manager'
import { TMDBItem, ScheduledTask } from './storage'

// 测试环境包装器
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AppStateProvider>
        {children}
      </AppStateProvider>
    </ThemeProvider>
  )
}

// 自定义render函数
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock数据生成器
export class MockDataGenerator {
  static createTMDBItem(overrides: Partial<TMDBItem> = {}): TMDBItem {
    const now = new Date().toISOString()
    return {
      id: `test-item-${Date.now()}`,
      title: '测试电影',
      originalTitle: 'Test Movie',
      mediaType: 'movie',
      tmdbId: '12345',
      tmdbUrl: 'https://www.themoviedb.org/movie/12345',
      posterUrl: 'https://image.tmdb.org/t/p/w500/test.jpg',
      posterPath: '/test.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/test-backdrop.jpg',
      backdropPath: '/test-backdrop.jpg',
      logoUrl: 'https://image.tmdb.org/t/p/w500/test-logo.png',
      networkId: 1,
      networkName: '测试网络',
      networkLogoUrl: 'https://image.tmdb.org/t/p/w500/network-logo.png',
      overview: '这是一个测试电影的简介',
      voteAverage: 8.5,
      weekday: 1, // 周二
      secondWeekday: undefined,
      airTime: '20:00',
      isDailyUpdate: false,
      totalEpisodes: 12,
      manuallySetEpisodes: false,
      completed: false,
      status: 'ongoing',
      platformUrl: 'https://example.com/movie/12345',
      maintenanceCode: 'TEST001',
      notes: '测试备注',
      category: 'movie',
      createdAt: now,
      updatedAt: now,
      seasons: [],
      episodes: [],
      ...overrides
    }
  }

  static createScheduledTask(overrides: Partial<ScheduledTask> = {}): ScheduledTask {
    const now = new Date().toISOString()
    return {
      id: `test-task-${Date.now()}`,
      itemId: 'test-item-1',
      itemTitle: '测试项目',
      itemTmdbId: '12345',
      name: '测试定时任务',
      type: 'tmdb-import',
      schedule: {
        type: 'weekly',
        dayOfWeek: 1,
        hour: 20,
        minute: 0
      },
      action: {
        seasonNumber: 1,
        autoUpload: true,
        conflictAction: 'w',
        autoRemoveMarked: true,
        autoConfirm: true,
        removeIqiyiAirDate: false,
        autoMarkUploaded: true,
        enableYoukuSpecialHandling: false,
        enableTitleCleaning: true,
        autoDeleteWhenCompleted: false
      },
      enabled: true,
      lastRun: undefined,
      nextRun: undefined,
      lastRunStatus: undefined,
      lastRunError: undefined,
      currentStep: undefined,
      executionProgress: undefined,
      isRunning: false,
      createdAt: now,
      updatedAt: now,
      ...overrides
    }
  }

  static createMultipleTMDBItems(count: number, baseOverrides: Partial<TMDBItem> = {}): TMDBItem[] {
    return Array.from({ length: count }, (_, index) => 
      this.createTMDBItem({
        ...baseOverrides,
        id: `test-item-${index + 1}`,
        title: `测试项目 ${index + 1}`,
        weekday: index % 7
      })
    )
  }

  static createMultipleScheduledTasks(count: number, baseOverrides: Partial<ScheduledTask> = {}): ScheduledTask[] {
    return Array.from({ length: count }, (_, index) => 
      this.createScheduledTask({
        ...baseOverrides,
        id: `test-task-${index + 1}`,
        name: `测试任务 ${index + 1}`,
        itemId: `test-item-${index + 1}`
      })
    )
  }
}

// API Mock工具
export class ApiMocker {
  private static originalFetch: typeof fetch

  static mockFetch() {
    this.originalFetch = global.fetch
    global.fetch = jest.fn()
  }

  static restoreFetch() {
    if (this.originalFetch) {
      global.fetch = this.originalFetch
    }
  }

  static mockSuccessResponse(data: any) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data })
    })
  }

  static mockErrorResponse(status: number, message: string) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status,
      statusText: message,
      json: async () => ({ success: false, error: message })
    })
  }

  static mockNetworkError() {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    )
  }
}

// 存储Mock工具
export class StorageMocker {
  private static originalLocalStorage: Storage

  static mockLocalStorage() {
    const mockStorage: { [key: string]: string } = {}
    
    this.originalLocalStorage = window.localStorage
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockStorage[key] = value
        }),
        removeItem: jest.fn((key: string) => {
          delete mockStorage[key]
        }),
        clear: jest.fn(() => {
          Object.keys(mockStorage).forEach(key => delete mockStorage[key])
        }),
        length: 0,
        key: jest.fn()
      },
      writable: true
    })
  }

  static restoreLocalStorage() {
    if (this.originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', {
        value: this.originalLocalStorage,
        writable: true
      })
    }
  }
}

// 时间Mock工具
export class TimeMocker {
  private static originalDate: DateConstructor

  static mockDate(fixedDate: string | Date) {
    this.originalDate = Date
    const mockDate = new Date(fixedDate)
    
    global.Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockDate)
        } else {
          super(...args)
        }
      }
      
      static now() {
        return mockDate.getTime()
      }
    } as any
  }

  static restoreDate() {
    if (this.originalDate) {
      global.Date = this.originalDate
    }
  }
}

// 测试辅助函数
export const testUtils = {
  // 等待异步操作完成
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // 模拟用户输入
  simulateUserInput: (element: HTMLElement, value: string) => {
    element.focus()
    ;(element as HTMLInputElement).value = value
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  },
  
  // 模拟文件上传
  simulateFileUpload: (input: HTMLInputElement, file: File) => {
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false
    })
    input.dispatchEvent(new Event('change', { bubbles: true }))
  },
  
  // 创建测试文件
  createTestFile: (name: string, content: string, type: string = 'text/plain') => {
    return new File([content], name, { type })
  }
}

// 导出所有工具
export * from '@testing-library/react'
export { customRender as render }
export { MockDataGenerator, ApiMocker, StorageMocker, TimeMocker, testUtils }