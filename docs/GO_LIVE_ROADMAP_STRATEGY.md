# Go-Live Roadmap Strategy

## Principles

- English is the default language.
- Language selection is stored locally in the browser (localStorage) and per-user preference key (localStorage) to align with the "Zero Data Storage" slogan.
- Branding (brand name, logo URL) + theme + primary color are stored locally in the browser and applied globally through shared layout.

## Internationalization (i18n) Rollout Plan

### Phase 0 (Go-Live) — i18n

- Supported languages:
  - English (`en`) — default
  - German (`de`)
  - French (`fr`)
- Scope for Phase 0:
  - Shared application layout translations:
    - Top navigation labels
    - Account menu labels
    - Footer labels
  - Settings page translations (language + branding sections)

Status: Completed (Phase 0 shipped)

### Phase 1 (Post Go-Live) — i18n

- Expand translation coverage within feature pages (page headers, primary CTAs, empty states, warnings).
- Introduce a per-language glossary for consistent professional terminology across:
  - Finance (P&L / reconciliation)
  - Data / schema
  - File conversion

### Phase 2 (Roadmap) — i18n

- Add additional languages based on user demand and conversion metrics.
- Candidates (not shipping in Phase 0):
  - Spanish (`es`)
  - Portuguese (`pt`)
  - Italian (`it`)

## Branding & Theme Rollout

### Phase 0 (Go-Live) — Branding & Theme

- Branding fields:
  - Brand name
  - Logo URL
  - Primary color
  - Theme (system/light/dark)

- Application behavior:
  - Preferences are applied globally via the shared `Layout` component.
  - Preferences update immediately after saving in Settings.

Status: Completed (Phase 0 shipped)

### Phase 1 (Post Go-Live) — Branding & Theme

- Extend branding/theming to additional UI surfaces:
  - Buttons, focus rings, charts, and highlighted callouts.
  - Ensure accessibility contrast (WCAG) for custom primary colors.

## Operational Notes

- Translation keys must be stable; avoid breaking key names to prevent regressions.
- New UI copy must be added to `en` first, then `de`/`fr` in the same PR.

## Go-Live Checklist (Relevant)

- i18n: EN/DE/FR available in Settings dropdown.
- Layout navigation/account/footer labels translate according to selected language.
- Branding/theme (brand name, logo URL, primary color, theme) applies globally.
