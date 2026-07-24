# Dashboard Release Notice Design

## Goal

Show a concise, user-facing release notice when a user enters the dashboard after
an update. Once acknowledged, the notice contracts into a bell icon that remains
available for later review.

## Content

The initial release is version `2.2.0`, dated 2026-07-15. Its panel presents
three short user-facing changes:

- Market quotes can refresh on the dashboard and during each operation.
- Backup exports now include more safeguards before an import or recovery.
- The allocation chart more clearly follows the selected holding.

Release content is maintained as structured static data in the interface, so it
does not expose the developer changelog or require a network request.

## Interface And Interaction

The dashboard overview card has a bell button in its upper-right corner. The
button uses a standard `Bell` icon and an accessible label.

When the stored read version differs from the current release version, entering
the dashboard automatically opens a compact panel attached to this button. The
panel displays the version, release date, update items, and an `已读` action.

Selecting `已读` writes the current version to browser local storage and plays a
short contraction animation toward the bell. The bell remains visible after the
panel closes. Selecting the bell reopens the panel without changing the stored
state. Clicking outside the panel, selecting the bell again, or pressing Escape
closes it without recording the release as read; it will therefore appear again
when the dashboard is next entered.

The panel is positioned below and aligned to the bell on wide screens. On narrow
screens, it remains right-aligned and constrained to the viewport width. It must
not be clipped by the overview card.

## State And Failure Handling

The component owns transient open and contraction state. A small storage helper
reads and writes the last acknowledged release version using a dedicated key.
Storage parsing errors or unavailable storage are ignored: the notice still
opens, but acknowledgement is not guaranteed to survive a refresh.

The release version is the comparison key. Updating the static release version
makes the next dashboard visit automatically present the new notice.

## Accessibility

The bell has an accessible name. The panel is a labelled dialog-like disclosure,
with keyboard focus on the `已读` action when auto-opened. Escape closes the
panel and returns focus to the bell. The animation respects the existing
reduced-motion rule.

## Tests

Tests verify that a new version opens automatically, acknowledgement persists
the version, and the bell remains a manual review entry point. A layout/source
check protects the right-aligned, unclipped panel implementation.
