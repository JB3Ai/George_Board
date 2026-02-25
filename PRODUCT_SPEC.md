
# Clipboard V0.2: Product Specification

## Overview
Clipboard is a secure; high-end shared workspace for JB³Ai stakeholders. It prioritizes structure over feature bloat.

## Technical Architecture: Metadata Enrichment (V0.2)

### 1. Rich Visuals
- **og:image Support:** Pinned items now display a high-resolution banner image if available.
- **Lazy Loading:** Banners are loaded on-demand to optimize initial rendering speed.
- **Grayscale Filter:** Images maintain the dark aesthetic via CSS filters; revealing color only on interaction.

### 2. Failure Handling
- **Silent Fallback:** If the enrichment service fails; the card remains a clean link card.
- **Status Tracking:** Items are explicitly marked as `PENDING`; `SUCCESS`; or `FAILED` to drive UI feedback.
- **Indicator:** A discrete "Preview delayed" message appears on failed enrichments.

### 3. Deployment Strategy
- **Environment:** cPanel (public_html/clipboard).
- **Routing:** .htaccess managed client-side routing for SPA support.

## Acceptance Criteria
- [x] Only allowlisted emails can initiate login.
- [x] 4-digit PIN gate is mandatory after magic link.
- [x] RLS prevents Jono from editing George's cards and vice versa.
- [x] Tasks support three distinct states (Open; Waiting; Done).
- [x] Pinned link cards display rich metadata and banners.
- [x] Metadata failures display a "Preview delayed" indicator.
- [x] .htaccess provided for jb3ai.com/clipboard/ subdirectory routing.
- [x] No em dashes used in any system copy or documentation.
