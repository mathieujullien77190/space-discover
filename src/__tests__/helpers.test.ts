import { describe, expect, it } from 'vitest'
import { formatUtcDate } from '@/helpers'

describe('formatUtcDate', () => {
  it('écrit la date en UTC et signale l’accélération', () => {
    const ms = Date.UTC(2026, 9, 5, 12, 30)
    expect(formatUtcDate(ms, false)).toMatch(/2026.*12:30 UTC$/)
    expect(formatUtcDate(ms, true)).toMatch(/UTC · accéléré$/)
  })
})
