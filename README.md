# blueprint

Drag-and-drop canvas for drawing software architecture diagrams — early alpha, just vibes so far.

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- SPA fallback: `not_found_handling = "single-page-application"` in `wrangler.toml`

If deploying with Wrangler:

- Preview branch deploy: `npm run cf:deploy`
- Production deploy: `npm run cf:deploy:prod`
