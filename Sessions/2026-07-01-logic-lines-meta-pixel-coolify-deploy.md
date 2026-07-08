# Session 2026-07-01 — Meta Pixel + Conversions API + Coolify Deploy

**Project:** Logic & Lines (propia) — Astro 5.7.10 landing
**Goal:** Integrate Meta Pixel (client) + Conversions API (server) with deduplication, then deploy to Hostinger VPS via Coolify using Docker.

---

## Phase 1 — Pixel & CAPI Implementation

### 1.1 Audit (found nothing)
- Reviewed `Layout.astro`, `src/pages/**`, `src/components/**`
- Only `facebook-domain-verification` meta tag existed (just Business Manager verification, not the pixel)
- No `fbq`, no `gtag`, no analytics scripts

### 1.2 Stack decisions
- **Adapter:** `@astrojs/node@8.3.4` (peer dep says astro@4 but works with 5 via `--legacy-peer-deps`)
- **Output mode:** `server` (required for API routes) + `prerender = true` per page
- **Tracking utility:** inline in `Layout.astro` head (no need for separate `lib/` since both fbq + helpers are inline scripts)

### 1.3 Files modified (17)

**Core tracking:**
- `src/layouts/Layout.astro` — Added fbq base code (init + PageView) + `trackMetaEvent()` utility
- `src/pages/api/meta-conversions.ts` — **NEW** — Server endpoint that POSTs to Meta Graph API v21.0 with SHA-256 hashing of user data

**Event triggers:**
- `src/components/Booking.astro` — Schedule event on Cal.com button click
- `src/components/Footer.astro` — Contact event on mailto:/wa.me/ links
- `src/pages/contact.astro` — Lead (page load) + Contact (click)
- `src/pages/en/contact.astro` — same
- `src/pages/service/[id].astro` — ViewContent (page load)
- `src/pages/en/service/[id].astro` — same

**Prerender flags (required because output: 'server'):**
- All static pages got `export const prerender = true;` in frontmatter
- index, en/index, contact (×2), service/[id] (×2), 404 (×2), thankyou, en/landing-lead, politica-de-privacidad, en/privacy-policy

**Config & docs:**
- `astro.config.mjs` — `output: 'server'`, added `adapter: node({ mode: 'standalone' })`
- `.env.example` — Added `META_PIXEL_ID` and `META_ACCESS_TOKEN`
- `Dockerfile` — **NEW** — For Coolify (see runbook)
- `package.json` — Added `@astrojs/node@8.3.4`

### 1.4 Deduplication pattern

```js
// Client side
function trackMetaEvent(eventName, customData, userData) {
  const eventId = generateEventId(); // 'evt_' + timestamp + random
  fbq('track', eventName, customData, { eventID: eventId });
  sendToConversionsAPI(eventName, customData, userData); // same eventId sent
}

// Server side
function sha256(value) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}
// Hash em, ph, fn, ln, ct, st, zp, country, external_id
// DON'T hash: event_id, client_user_agent, fbc, fbp, client_ip_address
```

### 1.5 Build verification
- Local `npm run build` → 17 static pages prerendered + server entrypoint built
- No errors, only deprecation warning for `getStaticPaths()` (fixed with `prerender = true`)

---

## Phase 2 — Coolify Deploy (the painful part)

### Problem 1: "Static site" was being deployed
**Symptom:** `docker ps` showed two containers — the real Astro app AND a generic `nginx:alpine` container.
**Root cause:** Coolify's Build Pack was set to "Static Image" → `nginx:alpine`, ignoring Node detection.
**Fix:** Build Pack → `Dockerfile`. Required creating a custom Dockerfile.

### Problem 2: "Dockerfile not found"
**Symptom:** Build error `open Dockerfile: no such file or directory`
**Root cause:** Dockerfile created locally but not committed/pushed to repo.
**Fix:** `git add Dockerfile && git commit && git push`

### Problem 3: pnpm "Ignored build scripts" error
**Symptom:** `ERR_PNPM_IGNORED_BUILDS: esbuild, sharp` — exit code 1
**Root cause:** pnpm 11 (auto-installed via corepack) blocks postinstall scripts by default for security.
**Fix attempted 1:** Remove `--frozen-lockfile` → didn't help (script approval still required)
**Fix final:** Switched Dockerfile from pnpm to npm (`pnpm install` → `npm install --legacy-peer-deps`)

### Problem 4: npm peer dependency conflict
**Symptom:** `ERESOLVE unable to resolve dependency tree — peer astro@"^4.2.0" from @astrojs/node@8.3.4`
**Root cause:** `@astrojs/node@8.x` officially requires `astro@4`, but we're on `astro@5.7.10`. Works fine in practice.
**Fix:** `npm install --legacy-peer-deps`

### Final Dockerfile (working)
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
```

---

## Commits (chronological)
- `1cff996` — Pixel + CAPI + adapter Node + config changes (large commit, 17 files)
- `97e3858` — Add Dockerfile for Coolify deployment
- `3e776dd` — Remove --frozen-lockfile (didn't help)
- `61c46e6` — Switch from pnpm to npm in Dockerfile
- `c2530dd` — Use --legacy-peer-deps for npm install

---

## Verification steps (pending)
1. Check `docker ps` — new container with Astro app running on internal port 4321
2. Check Coolify logs — should show "Server listening on http://0.0.0.0:4321"
3. Visit `https://logicandlines.com` — should show actual site
4. POST to `/api/meta-conversions` with test event → check Events Manager
5. Verify deduplication in Events Manager (event_id matching)

---

## Open issues
- [ ] Test that the deploy with `c2530dd` actually worked (last commit before user re-tested)
- [ ] Confirm pixel fires in browser DevTools (network tab → `fbevents.js`)
- [ ] Check Meta Events Manager for incoming events
- [ ] DNS verified: A @ → 72.62.21.49, CNAME www → logicandlines.com ✓
