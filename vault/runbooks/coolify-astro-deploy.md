# Runbook — Deploy Astro 5.x to Coolify (Hostinger VPS)

> **Use case:** Self-hosted Astro site with server-side API routes, deployed to a VPS managed by Coolify (not Vercel/Netlify).
> **Tested with:** Astro 5.7.10, @astrojs/node 8.3.4, Node 22, Hostinger VPS, Coolify 4.0.0-beta.
> **Last verified:** 2026-07-01

---

## Why this runbook exists

Coolify's default "Static" and "Nixpacks" Build Packs are traps for Astro projects with API routes. They deploy `nginx:alpine` and ignore your server code. **Use Dockerfile** for full control.

---

## Step 1 — Project prerequisites

```bash
# astro.config.mjs
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',         // Required for API routes
  adapter: node({ mode: 'standalone' }),
  // ... rest of config
});
```

Every static page must opt in to pre-rendering:

```astro
---
export const prerender = true;
---
```

---

## Step 2 — Working Dockerfile (copy/paste)

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

**Why this exact config:**
- `node:22-alpine` — matches Astro 5.x minimum (≥18.17.1, but 22 is safer for Vercel/Coolify compat warnings)
- `npm install --legacy-peer-deps` — `@astrojs/node@8.x` peer dep says astro@4 but works with 5; the flag bypasses the strict check
- **Don't use pnpm** — `corepack enable && pnpm install` fails in Coolify with `ERR_PNPM_IGNORED_BUILDS: esbuild, sharp` because pnpm 11 blocks postinstall scripts by default and you can't run `pnpm approve-builds` non-interactively in a Docker build
- `mode: 'standalone'` in adapter — single `node entry.mjs` process, no separate server binary

---

## Step 3 — Coolify configuration

| Field | Value |
|-------|-------|
| **Build Pack** | `Dockerfile` (NOT Nixpacks, NOT Static) |
| **Dockerfile Location** | `Dockerfile` (or empty if in root) |
| **Port Mappings** | `4321:4321` |
| **Domains** | `yourdomain.com`, `www.yourdomain.com` |
| **Environment Variables** | Add in panel (NOT in .env file in repo) |

---

## Step 4 — DNS (Hostinger)

| Type | Name | Value |
|------|------|-------|
| A | `@` | IP of your Hostinger VPS |
| CNAME | `www` | `yourdomain.com` |

Coolify's Traefik proxy listens on ports 80/443 of the VPS and routes by domain.

---

## Troubleshooting matrix

### Symptom: "If you see this page, nginx is successfully installed"
**Cause:** Traefik (Coolify's proxy) isn't routing to your app, OR your app is deploying as static nginx:alpine.
**Fix:**
1. Check `docker ps` — is there a `nginx:alpine` container AND your app? If yes, Build Pack is wrong (set to "Dockerfile")
2. In Coolify UI → your app → Settings → Domains → make sure your domain is listed
3. If still broken, check `docker logs coolify-proxy --tail 50` for Traefik errors

### Symptom: "open Dockerfile: no such file or directory"
**Cause:** Dockerfile not committed/pushed to repo.
**Fix:** `git add Dockerfile && git commit -m "..." && git push`

### Symptom: "ERR_PNPM_IGNORED_BUILDS: esbuild, sharp"
**Cause:** pnpm 11 blocks postinstall scripts; can't approve interactively in Docker build.
**Fix:** Switch Dockerfile from pnpm to npm:
```dockerfile
RUN npm install --legacy-peer-deps
```

### Symptom: "ERESOLVE unable to resolve dependency tree"
**Cause:** Peer dep mismatch (e.g., `@astrojs/node@8` wants astro@4 but you have astro@5).
**Fix:** Add `--legacy-peer-deps` to `npm install` in Dockerfile.

### Symptom: "Build successful but page shows 502 Bad Gateway"
**Cause:** App crashed at startup (often missing env vars or wrong port).
**Fix:**
1. `docker logs <container_id>` to see startup error
2. Verify env vars are in Coolify panel (not just .env file)
3. Verify `ENV PORT=4321` matches the port you mapped

### Symptom: "Image not found ... Building new image" loop
**Cause:** Normal on first deploy or after config change. Just wait.

### Symptom: Deploy takes 5+ minutes
**Cause:** Building image from scratch. Normal. Subsequent deploys with cache are faster (~30s).

---

## Quick local test before pushing

```bash
# Build the image locally to catch errors before Coolify
docker build -t myapp:test .

# Run it
docker run -p 4321:4321 --env-file .env myapp:test

# Visit http://localhost:4321
```

---

## Environment variables — where to put them

| Where | What |
|-------|------|
| Coolify panel (UI) | Secrets, API keys, tokens (NEVER commit) |
| `.env` (local dev only) | Same vars for local testing |
| `.env.example` | Template with placeholder values, safe to commit |
| Hardcoded in code | NEVER |

---

## Architecture summary

```
Internet (HTTPS)
    ↓
Hostinger VPS :80/:443
    ↓
Coolify Traefik (auto-routes by domain)
    ↓
Your Astro container (port 4321, node:22-alpine)
    ↓
Astro server (static pages prerendered, API routes server-rendered)
```

---

## Related runbooks
- (TODO) Meta Pixel + CAPI integration
- (TODO) Astro static-only deploy (when you don't need API routes)
