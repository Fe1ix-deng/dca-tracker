// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Layout from './Layout'

describe('empty plan entry points', () => {
  it('offers a first-plan action in the desktop and mobile shell without persistence', async () => {
    const user = userEvent.setup()
    const onChangeTab = vi.fn()
    render(<Layout activeTab="dashboard" onChangeTab={onChangeTab} plans={[]} onToggleTheme={vi.fn()} />)
    const actions = screen.getAllByRole('button', { name: '创建第一份计划' })
    expect(actions.length).toBeGreaterThanOrEqual(2)
    await user.click(actions[0])
    expect(onChangeTab).toHaveBeenCalledWith('settings')
    expect(localStorage.getItem('dca-tracker:plans')).toBeNull()
  })
})
