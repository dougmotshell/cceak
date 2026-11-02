# Visual system for the Casa de Cultura Espírita Allan Kardec website (short version)

Information classification (ISO/IEC 27001): Internal use.
Brand: cceak · Intelie. The development credit in the footer ("Site desenvolvido por intelie") must stay.

Status: **proposal v0.1**. Palette and heading serif depend on confirmation by the Casa.
Full specification (pt-BR): `docs/pt-br/architecture/design-system-casa-kardec.md`.

## Direction

Sober, welcoming and respectful. Deep navy blue as the dominant colour (from the Casa's facade), cream background and gold as the accent. No technology-product look and no promises of healing or miracles.

## Tokens

Semantic tokens in `web/assets/css/base.css`: background, surface, text, muted text, primary, primary on focus, borders, success, warning, error. Light theme in `:root`; dark theme in two blocks (`prefers-color-scheme` and `data-theme="dark"`) with identical values. Non-colour tokens (type scale, spacing, radii) live on `html`.

## Contrast (WCAG 2.2 AA)

Text 4.5:1; large text and components 3:1. All pairs pass in both themes. Examples: text on background 15.60:1 (light) and 15.94:1 (dark); primary-text on primary 12.82:1 (light) and 10.97:1 (dark); focus on background 5.07:1 (light) and 11.41:1 (dark). The full table is in the pt-BR specification.

## Key decisions

- Type: system fonts only, modular scale with ratio 1.2 and a 17 px base. Headings use the system serif fallback, pending approval.
- Hero: static navy band with cream text and gold accent; focus inside the band uses the gold token.
- Mobile first. Touch targets of 44 px minimum. Header navigation wraps to a second row between 801 and 1040 px.
- Brand colour set in the admin applies only to the light theme. Dark theme keeps the verified palette (`!important` on `--primary`).
- Theme follows `prefers-color-scheme` until the visitor chooses; the choice is kept in local storage.
- Reduced motion and forced-colors are respected.

## Open items

- Changes outside the CSS scope: nav order in the HTML header (focus order on mobile), missing anchors for reviews, location and social, `aria-current` from JS, and the default brand colour in `config-schema.js`. Details in the pt-BR specification, section 11.
- Visual validation in a browser is still pending.
