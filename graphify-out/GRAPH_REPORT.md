# Graph Report - Logic_and_lines  (2026-07-29)

## Corpus Check
- 78 files · ~122,380 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 269 nodes · 327 edges · 40 communities (34 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `07d3062c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]

## God Nodes (most connected - your core abstractions)
1. `../../layouts/Layout.astro` - 29 edges
2. `../../components/FAQ.astro` - 18 edges
3. `../../components/BenefitsList.astro` - 15 edges
4. `useTranslations()` - 13 edges
5. `Runbook — Deploy Astro 5.x to Coolify (Hostinger VPS)` - 11 edges
6. `../../components/BookButton.astro` - 10 edges
7. `../../components/ServicesList.astro` - 10 edges
8. `../../components/ReasonsList.astro` - 9 edges
9. `HANDOFF — Logic & Lines Web` - 9 edges
10. `3. Hecho en esta sesion (bloque 1 + ajustes)` - 9 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (40 total, 6 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (26): ../../i18n/utils, t, t, t, t, t, stepsIcons, t (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (24): Architecture summary, code:bash (# astro.config.mjs), code:astro (---), code:dockerfile (FROM node:22-alpine AS build), code:dockerfile (RUN npm install --legacy-peer-deps), code:bash (# Build the image locally to catch errors before Coolify), code:block6 (Internet (HTTPS)), Environment variables — where to put them (+16 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (21): ../i18n/config, ../../styles/global.css, t, t, alternateURLs, { currentLang }, businessData, currentDate (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): dependencies, astro, astro-icon, @astrojs/node, @astrojs/sitemap, tailwindcss, @tailwindcss/vite, devDependencies (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (18): 1.1 Audit (found nothing), 1.2 Stack decisions, 1.3 Files modified (17), 1.4 Deduplication pattern, 1.5 Build verification, code:js (// Client side), code:dockerfile (FROM node:22-alpine AS build), Commits (chronological) (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (10): astro-icon/components, cards, benefits, collections, faq, reasons, services, getStaticPaths() (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (5): t, benefits, isManualCard, t, ../../components/BenefitsList.astro

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (9): ALLOWED_EVENTS, cleanupExpiredRateLimitEntries(), HASHABLE_FIELDS, hashField(), isRateLimited(), PASSTHROUGH_FIELDS, POST(), rateLimitMap (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (6): Challenges, Features, Getting Started, Live Demo, Malaithai Massage Lanzarote Website, Overview

### Community 9 - "Community 9"
Cohesion: 0.43
Nodes (4): bindDragHandle(), initHero(), refreshRefs(), setupFadeOut()

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (22): 1. Resumen de la sesion, 2. Stack, 3. Hecho en esta sesion (bloque 1 + ajustes), 4. Decision importante, 5. Lo que queda por hacer (proxima sesion), 6. Notas / advertencias, 7. Archivos clave tocados en esta sesion, 8. Proximo paso sugerido (+14 more)

### Community 11 - "Community 11"
Cohesion: 0.50
Nodes (3): exclude, extends, include

### Community 38 - "Community 38"
Cohesion: 0.11
Nodes (13): t, contactSchema, email, t, languages, nonLocalizedPaths, getLanguageFromURL(), translations (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (10): article, categoryContent, content, faqCategories, faqSchema, hContent, item, newHeader (+2 more)

## Knowledge Gaps
- **142 isolated node(s):** `name`, `type`, `version`, `dev`, `build` (+137 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `../../layouts/Layout.astro` connect `Community 2` to `Community 0`, `Community 5`, `Community 38`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `../../components/FAQ.astro` connect `Community 39` to `Community 0`, `Community 5`, `Community 38`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `../../components/BenefitsList.astro` connect `Community 6` to `Community 0`, `Community 5`, `Community 38`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `name`, `type`, `version` to the rest of the system?**
  _142 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1010752688172043 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10826210826210826 - nodes in this community are weakly interconnected._