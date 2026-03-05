# SESSION_STATE — George_Board

> Last updated: 2026-03-05

## Project Summary
- **Name:** George Board (Clipboard) — Personal clipboard/board app
- **Stack:** React 19, Vite 7, TypeScript, Supabase, Framer Motion, Lucide icons
- **Repo:** https://github.com/JB3Ai/George_Board.git
- **Branch:** `main`
- **Deploy:** cPanel via GitHub Actions (`deploy-cpanel.yml`)

## Current Status: STABLE / DEPLOYED
- Working tree is **clean** — no uncommitted changes.
- Last commit: `a07c596` — *Sec: Replace permissive FOR ALL RLS policy with explicit per-operation policies on clipboard_items*

## Recent Work (last 10 commits)
1. Sec: Replace permissive FOR ALL RLS with explicit per-operation policies
2. Feat: Fix link/YouTube previews + add DOCUMENT upload type
3. Fix: Show install instructions modal globally after first-time PIN creation
4. Chore: Add .env to .gitignore
5. Feat: Move PIN, theme, items, registry from localStorage to Supabase
6. Fix: Use CSS variables for text in Card/DemoTab — paper/sand theme readability
7. CI: fix deploy-cpanel.yml — ftps, npm ci, timeout, exclude patterns
8. Update DemoTab, Layout, tokens, add GTR asset
9. Rebuild: latest changes
10. Allow user access to Settings tab

## Key Features / Modules
- Clipboard items with Supabase backend (PIN auth, themes, items, registry)
- Link/YouTube preview cards
- Document upload support
- Row-Level Security (RLS) policies on Supabase
- Paper/sand theme system with CSS variables

## Database
- **Supabase** — table: `clipboard_items` with RLS policies
- SQL schema in [SQL.sql](SQL.sql)

## Next Steps / Open Items
- None outstanding — stable and deployed.
- Consider: adding more item types, improving mobile UX.

## Known Issues
- None currently tracked.
