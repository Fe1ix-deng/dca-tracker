import { useEffect, useRef, useState } from 'react'
import {
  BarChart3,
  Check,
  ChevronDown,
  Download,
  History as HistoryIcon,
  Moon,
  Settings as SettingsIcon,
  SunMedium,
  TriangleAlert,
  WalletCards,
} from 'lucide-react'
import ReleaseNotice from './ReleaseNotice'

const navItems = [
  { key: 'dashboard', label: '总览', title: 'Dashboard', icon: BarChart3 },
  { key: 'operation', label: '本期操作', title: 'Operation', icon: WalletCards },
  { key: 'history', label: '历史', title: 'History', icon: HistoryIcon },
  { key: 'settings', label: '设置', title: 'Settings', icon: SettingsIcon },
]

const accentOptions = [
  { id: 'indigo', label: '经典靛蓝', color: '#5e6ad2' },
  { id: 'amber', label: '暖橙', color: '#d97757' },
  { id: 'green', label: '松针绿', color: '#3ca374' },
  { id: 'rose', label: '柔玫红', color: '#d46b86' },
  { id: 'mono', label: '黑白灰', color: '#a5a8b2' },
]

function PlanSelector({ plans, activePlanId, onChangeActivePlan, compact = false }) {
  const hasPlans = Array.isArray(plans) && plans.length > 0

  if (!hasPlans) {
    return (
      <div className={compact ? 'shell-plan-empty shell-plan-empty-compact' : 'shell-plan-empty'}>
        <span>暂无计划</span>
      </div>
    )
  }

  return (
    <label className={compact ? 'shell-plan shell-plan-compact' : 'shell-plan'}>
      <span>当前计划</span>
      <select
        aria-label="切换当前计划"
        value={activePlanId}
        onChange={(event) => onChangeActivePlan?.(event.target.value)}
      >
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name || '未命名计划'}
          </option>
        ))}
      </select>
    </label>
  )
}

function ThemeControl({ theme, accent = 'indigo', onToggleTheme, onChangeAccent, compact = false }) {
  const isDark = theme === 'dark'
  const Icon = isDark ? Moon : SunMedium
  const nextThemeLabel = isDark ? '切换到日间主题' : '切换到夜间主题'
  const [isAccentMenuOpen, setIsAccentMenuOpen] = useState(false)
  const wrapperRef = useRef(null)
  const arrowRef = useRef(null)
  const firstAccentOptionRef = useRef(null)
  const focusFirstOnOpenRef = useRef(false)

  const closeAccentMenu = () => setIsAccentMenuOpen(false)

  const handleAccentKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeAccentMenu()
      arrowRef.current?.focus()
      return
    }

    if (event.key === 'ArrowDown' && !isAccentMenuOpen) {
      event.preventDefault()
      focusFirstOnOpenRef.current = true
      setIsAccentMenuOpen(true)
    }
  }

  const handleDocumentPointerDown = (event) => {
    if (!wrapperRef.current?.contains(event.target)) {
      closeAccentMenu()
    }
  }

  useEffect(() => {
    if (!isAccentMenuOpen) return undefined

    document.addEventListener('pointerdown', handleDocumentPointerDown)
    return () => document.removeEventListener('pointerdown', handleDocumentPointerDown)
  }, [isAccentMenuOpen])

  useEffect(() => {
    if (isAccentMenuOpen && focusFirstOnOpenRef.current) {
      focusFirstOnOpenRef.current = false
      firstAccentOptionRef.current?.focus()
    }
  }, [isAccentMenuOpen])

  return (
    <div
      ref={wrapperRef}
      className="theme-control relative min-w-0"
      onKeyDown={handleAccentKeyDown}
    >
      <div className="theme-control-actions min-h-11 items-stretch gap-1">
        <button
          type="button"
          aria-label={nextThemeLabel}
          title={nextThemeLabel}
          onClick={onToggleTheme}
          className={compact ? 'theme-toggle theme-toggle-compact' : 'theme-toggle'}
        >
          <Icon size={17} aria-hidden="true" />
          <span>{isDark ? '夜间' : '日间'}</span>
        </button>
        <button
          ref={arrowRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isAccentMenuOpen}
          aria-label="选择强调色"
          title="选择强调色"
          onClick={() => setIsAccentMenuOpen((isOpen) => !isOpen)}
          className={compact
            ? 'theme-arrow theme-arrow-compact'
            : 'theme-arrow'}
        >
          <ChevronDown size={15} aria-hidden="true" />
        </button>
      </div>
      {isAccentMenuOpen && (
        <div
          className="theme-accent-menu"
          role="menu"
          aria-label="强调色"
        >
          {accentOptions.map((option, index) => (
            <button
              key={option.id}
              ref={index === 0 ? firstAccentOptionRef : undefined}
              type="button"
              role="menuitemradio"
              aria-checked={accent === option.id}
              onClick={() => {
                onChangeAccent?.(option.id)
                closeAccentMenu()
              }}
              className="theme-accent-option"
            >
              <span
                className="theme-accent-swatch"
                aria-hidden="true"
                style={{ backgroundColor: option.color }}
              />
              <span>{option.label}</span>
              {accent === option.id && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NavButton({ item, active, onChangeTab, mobile = false }) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={() => onChangeTab(item.key)}
      aria-current={active ? 'page' : undefined}
      className={mobile ? `mobile-nav-button ${active ? 'mobile-nav-button-active' : ''}` : `sidebar-nav-button ${active ? 'sidebar-nav-button-active' : ''}`}
    >
      <Icon size={mobile ? 18 : 17} aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  )
}

function BackupReminderBanner({ onExportBackup, onDismiss }) {
  return (
    <div
      role="status"
      className="card mb-4 flex flex-wrap items-start justify-between gap-4 border-warning/25 bg-warningSoft/30 p-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">你有尚未备份的数据</p>
          <p className="body-copy mt-1">
            数据目前只保存在这台设备的浏览器里，换设备、清缓存或重装浏览器都可能导致丢失，建议导出一份 JSON 备份。
          </p>
        </div>
      </div>
      <div className="flex w-full shrink-0 gap-2 sm:w-auto">
        <button type="button" onClick={onDismiss} className="control-button">
          稍后再说
        </button>
        <button type="button" onClick={onExportBackup} className="control-button-primary">
          <Download size={16} aria-hidden="true" />
          立即备份
        </button>
      </div>
    </div>
  )
}

export default function Layout({
  activeTab,
  onChangeTab,
  children,
  plans = [],
  activePlanId = '',
  onChangeActivePlan,
  theme = 'dark',
  onToggleTheme,
  accent = 'indigo',
  onChangeAccent,
  backupStatus = null,
  onExportBackup,
}) {
  const activeItem = navItems.find((item) => item.key === activeTab) || navItems[0]
  // Remembers which change-timestamp the user already dismissed, so the
  // banner comes back if new data changes after a dismissal, but not before.
  const [dismissedChangeAt, setDismissedChangeAt] = useState(null)

  const showBackupBanner = Boolean(
    backupStatus?.hasUnbackedChanges && backupStatus.lastDataChangeAt !== dismissedChangeAt,
  )

  return (
    <div id="root-layout" className="app-shell bg-radial text-white" data-theme={theme}>
      <aside className="desktop-sidebar" aria-label="主导航">
        <div className="sidebar-brand">
          <div className="brand-mark">DC</div>
          <div className="min-w-0">
            <p>Personal Console</p>
            <h1>DCA Tracker</h1>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="页面">
          {navItems.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={item.key === activeTab}
              onChangeTab={onChangeTab}
            />
          ))}
        </nav>

        <div className="sidebar-footer">
          <PlanSelector
            plans={plans}
            activePlanId={activePlanId}
            onChangeActivePlan={onChangeActivePlan}
          />
          <ThemeControl
            theme={theme}
            accent={accent}
            onToggleTheme={onToggleTheme}
            onChangeAccent={onChangeAccent}
          />
        </div>
      </aside>

      <div className="mobile-topbar">
        <div className="min-w-0">
          <p className="mobile-page-kicker">{activeItem.title}</p>
          <h1 className="mobile-page-title">{activeItem.label}</h1>
        </div>
        <div className="mobile-topbar-actions">
          <PlanSelector
            plans={plans}
            activePlanId={activePlanId}
            onChangeActivePlan={onChangeActivePlan}
            compact
          />
          <ThemeControl
            theme={theme}
            accent={accent}
            onToggleTheme={onToggleTheme}
            onChangeAccent={onChangeAccent}
            compact
          />
          <div className="mobile-release-notice">
            <ReleaseNotice />
          </div>
        </div>
      </div>

      <div className="app-toolbar desktop-release-notice">
        <ReleaseNotice />
      </div>

      <div className="app-scroll-area">
        <main className="app-content">
          {showBackupBanner && (
            <BackupReminderBanner
              onExportBackup={onExportBackup}
              onDismiss={() => setDismissedChangeAt(backupStatus.lastDataChangeAt)}
            />
          )}
          {children}
        </main>
      </div>

      <nav className="mobile-tabbar" aria-label="底部导航">
        <div className="mobile-tabbar-grid">
          {navItems.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={item.key === activeTab}
              onChangeTab={onChangeTab}
              mobile
            />
          ))}
        </div>
      </nav>
    </div>
  )
}
