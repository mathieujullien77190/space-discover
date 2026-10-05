import { describe, expect, it } from 'vitest'
import { formatUtcDate, readMetric, writeMetric } from '@/helpers'
import { formatClock } from '@/components/RocketControls/helpers'

describe('formatUtcDate', () => {
  it('écrit la date en UTC et signale l’accélération', () => {
    const ms = Date.UTC(2026, 9, 5, 12, 30)
    expect(formatUtcDate(ms, false)).toMatch(/2026.*12:30 UTC$/)
    expect(formatUtcDate(ms, true)).toMatch(/UTC · accéléré$/)
  })
})
describe('formatClock', () => {
  it('T+m:ss', () => {
    expect(formatClock(0)).toBe('T+0:00')
    expect(formatClock(130)).toBe('T+2:10')
  })
})
describe('metric storage', () => {
  it('mémorise le réglage', () => {
    writeMetric(true)
    expect(readMetric()).toBe(true)
    writeMetric(false)
    expect(readMetric()).toBe(false)
  })
})
