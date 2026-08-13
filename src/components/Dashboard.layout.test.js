import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import Dashboard from './Dashboard'

const dashboardSource = readFileSync(new URL('./Dashboard.jsx', import.meta.url), 'utf8')
const stylesSource = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

describe('dashboard weight cells', () => {
  it('uses the reduced overview metric set and removes duplicated summary chips', () => {
    expect(dashboardSource).toContain("label: '当前总市值'")
    expect(dashboardSource).toContain("label: '浮动盈亏'")
    expect(dashboardSource).toContain("label: '执行进度'")
    expect(dashboardSource).toContain("label: isOpenEnded ? '最近投入' : '剩余可投'")
    expect(dashboardSource).not.toContain("label: '累计总投入'")
    expect(dashboardSource).not.toContain('dashboard-overview-meta')
  })

  it('keeps only next-period facts in the action card', () => {
    expect(dashboardSource).toContain('下一期')
    expect(dashboardSource).toContain('预计日期')
    expect(dashboardSource).toContain('getNextContributionDate')
    expect(dashboardSource).not.toContain('最新记录')
    expect(dashboardSource).not.toContain('执行前确认')
    expect(dashboardSource).not.toContain('正常执行')
    expect(dashboardSource).not.toContain('getTagBadgeClass')
    expect(dashboardSource).not.toContain('getPacingBadgeClass')
    expect(dashboardSource).not.toContain('节奏正常')
  })

  it('removes large dashboard performance and funding charts', () => {
    expect(dashboardSource).not.toContain('AreaChart')
    expect(dashboardSource).not.toContain('投入节奏')
    expect(dashboardSource).not.toMatch(/<h3[^>]*>资产表现<\/h3>/)
  })

  it('uses a compact allocation table with deviation and market value', () => {
    expect(dashboardSource).toContain('dashboard-allocation-table')
    expect(dashboardSource).toContain('dashboard-allocation-table-footer')
    expect(dashboardSource).not.toContain('dashboard-allocation-footer')
    expect(dashboardSource).toContain('当前 / 目标')
    expect(dashboardSource).toContain('市值')
    expect(dashboardSource).toContain('没有超过')
    expect(dashboardSource).not.toContain('<span>行情 {quoteDisplayState.text}</span>')
  })

  it('does not explain the interface inside compact status cards', () => {
    expect(dashboardSource).not.toContain('看执行是否稳定，不再重复展示金额趋势。')
    expect(dashboardSource).not.toContain('只显示需要关注的权重偏离。')
  })

  it('fills the overview height and keeps the action card content aligned', () => {
    expect(stylesSource).toMatch(/\.dashboard-overview-layout\s*\{[\s\S]*align-items:\s*start;/)
    expect(stylesSource).toMatch(/\.dashboard-action-summary\s*\{[\s\S]*align-self:\s*stretch;/)
    expect(stylesSource).toMatch(/\.dashboard-action-summary\s*\{[\s\S]*height:\s*auto;/)
  })

  it('does not render chart-only or cost-detail presentation', () => {
    expect(dashboardSource).not.toContain('dashboard-weight-value')
    expect(dashboardSource).not.toContain('成本已知')
    expect(dashboardSource).not.toContain('成本待补')
    expect(dashboardSource).not.toContain('ActiveWeightShape')
    expect(dashboardSource).not.toContain('activeIndex=')
  })

  it('leaves release notices to the global shell toolbar', () => {
    expect(dashboardSource).not.toContain("import ReleaseNotice from './ReleaseNotice'")
    expect(dashboardSource).not.toContain('<ReleaseNotice />')
  })
})

const plan = {
  id: 'plan-1',
  name: '长期计划',
  strategy: 'DCA',
  frequency: 'monthly',
  budgetMode: 'fixed',
  totalBudget: 12000,
  totalPeriods: 12,
  reserveRatio: 0,
  createdAt: '2026-08-12T09:30:00.000Z',
  assets: [
    {
      ticker: 'SCHB',
      weight: 1,
      currentShares: 3,
    },
  ],
}

function createRecord(periodIndex, tag = 'normal') {
  return {
    planId: plan.id,
    periodIndex,
    tag,
    totalActualAmount: 100,
    cumulativeInvested: periodIndex * 100,
    assets: [{ ticker: 'SCHB', price: 100 }],
  }
}

function renderDashboard(records) {
  return renderToStaticMarkup(createElement(Dashboard, {
    plan,
    records,
    onNavigate: () => {},
  }))
}

describe('dashboard execution continuity', () => {
  it('counts backward from the latest record until a gap or pause', () => {
    expect(renderDashboard([
      createRecord(1),
      createRecord(2),
      createRecord(3),
    ])).toContain('已连续执行 3 期')

    expect(renderDashboard([
      createRecord(1),
      createRecord(3),
    ])).toContain('已连续执行 1 期')

    const pausedMarkup = renderDashboard([
      createRecord(1),
      createRecord(2, 'paused'),
    ])
    expect(pausedMarkup).toContain('等待首次执行')
    expect(pausedMarkup).toContain('最近一期已暂停')
  })
})

describe('dashboard metric rendering', () => {
  it('renders the four approved fixed-budget metrics without chart headings', () => {
    const markup = renderDashboard([createRecord(1)])

    expect(markup).toContain('当前总市值')
    expect(markup).toContain('浮动盈亏')
    expect(markup).toContain('执行进度')
    expect(markup).toContain('剩余可投')
    expect(markup).not.toContain('累计总投入')
    expect(markup).not.toContain('资产表现')
    expect(markup).not.toContain('投入节奏')
  })

  it('renders the next period number and estimated contribution date', () => {
    const markup = renderDashboard([createRecord(1)])

    expect(markup).toContain('第 2 期')
    expect(markup).toContain('预计日期')
    expect(markup).toContain('2026年9月12日')
  })

  it('shows recent investment instead of remaining budget for open-ended plans', () => {
    const markup = renderToStaticMarkup(createElement(Dashboard, {
      plan: { ...plan, budgetMode: 'open-ended' },
      records: [createRecord(1)],
      onNavigate: () => {},
    }))

    expect(markup).toContain('最近投入')
    expect(markup).not.toContain('剩余可投')
  })
})
