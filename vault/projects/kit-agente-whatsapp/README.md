# Kit Agente WhatsApp v2.1

> Sistema de marca blanca para desplegar agentes de IA en WhatsApp. **Single-tenant**: una instancia = un cliente = un VPS.
>
> **Código fuente:** `C:\Users\Usuario\Desktop\opencode\kit-agente-whatsapp\`
> **Estado actual:** funcional en su mayoría, con 11 pendientes documentados (ver `PENDIENTES.md`)

---

## TL;DR

Producto de Logic & Lines para vender **agentes de IA en WhatsApp** a clientes finales. La versión 2.1 corrige el rumbo de la v2.0 (multi-tenant con Supabase + RLS) y vuelve al single-tenant físico: **cada cliente tiene su propio VPS, su propia DB Postgres, su propio bot**. La separación entre clientes no depende de que una política esté bien escrita — es la base de datos la que es literalmente otra.

Esto permite vender con margen alto (~93%) sobre un coste de ~10 €/mes por instancia, sin los riesgos operacionales de compartir infraestructura.

## Características

### Lo que hace el bot

- ✅ Recibe y responde mensajes de WhatsApp con IA (GPT-4o-mini, Claude Haiku, Gemini Flash, etc. vía OpenRouter)
- ✅ Califica leads con score 1-10 + temperatura (Caliente / Templado / Frío)
- ✅ Guarda leads en CRM interno (Postgres) con upsert por email/teléfono
- ✅ Deriva a humano cuando el lead lo pide o el bot no sabe responder (cambio de modo por conversación)
- ✅ Memoria de largo plazo por contacto (reconoce a quien vuelve a escribir semanas después)
- ✅ Procesa notas de voz y las transcribe (modelo multimodal de OpenRouter)
- ✅ Procesa imágenes y las describe (para que el bot las entienda)
- ✅ Personalidad configurable por `prompts/negocio.md` (13 secciones, sistema de secciones con `[CORCHETES]` por rellenar)
- ✅ Modo pausa global (bot deja de responder a todos, configurable en caliente)
- ✅ Buffer de agrupación (espera N segundos para responder a un burst de mensajes)

### Lo que tiene el dashboard (Next.js 15)

- ✅ Login single-operator con cookie HMAC firmada + bcrypt + `timingSafeEqual`
- ✅ Vista de conversaciones con polling 3s (decisión consciente, no implícita)
- ✅ Toggle AI ↔ HUMAN por conversación desde la UI
- ✅ Métricas: mensajes/día, coste IA, leads/día, embudo (wrote → identified → qualified → converted)
- ✅ Configuración hot-reload (modelo, temperatura, buffer, pausa, branding)
- ✅ Vista de knowledge base (chunks guardados — **búsqueda RAG automática PENDIENTE #2**)
- ✅ Health check público `/api/health` para UptimeRobot / BetterStack

### Robustez operativa

- ✅ Watchdog nivel 1 (cada 5 min): bot mudo, saldo OpenRouter bajo, pico de fallbacks
- ✅ Watchdog nivel 2 (cron 09:00 vía `node-cron` dentro del proceso): parte diario con IA
- ✅ Outbox con reintentos y backoff exponencial (5s → 10s → 20s → 40s, máx 5 intentos) — **fix #5 crítico**
- ✅ Guardrails multicapa: anti-flood, anti-fuga de prompt, precios autorizados, hosts permitidos, promesas prohibidas
- ✅ Auditoría de todas las acciones críticas en `audit_log`
- ✅ Reconexión automática de Baileys con backoff (5-440s según `reconnectAttempts`)
- ✅ QR robusto: maneja tanto base64 PNG como session refs de Evolution API

### Stack técnico

| Pieza | Tecnología | Versión |
|---|---|---|
| Frontend | Next.js + React | 15 / 19 |
| UI | shadcn/ui + Tailwind | 4 |
| Backend | Node.js + TypeScript | 22 / 5.7 |
| DB | Postgres + pgvector | 16 |
| ORM | `pg` library directo (sin ORM) | 8 |
| LLM | OpenRouter SDK | 6 |
| WhatsApp A | @whiskeysockets/baileys | 6.7.21 |
| WhatsApp B | Evolution API (HTTP) | v2 |
| Monorepo | pnpm workspaces | 9.15 |
| Auth | Cookie HMAC + bcryptjs | — |
| Sched | node-cron | 3 |
| Tests | vitest | 2.1 |

## Arquitectura (resumen visual)

```
┌──────────────────────────────────────────┐
│            VPS Cliente X                  │
│  ┌────────────────────────────────────┐  │
│  │ apps/web (Next.js 15)  apps/worker │  │
│  │       :3000              (bg)      │  │
│  │       │                  │         │  │
│  │       └────────┬─────────┘         │  │
│  │                ▼                   │  │
│  │      Postgres local (Coolify)      │  │
│  │      pgvector + RAG + memory       │  │
│  └────────────────────────────────────┘  │
│                ▲                          │
│                │ HTTPS                    │
│             WhatsApp (Baileys/Evolution)  │
└──────────────────────────────────────────┘
```

Para más detalle: `ARCHITECTURE.md`.

## Estructura del proyecto

```
kit-agente-whatsapp/                  (código fuente en C:\Users\Usuario\Desktop\opencode\)
├── apps/
│   ├── web/                          # Next.js 15 dashboard
│   └── worker/                       # Node 22 bot long-running
├── packages/shared/                  # Tipos + prompt template + ejemplos
├── postgres/migrations/              # 3 SQLs (schema + helpers + seed)
├── prompts/negocio.md                # UN único archivo por instancia
├── docs/                             # 6 guías en el código
├── examples/                         # 3 prompts completos
├── scripts/                          # CLI (setup-cliente, doctor, check, redteam)
└── .claude/                          # 4 commands + 1 subagente para Claude Code
```

## Pricing de venta (recomendado)

| Concepto | Precio |
|---|---|
| Setup inicial (despliegue + integración + formación) | 800-1.500 € |
| Mantenimiento mensual | 80-200 €/mes |
| Cambios al prompt / knowledge base | 50-150 € por cambio |
| **Coste de infraestructura por cliente** | **~10-12 €/mes** |
| **Margen** | **~93%** |

## Pendientes conocidos

11 ítems abiertos. Los más urgentes:

- **#5 Outbox (BLOQUEANTE para producción)**: ✅ **RESUELTO** en esta sesión — el bug original (marcaba `sent` sin enviar) está cerrado con tests
- **#1 PDF → chunking → embeddings**: no implementado
- **#2 RAG activo en el worker**: stub (la DB está lista, falta el glue)
- **#4 Alertas watchdog por WhatsApp**: no implementado (las alertas se guardan en `audit_log`, hay que revisarlas con SQL)
- **#11 Reintento manual de items `failed` del outbox**: workaround SQL documentado, UI no implementada

Ver `PENDIENTES.md` para la lista completa.

## Cómo usar esta documentación

| Quiero... | Ir a... |
|---|---|
| Entender qué es y para qué sirve | Este README |
| Saber qué hace por dentro (arquitectura) | `ARCHITECTURE.md` |
| Instalar una instancia nueva en local | `INSTALL.md` |
| Llevar a producción con Coolify | `DEPLOY.md` |
| Dar de alta un cliente nuevo (nueva instancia) | `CLIENT-SETUP.md` |
| Configurar variables de entorno | `CONFIG.md` |
| Operar día a día (logs, watchdog, troubleshooting) | `OPERATIONS.md` |
| Configurar integraciones (Chatwoot, n8n, Cal.com) | `INTEGRATIONS.md` |
| Ver qué falta por hacer | `PENDIENTES.md` |
| Historia de versiones y decisiones | `CHANGELOG.md` |

## Lecciones heredadas (del kit original v1)

1. `fetchLatestBaileysVersion()` evita code 405
2. `Browsers.macOS('Desktop')` evita code 440 loop
3. `env-loader.ts` como primer import (ES module hoisting)
4. `*.tsbuildinfo` en `.gitignore` (rompe Nixpacks)
5. Polling defensivo para QR race condition
6. Backoff exponencial en reconexión
7. QR puede ser base64 O session ref → validar con regex
8. NUNCA `:free` models de OpenRouter
9. Capturar texto de CUALQUIER turno del tool calling loop
10. **LID resolution**: usar `senderPn` cuando el JID es `@lid`

## Licencia

- ✅ Usar para tus proyectos y los de tus clientes
- ✅ Modificar el código libremente
- ✅ Cobrar por implementación + mantenimiento
- ❌ Revender o redistribuir el kit tal cual
- ❌ Compartir el código fuente públicamente

---

*Mantenido por Logic & Lines · Última actualización 2026-07-13*
