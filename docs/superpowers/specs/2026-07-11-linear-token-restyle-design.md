# Linear Token Restyle Design

## Goal

Restyle the DCA tracker color system to a Linear-inspired palette while
preserving every existing component, layout, Tailwind color mapping, and
application behavior.

## Scope

Only `src/index.css` changes during implementation.

- Replace dark-theme color custom properties with a near-black canvas,
  charcoal surface ladder, cool neutral text, and Linear lavender-blue accent.
- Replace light-theme color custom properties with neutral near-whites and
  grays while keeping the same lavender-blue accent.
- Recalculate semantic soft backgrounds from the new semantic colors using
  the existing foreground-to-surface relationship.
- Update select backgrounds and the hard-coded app-background corner colors
  so they no longer retain the prior green tint.
- Retain existing gradient structure, component geometry, shadows, typography,
  and Tailwind semantic-color mappings.

## Theme Contract

The CSS custom-property names remain unchanged. All components continue to
consume the same semantic Tailwind colors, so no JSX, class names, state flow,
or stored data contract changes.

The dark theme uses Linear's `#010102` canvas, `#0f1011` primary panel,
`#18191b` elevated surface, `#f7f8f8` primary text, `#d0d6e0` soft text,
`#23252a` hairline, and `#5e6ad2` accent. The light theme uses the neutral
values specified in the supplied restyle brief and preserves that accent for
brand consistency.

## Boundaries

The implementation must not modify React component files, Tailwind color
mappings, IBM Plex Mono usage, component rounding, spacing, or introduce
dependencies. Existing border alpha values remain unchanged unless visual
verification shows the new hairline token is insufficiently visible; any such
adjustment must be local and minimal.

## Validation

Run `npm test` and `npm run build`. Launch the local application and inspect
Dashboard, History, Settings, and OperationPanel under both themes. Confirm
that surface hierarchy, divider visibility, inputs, semantic states, and
primary-button contrast remain clear. Commit only the restyle files after
verification, preserving unrelated existing worktree changes.
