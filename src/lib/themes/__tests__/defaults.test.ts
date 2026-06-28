import { describe, it, expect } from "vitest"
import { presetThemes, getThemeById, getThemesByAppearance } from "../defaults"

describe("presetThemes", () => {
  it("has at least 5 dark themes", () => {
    const dark = presetThemes.filter((t) => t.appearance === "dark")
    expect(dark.length).toBeGreaterThanOrEqual(5)
  })

  it("has at least 2 light themes", () => {
    const light = presetThemes.filter((t) => t.appearance === "light")
    expect(light.length).toBeGreaterThanOrEqual(2)
  })

  it("all themes have required fields", () => {
    presetThemes.forEach((theme) => {
      expect(theme.id).toBeTruthy()
      expect(theme.name).toBeTruthy()
      expect(theme.appearance).toMatch(/^(light|dark)$/)
      expect(theme.colors.background).toBeTruthy()
      expect(theme.colors.foreground).toBeTruthy()
    })
  })
})

describe("getThemeById", () => {
  it("returns theme for valid id", () => {
    const theme = getThemeById("nord")
    expect(theme).toBeDefined()
    expect(theme?.name).toBe("Nord")
  })

  it("returns undefined for invalid id", () => {
    expect(getThemeById("nonexistent")).toBeUndefined()
  })
})

describe("getThemesByAppearance", () => {
  it("filters themes by appearance", () => {
    const dark = getThemesByAppearance("dark")
    dark.forEach((t) => expect(t.appearance).toBe("dark"))
  })
})
