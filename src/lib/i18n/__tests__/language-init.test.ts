import { describe, it, expect, beforeEach, afterEach } from "vitest"

const STORAGE_KEY = "tmdb_language"

function setupBrowserEnvironment(store: Record<string, string>) {
  const localStorageMock = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    length: Object.keys(store).length,
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
  vi.stubGlobal("window", {})
  vi.stubGlobal("localStorage", localStorageMock)
}

function setupServerEnvironment() {
  vi.unstubAllGlobals()
}

describe("getInitialLanguage (server-side)", () => {
  it("returns zh-CN when no browser environment", async () => {
    setupServerEnvironment()
    const { getInitialLanguage } = await import("@/lib/i18n")
    expect(getInitialLanguage()).toBe("zh-CN")
  })
})

describe("getInitialLanguage (browser-side)", () => {
  beforeEach(() => {
    setupBrowserEnvironment({})
  })

  afterEach(() => {
    setupServerEnvironment()
  })

  it("returns zh-CN when no language is stored", async () => {
    const { getInitialLanguage } = await import("@/lib/i18n")
    expect(getInitialLanguage()).toBe("zh-CN")
  })

  it("returns zh-CN when stored value is auto", async () => {
    setupBrowserEnvironment({ [STORAGE_KEY]: "auto" })
    const { getInitialLanguage } = await import("@/lib/i18n")
    expect(getInitialLanguage()).toBe("zh-CN")
  })

  it("returns the stored language when valid", async () => {
    setupBrowserEnvironment({ [STORAGE_KEY]: "en-US" })
    const { getInitialLanguage } = await import("@/lib/i18n")
    expect(getInitialLanguage()).toBe("en-US")
  })

  it("returns ja-JP when stored as ja-JP", async () => {
    setupBrowserEnvironment({ [STORAGE_KEY]: "ja-JP" })
    const { getInitialLanguage } = await import("@/lib/i18n")
    expect(getInitialLanguage()).toBe("ja-JP")
  })

  it("returns zh-CN for unsupported language codes", async () => {
    setupBrowserEnvironment({ [STORAGE_KEY]: "th-TH" })
    const { getInitialLanguage } = await import("@/lib/i18n")
    expect(getInitialLanguage()).toBe("zh-CN")
  })
})
