import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const here = dirname(fileURLToPath(import.meta.url))

/** Relative luminance helpers for WCAG contrast checks. */
function channel(value: number): number {
  const s = value / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const raw = hex.replace("#", "")
  const n = Number.parseInt(raw, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

describe("design tokens", () => {
  const css = readFileSync(resolve(here, "tokens.css"), "utf8")

  it("defines the core token groups", () => {
    for (const name of [
      "--color-bg",
      "--color-ink",
      "--color-muted",
      "--color-partner-a",
      "--color-partner-b",
      "--text-md",
      "--space-4",
      "--radius-lg",
      "--shadow-md",
      "--touch-min",
      "--nav-height",
      "--nav-clearance",
    ]) {
      expect(css).toContain(name)
    }
  })

  it("defines nav clearance as nav height plus 24px spacing token", () => {
    expect(css).toContain("--nav-clearance: calc(var(--nav-height) + var(--space-5))")
  })

  it("supports dark mode", () => {
    expect(css).toContain("@media (prefers-color-scheme: dark)")
    expect(css).toContain('[data-theme="dark"]')
    expect(css).toContain('[data-theme="light"]')
  })

  it("keeps secondary text at WCAG AA against the paper background", () => {
    expect(contrast("#5a5046", "#f3ecdf")).toBeGreaterThanOrEqual(4.5)
    expect(contrast("#c4b5a4", "#1a1511")).toBeGreaterThanOrEqual(4.5)
  })
})
