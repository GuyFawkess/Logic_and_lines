# Arquitectura — Kit Agente WhatsApp v2.1

> SINGLE-TENANT: una instancia = un cliente. La separación entre clientes es **física** (VPS separado + DB separada), no lógica (RLS).

## Visión global

```
┌──────────────────────────────────────────────────────────────┐
│                     VPS Cliente X                             │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ apps/web (Next.js 15)         apps/worker (Node 22)   │  │
│  │       :3000                          (background)      │  │
│  │       │                                  │            │  │
│  │       └──────────┬───────────────────────┘            │  │
│  │                  │                                    │  │
│  │                  ▼                                    │  │
│  │          Postgres local (Coolify)                     │  │
│  │          pgvector + RAG + memory                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                  ▲                                           │
│                  │ HTTPS / WebSocket                         │
│              WhatsApp (Baileys o Evolution)                  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                     VPS Cliente Y                             │
│             (instancia completamente separada)               │
└──────────────────────────────────────────────────────────────┘
```

## Procesos

### `apps/web` — Dashboard Next.js 15

Sirve la UI para el operador único y expone los API routes.

**Responsabilidades:**
- Login con cookie HMAC + bcrypt
- Render del dashboard (chats, métricas, knowledge, ajustes)
- API routes para `conversations`, `messages`, `settings`, `mode`, `outbox`
- Webhooks: `/api/webhooks/evolution` recibe mensajes de Evolution API
- Health check: `GET /api/health`

**Tecnología:** Next.js 15 App Router + Server Components + Server Actions + `pg` (pool) + shadcn/ui + Tailwind v4.

### `apps/worker` — Bot long-running

Proceso Node 22 que mantiene la conexión WhatsApp abierta y procesa mensajes.

**Responsabilidades:**
- Conexión persistente con WhatsApp (Baileys WebSocket o Evolution webhooks)
- Procesar mensajes entrantes (`handler.ts`)
- Construir el system prompt y llamar al LLM (`openrouter.ts` + `system-prompt.ts`)
- Ejecutar tools (guardarLead, calificarLead, derivarHumano)
- Aplicar guardrails de salida
- Humanizar respuestas (limpiar símbolos, partir en `|||`)
- Enviar mensajes por el canal
- Watchdog de 3 niveles (con `node-cron` para el diario)
- Outbox poller (entrega mensajes de modo HUMAN con backoff)

**Tecnología:** Node 22 + TypeScript + `pg` + `openai` SDK contra OpenRouter + `@whiskeysockets/baileys` o `axios` (Evolution).

## Comunicación worker ↔ web (explícita)

Ambos procesos corren **en el mismo VPS** y hablan con la **misma DB Postgres local** directamente. No hay capa externa.

**Patrón actual (MVP):** polling cada 3s desde el dashboard a `/api/conversations` y `/api/messages/[id]`. Decisión consciente, documentada en `README.md` y en el código (comentario en `conversation-list.tsx`).

**Patrón futuro (PREPARADO pero no activo):** `LISTEN/NOTIFY` de Postgres. Los triggers ya están:

```sql
-- 001_initial_schema.sql
CREATE TRIGGER trg_notify_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_message_inserted();

CREATE TRIGGER trg_notify_outbox
  AFTER INSERT ON public.outbox
  FOR EACH ROW EXECUTE FUNCTION public.notify_outbox_inserted();
```

Emiten `pg_notify('kit_messages', payload)` y `pg_notify('kit_outbox', new_id)`. Para activarlo: crear endpoint SSE en Next.js que haga `LISTEN` y reemplazar polling por `EventSource` en el cliente. Ver `PENDIENTES.md` #10.

## Flujo de un mensaje entrante

```
1. Baileys WebSocket o webhook de Evolution recibe el mensaje
   ↓
2. handler.ts normaliza (LID → número real vía senderPn)
   ↓
3. INSERT en messages (trigger emite kit_messages)
   UPDATE conversations.last_message_at
   ↓
4. Filtros de entrada (en el worker):
   - Modo HUMAN? → guardar mensaje, no responder
   - Pausa global? → no responder
   - Flood >25 msgs/hora? → bloquear
   - Truncar a 1500 chars
   ↓
5. Buffer de agrupación (BUFFER_SECONDS, default 10s)
   Cada mensaje nuevo reinicia el timer
   ↓
6. Construir system prompt (system-prompt.ts):
   - Wrapper fijo (identidad + reglas de comunicación)
   - prompts/negocio.md (un único archivo)
   - Memoria del contacto (si reencuentro > 1h)
   - RAG context — PENDIENTE #2 (stub devuelve vacío)
   ↓
7. LLM con tool calling loop (openrouter.ts, max 5 turnos)
   Capturar texto de CUALQUIER turno (lesson #18 del original)
   ↓
8. Guardrails de salida (guardrails/index.ts):
   - Longitud >1600 chars → bloquear
   - Fuga de prompt (canary, secciones internas) → bloquear
   - Precios no autorizados (si ALLOWED_PRICES configurado) → bloquear
   - Hosts no autorizados (si ALLOWED_HOSTS configurado) → bloquear
   - Promesas de ingresos → bloquear
   - Si bloquea → GUARD_FALLBACK_MSG
   ↓
9. Humanizar (humanize/index.ts):
   - Limpiar símbolos (---, **, viñetas, comillas tipográficas)
   - Partir por ||| (max 5 mensajes)
   - Calcular retardo (700-3500ms según longitud)
   ↓
10. Enviar:
    - sendPresenceUpdate('composing')
    - delay
    - channel.sendText(jid, text)
    - INSERT en messages (role='assistant')
    - INSERT en usage (coste, tokens)
   ↓
11. Actualizar memoria:
    - contact_memory.last_seen_at
    - contact_memory.last_summary
```

## Sistema de Tools (lo que el LLM puede llamar)

| Tool | Cuándo la llama el LLM | Efecto |
|---|---|---|
| `guardarLead` | En cuanto tenga nombre/email/objetivo del lead | INSERT/UPDATE en tabla `leads` |
| `calificarLead` | Datos claros (objetivo + situación + dolor + urgencia) | UPDATE `conversations.lead_score` + `lead_temperature` |
| `derivarHumano` | Lead pide humano, problema grave, o no sabe responder | UPDATE `conversations.mode = 'HUMAN'` |

Las definiciones viven en `apps/worker/src/core/llm/tools/index.ts`. Los handlers validan datos (email regex, nombres no-placeholder) y persisten en la DB.

## Watchdog (3 niveles)

| Nivel | Cuándo | Qué hace |
|---|---|---|
| **1a — Bot mudo** | cada 5 min (`setInterval`) | Detecta conversaciones en modo AI con `last_message_at` entre 3 min y 2h, envía alerta |
| **1b — Saldo bajo** | cada 5 min | Llama a `https://openrouter.ai/api/v1/credits`, alerta si < $2 |
| **1c — Pico de fallbacks** | cada 5 min | Cuenta respuestas de emergencia en últimos 15 min, alerta si ≥3 |
| **2 — Auditoría diaria** | **cron 09:00** (`node-cron` dentro del proceso, no externo) | Genera parte con IA sobre conversaciones de las últimas 24h, lo guarda en `audit_log` (action='daily_audit') |
| **3 — Health check externo** | on-demand | `GET /api/health` para UptimeRobot |

**PENDIENTE #4**: las alertas se registran en `audit_log` y `logs`, pero **no se envían automáticamente** por WhatsApp/email. El operador debe consultarlas con SQL.

## Outbox (modo HUMAN + reintentos)

Cuando un humano responde desde el dashboard, el mensaje se inserta en `outbox` con `status='pending'`. El `OutboxPoller` (módulo aparte del Watchdog) lo recoge cada 2s.

**Orden de operaciones (CRÍTICO — bug #5 resuelto):**
1. `channel.sendText(jid, content)` (o `sendImage` para imágenes)
2. **Solo si el envío tiene éxito** → `UPDATE outbox SET status='sent', sent_at=now()` + INSERT en `messages` (role='human')
3. Si falla → mantener `pending`, incrementar `retry_count`, guardar `error`
4. Backoff exponencial: 5s → 10s → 20s → 40s (formula: `Math.pow(2, retry_count - 1) * 5` para `retry_count >= 1`)
5. Tras `MAX_RETRIES=5` → `status='failed'` (intervención manual)

**Tests:** `apps/worker/src/outbox/poller.test.ts` cubre el bug original, el caso de éxito, reintentos, max-retries, canal desconectado, jid faltante, y carga mixta (un item falla, los otros pasan).

## Seguridad

| Capa | Qué |
|---|---|
| **Auth dashboard** | Cookie HMAC con `crypto.timingSafeEqual` (constant-time), `SESSION_SECRET` obligatorio >= 32 chars con fail-fast al arrancar |
| **Guardrails entrada** | Truncado a 1500 chars, anti-flood (>25 msgs/hora) |
| **Guardrails salida** | Fuga de prompt (canary), secciones internas, precios no autorizados, hosts no permitidos, promesas de ingresos |
| **Canary anti-fuga** | String aleatorio en `prompts/negocio.md`; si el LLM lo escupe en una respuesta, el guardrail lo bloquea |
| **SQL injection** | Solo queries parametrizadas (`$1`, `$2`, ...) — la `pg` library no concatena |
| **Secrets** | `DATABASE_URL`, `SESSION_SECRET`, `OPENROUTER_API_KEY` nunca llegan al cliente (server-side only) |
| **HTTPS** | Obligatorio en producción (cookies con `secure: true` en NODE_ENV=production) |

## Decisiones arquitectónicas cerradas (no revertir)

1. **Single-tenant físico** (no multi-tenant con RLS) — la v2.0 lo intentó y se revirtió en v2.1. **NUNCA** introducir `tenant_id` ni RLS.
2. **Postgres self-hosted** (no Supabase SaaS) — cada VPS tiene su propia DB.
3. **Audit log por actor type** (no auth de usuarios) — solo hay un operador por instancia.
4. **`node-cron` dentro del worker** para auditoría diaria — no depende de cron externo por cliente.
5. **Polling 3s como decisión consciente** — la migración a LISTEN/NOTIFY es opt-in.

Ver `CHANGELOG.md` para el razonamiento completo de cada decisión.
