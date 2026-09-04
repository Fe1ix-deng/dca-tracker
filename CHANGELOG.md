# Changelog

## 2.6.0 - 2026-09-04

### Added
- Added a dedicated current-plan deletion action in Settings.
- Deleting a plan now removes its associated history while preserving other plans.

## 2.5.1 - 2026-09-01

### Changed
- Removed repeated helper text from the operation page and fixed-budget history page so key data stays focused.

## 2.5.0 - 2026-09-01

### Added
- Added a plan-level US or A-share market selector with market-aware price precision.
- Added Chinese and English interface switching with persisted language preference.

### Changed
- A-share price inputs, quotes, history, and rebuilt calculations now preserve three decimal places while US plans retain two-decimal behavior.
- Updated the release notice summary available from the top bell.

## 2.4.2 - 2026-08-18

### Added
- Added direct JSON backup import entry points for users without an existing plan, restoring plans and contribution history in one flow.

### Fixed
- Imported backups now replace the full plan list so temporary plans created during recovery are not left behind.

## 2.4.0 - 2026-08-13

### Added
- Added stock split and reverse-split event records with automatic historical price and share-basis recalculation.
- Added four persistent accent palettes: classic indigo, warm orange, pine green, and monochrome.

### Changed
- Reduced the Dashboard to core market, profit, execution, and budget signals, and replaced the allocation chart with a compact table.
- Added the next expected contribution date, consecutive execution count, and pause or missing-period status to the Dashboard.
- Reworked the operation confirmation card into a clearer single-column decision, summary, note, and submission flow.
- Improved theme and plan selector alignment, positioning, focus states, and mobile readability.

## 2.3.0 - 2026-07-24

### Added
- Added a dashboard release notice that presents the latest version and user-facing update summary.

### Changed
- Acknowledged release notices now contract into a persistent bell for later review and reappear automatically when a new version is released.

## 2.2.0 - 2026-07-15

### Added
- Added live market quote refresh with execution-price fallback across dashboard and operation workflows.
- Added safer full-plan backup exports, pre-import safety snapshots, and crash-rescue exports.

### Changed
- Highlight the matching allocation pie segment when hovering or focusing a ticker, with a short expansion animation.
- Expanded dashboard layout coverage and added regression tests for quotes, yield estimation, and DCA calculations.

### Fixed
- Corrected yield-estimate rounding at 5% allocation steps and limited open-ended VA target calculations to reachable periods.

## 2.1.0 - 2026-07-11

### Changed
- Restyled light and dark themes with a Linear-inspired neutral palette and lavender-blue accent.

## 2.0.0 - 2026-07-01

### Added
- Added light and dark theme support with a persistent theme toggle.
- Added focused helper tests for operation decisions and reserve-ratio saving.
- Added design reference artifacts for the graphite lime day theme and graphite sage night theme.

### Changed
- Redesigned the app shell with responsive desktop sidebar and mobile navigation.
- Redesigned the dashboard overview into a compact two-column summary with aligned metric tiles.
- Moved allocation diagnostics above asset performance on the dashboard.
- Simplified asset performance cards to two key indicators: period change and market value to invested capital.
- Refined operation, history, and settings screens for tighter spacing, clearer surfaces, and better mobile behavior.

### Fixed
- Removed low-value helper text from dashboard metric cards to prevent text misalignment.
- Fixed card sizing and overflow issues across the dashboard and operation screens.
- Preserved an explicit zero reserve ratio for fixed-budget plans.
- Ensured paused operation records save zero shares even when suggestions are available.
