# Changelog

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
