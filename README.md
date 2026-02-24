# blueprint

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist`
- SPA fallback: `public/_redirects` is set to `/* /index.html 200`

If deploying with Wrangler:

- Preview branch deploy: `npm run cf:deploy`
- Production deploy: `npm run cf:deploy:prod`
