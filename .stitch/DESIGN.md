---
name: Voltify Design System
theme: dark
colors:
  volt-bg: "#090e1a"
  volt-card: "#111827"
  volt-border: "#1f2937"
  volt-cyan: "#06b6d4"
  volt-pink: "#ec4899"
  volt-green: "#10b981"
  volt-amber: "#f59e0b"
  volt-red: "#ef4444"
  volt-purple: "#8b5cf6"
  volt-textPri: "#f9fafb"
  volt-textSec: "#9ca3af"
  volt-textMute: "#6b7280"
  surface: "#0a0a0a"
  background: "#0a0a0a"
  outline: "#333333"
fonts:
  display: 'Plus Jakarta Sans, sans-serif'
  body: 'Inter, sans-serif'
  mono: 'JetBrains Mono, monospace'
shadows:
  cyan: "0 4px 20px rgba(6, 182, 212, 0.04)"
  pink: "0 4px 20px rgba(236, 72, 153, 0.04)"
  green: "0 4px 20px rgba(16, 185, 129, 0.04)"
  card: "0 10px 30px rgba(0, 0, 0, 0.2)"
animations:
  pulse-cyan: "pulse-cyan 2s cubic-bezier(0.4,0,0.6,1) infinite"
  pulse-glow: "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
  float: "float 3s ease-in-out infinite"
  float-slow: "float 8s ease-in-out infinite"
  slide-up: "slide-up 0.3s ease-out"
  coin-burst: "coin-burst 0.6s ease-out forwards"
---

# ⚡ Voltify — Stitch Design System Document

This document serves as the reverse-engineered design blueprint extracted directly from the Voltify codebase (`./src` and `tailwind.config.js`). Use this specification to generate matching, high-fidelity UI screens in Stitch.

---

## 🎨 1. Color System & Design Intent

Voltify operates in a deep, tech-centric dark mode context. The theme relies on solid, flat panels with thin outline borders to establish depth rather than high-transparency glass overlays.

### Functional Theme Colors
*   **Base Canvas (`background` / `volt-bg`)**: `#0a0a0a` / `#090e1a`
    *   *Intent*: Low-luminance, rich space-black backgrounds.
*   **Containers & Cards (`volt-card`)**: `#111827` (with border `#1f2937`)
    *   *Intent*: Card backgrounds that stand out cleanly over the dark canvas.
*   **Outlines (`outline` / `volt-border`)**: `#333333` / `#1f2937`
    *   *Intent*: Discrete panel separation.
*   **Text Hierarchy**:
    *   Primary (`volt-textPri`): `#f9fafb` (almost pure white).
    *   Secondary (`volt-textSec`): `#9ca3af` (muted cool gray).
    *   Muted (`volt-textMute`): `#6b7280` (for placeholders, timestamps, or calibration details).

### Accent & Status Indicators
*   **Eco & Positive (`volt-green` / `tertiary`)**: `#10b981`
    *   *Intent*: Used for energy-saving tips, coin gains, challenges achieved, and active status states.
*   **Power Alerts (`volt-red` / `error`)**: `#ef4444` / `#e00`
    *   *Intent*: High alert states, bill shock warnings, and critical system faults.
*   **Glow & Interaction (`volt-cyan`)**: `#06b6d4`
    *   *Intent*: Main CTA states, primary selections, active tab underlines, and forecasting predictions.
*   **Coins & Calibration (`volt-amber`)**: `#f59e0b`
    *   *Intent*: Daily streak counters, leaderboard wallet metrics, and calibration alerts.

---

## ✍️ 2. Typography & Fonts

*   **Display Font (`Plus Jakarta Sans`)**: Reserved exclusively for large headings, marketing statements, and prominent metric readouts.
*   **Body & UI Font (`Inter`)**: Standard UI typography, input fields, labels, buttons, and paragraphs.
*   **Monospace Font (`JetBrains Mono`)**: Used for numerical telemetry readouts, kilowatt counts (kWh), billing calculations, and technical estimates.

---

## 📦 3. UI Component Construction Patterns

### Flat Panel Cards (`.glass-card` / `.glass`)
Despite the CSS class name `.glass`, the codebase overrides this pattern to favor modern, clean, premium flat SaaS styling:
*   Background: `#111111`
*   Border: `1px solid #2a2a2a`
*   Border Radius: `12px`
*   Hover State (`.glass-hover`): Transitions to `#151515` background and `#444444` border color.

### Form Inputs
*   Background: `#111111`
*   Border: `#2a2a2a` (Focus transitions to `--color-volt-cyan` or `--color-volt-amber`).
*   No spinners: Number inputs have spin indicators removed globally via CSS.

### Telemetry Badges
*   **Estimated indicator (`.estimated-label`)**: Text colored in `#f59e0b` (Volt Amber), font size `0.65rem`, uppercase with a tracking layout (`letter-spacing: 0.08em`).

---

## ⚙️ 4. Additional Instructions for Screen Generation

When generating or editing screens using Stitch, enforce the following design rules:

### 📐 Layout & Composition
*   **Grid System**: Use CSS Grid with 12 columns on desktop. Dashboard cards should span 3 columns for micro-stats, 4 columns for sub-charts, and 8 columns for primary timeline trends.
*   **Responsive Adaptation**: Wrap all multi-column layouts into single columns on viewports `< 1024px`.
*   **Padding & Gap Standard**: Use a strict spacing scale: `gap-4` (`16px`) for grid items, `p-6` (`24px`) for card interiors, and `py-8 px-6` (`32px x 24px`) for page headers.

### ✨ Interaction States
*   **Hover Enhancements**: Every interactive card must support `.glass-hover`. Buttons must smoothly scale `scale-98` on click and `scale-102` on hover with a transit duration of `150ms`.
*   **Interactive Tabs**: Active navigation or filter tabs must use a bottom border or shadow colored in `#06b6d4` (Volt Cyan) with a white text priority (`#f9fafb`), while inactive tabs remain secondary (`#9ca3af`) without borders.
*   **Volt AI Chatbot Drawer**: On desktop, show the chatbot inside a fixed side panel on the right. On mobile, collapse it into a glowing float action button (FAB) that opens a sliding overlay drawer when tapped.

### 📝 Copy & Data Policies
*   **Real Data Only**: Do not invent fake names or placeholder texts (such as "Lorem Ipsum" or "User 1"). Use real names and contexts from the project schema (e.g., "TANGEDCO Tamil Nadu Electricity Board", "BEE 5-star AC calibration", Chennai city configurations).
*   **Estimated Badges**: Any value that is calculated using the estimation logic (such as predicted usage or What-If simulations) must carry the `.estimated-label` badge next to the value.

