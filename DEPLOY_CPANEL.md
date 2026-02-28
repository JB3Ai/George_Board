# cPanel Live Deploy via GitHub Actions

This project auto-deploys to cPanel when you push to `main`.

Workflows in this repo:

- `deploy-cpanel.yml` → Clipboard app to `/public_html/clipboard/`
- `deploy-main-website-cpanel.yml` → Main website (`jb3ai-landing`) to `/public_html/`

## 1) Add GitHub repository secrets

In GitHub repo settings → **Secrets and variables** → **Actions**, add:

- `CPANEL_FTP_SERVER` (example: `ftp.yourdomain.com`)
- `CPANEL_FTP_USERNAME`
- `CPANEL_FTP_PASSWORD`

The workflow deploys to:

- `/public_html/clipboard/`

Optional build-time AI settings:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `GEMINI_API_KEY`

## 2) Push to main

Any push to `main` triggers `.github/workflows/deploy-cpanel.yml`:

1. install deps
2. build app (`npm run build`)
3. upload `dist/` to your cPanel path

## 3) Trigger manually

Use GitHub Actions → **Deploy to cPanel** → **Run workflow**.
