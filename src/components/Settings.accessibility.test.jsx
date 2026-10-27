// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Settings from './Settings'
import { healthyPlan } from '../test/fixtures'

describe('settings range accessibility', () => {
  it('exposes labels, current values and keyboard semantics for all ranges', async () => {
    const user = userEvent.setup()
    render(<Settings plan={{ ...healthyPlan, strategy: 'VA' }} />)
    await user.click(screen.getByRole('button', { name: '添加标的' }))
    const ranges = screen.getAllByRole('slider')
    expect(ranges).toHaveLength(4)
    ranges.forEach((range, index) => {
      if (!range.hasAttribute('aria-label')) throw new Error(`missing label ${index}: ${range.outerHTML}`)
      expect(range).toHaveAttribute('aria-label')
      expect(range).toHaveAccessibleName()
      expect(range).toHaveAttribute('aria-valuetext')
      range.focus()
      fireEvent.keyDown(range, { key: 'Home' })
      fireEvent.keyDown(range, { key: 'End' })
      expect(document.activeElement).toBe(range)
    })
    expect(ranges[0]).toHaveAttribute('aria-valuetext', expect.stringMatching(/%/))
  })
})
