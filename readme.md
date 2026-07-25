# Morah — Design System

**Morah** is the brand for an **NR1 psychosocial-risk assessment platform** used by Brazilian *técnicos de segurança do trabalho* (occupational-safety technicians). The técnico registers companies (*empresas*), structures them by *setor* and *cargo*, runs anonymized psychosocial evaluations (Copsoq II / HSE-IT instruments), and produces interpretation reports graded **Crítico / Atenção / Adequado**.

This repository is the **visual foundation** for that product: brand identity, design tokens, reusable React components, and a high-fidelity recreation of the técnico admin panel. It exists so design agents can produce on-brand Morah screens, mocks, and decks quickly. The backend is wired separately — this is the visual layer for stakeholder review.

> **Brand origin.** *Morah* plays on **amora** (Portuguese for blackberry). The chosen logo (provided by the founders, `uploads/pasted-1781211599704-0.png`) is a **circuit amora**: a blackberry outlined in deep plum whose inner drupelets form a **circuit-board trace with nodes** — fruit + technology/data. The wordmark is **MORAH** in widely-tracked uppercase. Logo ink is `--brand-ink #4B244D`.

---

## Sources used to build this system

- **Base app screenshots** — the técnico ("technician") version of the platform, currently white-labeled as *"Avalia NR1"* (deep-navy theme). Morah rebrands this surface to the blackberry identity. Screens captured: Visão Geral (dashboard), Termos Aceito, Empresas, Setor, Cargos, Campanhas, Relatórios, Link de Avaliação, Comparar Relatórios, Modelos de Apresentação.
- **GitHub — `MoorahLtda/Mentask`** (https://github.com/MoorahLtda/Mentask) — the product repo (this one). Moved here on 2026-07-25; it previously lived at `4Him-Technology/Morah`, which was **deleted** — Moorah and 4Him are separate companies and the code belongs under Moorah.
- *(historical)* The typography choice — **Plus Jakarta Sans + Manrope** — was originally confirmed by a sibling product under the former parent company. Kept as the house preference; no live dependency on that repo.

> Readers with access can explore those repositories to build more accurately as the product evolves.

---

## Content fundamentals

The product UI is written in **Brazilian Portuguese**, in a **clear, institutional, reassuring** register — this is a compliance tool that handles sensitive mental-health data, so copy is precise and calm, never playful.

- **Tone:** professional, direct, supportive. Short labels; full-sentence helper text. Example empty state: *"Selecione uma empresa específica no dropdown acima para visualizar os relatórios salvos."*
- **Voice:** addresses the técnico in the imperative/neutral third person ("Selecione…", "Gerencie todas as empresas do sistema"). It does **not** use casual first person.
- **Casing:** Section titles are **Title Case** or sentence case ("Empresas Cadastradas", "Histórico de Avaliações"). Eyebrows and KPI labels are **UPPERCASE** with wide tracking ("TOTAL DE EMPRESAS"). Nav-group headers are uppercase ("NAVEGAÇÃO", "FERRAMENTAS").
- **Numbers & codes:** CNPJ, dates, and score ranges render in **monospace** (e.g. `12.811.039/0001-78`, `2.6 – 3.9`). Result bands always pair a label with its numeric range.
- **No emoji.** Iconography is line-based (Lucide). Status is communicated with the Crítico/Atenção/Adequado color language, never emoji.
- **Reassurance footer:** report surfaces close with *"Dados anônimos e agregados"* — anonymity is a recurring, deliberate message.

---

## Visual foundations

**Palette.** Primary is **blackberry purple** (`--berry-500 #A4459C`). In-app, berry is an **accent on a light neutral shell** — active nav pills, primary buttons, chart fills — never a full dark surface (the near-black plums survive as tokens for decks/marketing only). The accent is **leaf green** (`--leaf-500 #3E9B63`) — the berry's calyx — reserved for confirmations, "online" dots, and positive emphasis. Neutrals are **plum-tinted grays** (a hint of purple in every gray) so the whole UI feels of-a-piece. Status uses three NR1 bands: **Crítico** (red `#E23D3D`), **Atenção** (amber `#F5B12E`), **Adequado** (green `#2EA86A`), plus an **info** blue for links/neutral states.

**Type.** Display = **Plus Jakarta Sans** (700–800) for headings, KPIs, and the wordmark — geometric and confident. Body/UI = **Manrope** (400–700). Data/codes = **JetBrains Mono**. Headings use tight tracking (`-0.02 to -0.04em`); uppercase eyebrows use wide tracking (`0.08em`).

**Backgrounds.** App canvas is a near-white plum-gray (`--gray-50`). The shell is **light**: a white sidebar (`--surface-sidebar`) with a hairline right border, and a slim **64px translucent top bar** (`rgba(255,255,255,0.82)` + backdrop blur, hairline divider). The page title lives **in the content column**, not in a banner. The legacy dark gradients (`--gradient-header`, `--gradient-sidebar`) remain as tokens for decks/marketing surfaces only. No photography in-app; the brand imagery is the berry mark itself.

**Shell themes.** The shell is themeable via `data-theme` on `<html>`, driven by the `--sidebar-*` / `--nav-*` semantic tokens. Default is the **light shell** (white sidebar); `data-theme="plum"` dresses the sidebar in the logo's deep plum ink (`#4B244D` gradient) with white-glass active states — the content column stays light in both. The técnico panel exposes a moon/sun toggle in the top bar and persists the choice in `localStorage` (`morah-theme`). The brand lockup swaps automatically via `.morah-logo-light` / `.morah-logo-dark` (base.css).

**Cards.** White, `--radius-lg` (16px) corners, hairline `--border-subtle` border, and a **near-flat plum-tinted shadow** (`--shadow-card` is a whisper — borders carry the separation; shadows carry `rgba(31,11,32,…)`, never neutral black). Interactive cards **lift 1px** and deepen the border on hover. KPI tiles are flat white with a tinted 32px **icon chip** (berry/blue/green/amber), an uppercase label and a quiet sparkline — **the number is the hero**.

**Borders & radii.** Radii scale 6 → 28px; controls use `--radius-control` (10px), cards 16px, badges 6px (squarish chips read more technical than pills). Borders are 1px and low-contrast; emphasis comes from weight and spacing, not heavy outlines.

**Buttons & states.** Primary = solid `--berry-600` (flat, no gradient). `secondary` = white + border, neutral text. `dark` = graphite (`--gray-900`), rare emphasis only. `danger` = red. Hover **darkens slightly** (`brightness(0.96)`); press **scales to 0.97**. Focus rings are a 3px berry-tinted halo (`--ring-focus`).

**Motion.** Quiet and quick. `--dur-fast 120ms` for hover/press, `--dur-base 200ms` for surfaces, easing `--ease-out cubic-bezier(.22,1,.36,1)`. No bounces, no infinite loops. Active sidebar items use a quiet `--berry-50` pill with berry text — no glow, no accent bar.

**Transparency & blur.** Used sparingly — the top bar is translucent white with backdrop blur over the scrolling canvas. The `dark` Select variant keeps a white-glass treatment for the rare dark surface (decks, marketing).

---

## Iconography

- **Icon set: [Lucide](https://lucide.dev)** — loaded from CDN (`unpkg.com/lucide`). In React, ALWAYS render icons with the bundled `<Icon name="…" />` component — never call `lucide.createIcons()` inside a React tree (it mutates React-owned DOM and crashes re-renders). The base app's line icons (building, layers, briefcase, bar-chart, link, clipboard, bell) match Lucide's 2px-stroke geometric style almost exactly, so Lucide is the canonical set. *(Substitution flagged: the original app's exact icon font wasn't available; Lucide is the closest faithful match.)*
- **Usage:** 17px in nav, 15–18px inside buttons, ~21px in empty-state chips, 16px in KPI icon chips. Stroke weight 2 (2.3 when a nav item is active).
- **No emoji, no custom hand-drawn SVG icons.** The single bespoke vector is the **brand mark** (`assets/morah-mark.png`) — the circuit amora.
- **Color:** icons inherit text color or use `--berry-500` for brand emphasis; status icons use the band colors.

---

## Repository index

**Foundations**
- `styles.css` — entry point (consumers link this). `@import`s everything below.
- `tokens/colors.css` · `typography.css` · `spacing.css` · `fonts.css` · `base.css`

**Assets**
- `assets/morah-mark.png` / `morah-mark-white.png` — the circuit-amora logomark (plum ink / white, transparent bg).
- `assets/morah-wordmark.png` / `morah-wordmark-white.png` — the MORAH wordmark.
- `assets/morah-logo-full.png` / `morah-logo-full-white.png` — full vertical lockup.

**Components** (`window.MorahDesignSystem_32f810.*`)
- `components/core/` — **Button, Badge, Avatar, Card, Icon** (React-safe Lucide renderer)
- `components/forms/` — **Input, Select**
- `components/data/` — **StatCard** (KPI tile + sparkline), **ResultBand** (NR1 band)
- `components/navigation/` — **Tabs, NavItem**

**UI kit**
- `ui_kits/tecnico/` — **Painel do Técnico**, an interactive recreation of the admin panel (Visão Geral, Empresas, Relatórios, Comparar, Modelos, Termos, + select-a-company empties). `index.html` is the entry; logic split across `Sidebar.jsx`, `Header.jsx`, `Screens.jsx`, `App.jsx`, `data.js`.

**Specimen cards** — `guidelines/*.card.html` populate the Design System tab (Brand, Colors, Type, Spacing).

**`SKILL.md`** — makes this system usable as a downloadable Claude Skill.

---

## Caveats

- **Fonts load from Google Fonts CDN**, not self-hosted binaries (see `tokens/fonts.css`). Swap for local `@font-face` woff2 in production.
- **The app is a rebrand of the técnico surface** seen in screenshots; the *empresa* (company-facing) version does not exist yet.
