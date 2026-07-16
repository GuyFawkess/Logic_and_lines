# Pendientes — Kit Agente WhatsApp v2.1

> Trabajo conocido que quedó sin implementar en esta entrega. Documentado para que no se pierda entre versiones.
> Se listan en orden de prioridad (mayor impacto primero).

---

## 1. PDF → chunking → embeddings (RAG ingest) — **NO IMPLEMENTADO**

**Falta**: endpoint `POST /api/knowledge/pdf` que reciba un PDF, extraiga el texto, lo fragmente en chunks, genere embeddings y los inserte en `knowledge_chunks`.

**Razón de no estar hecho**: requiere librería de extracción de texto de PDF (`pdf-parse`, `pdfjs-dist` o similar — `pdf-parse` es la más simple, ~5MB sin nativas). Estrategia de chunking a definir (recomiendo: chunks de 800-1200 chars con overlap de 100-200, similar al patrón de `api/knowledge/text`). Llamada a `text-embedding-3-small` de OpenAI. INSERT con el vector `::vector` y `match_threshold = 0.7`.

**Workaround actual**: el usuario sube el contenido del PDF manualmente vía `/api/knowledge/text` (pega el texto en el dashboard). No es ideal pero funciona para PDFs cortos.

**Estimación**: 2-3 horas de trabajo incluyendo tests.

---

## 2. RAG activo en el worker (búsqueda en cada mensaje) — **STUB**

**Estado**: `apps/worker/src/core/llm/system-prompt.ts:118-138` (`searchKnowledge()`) devuelve siempre string vacío `''`. El comentario dice que la llamada a embeddings + `match_knowledge()` está pendiente.

**Impacto**: el bot NO consulta la knowledge base al responder, aunque haya contenido en `knowledge_chunks`. La columna `embedding vector(1536)` y la función SQL `match_knowledge()` ya están creadas y operativas, pero el worker no las usa.

**Fix mínimo**:
1. Crear helper `getEmbedding(text: string): Promise<number[]>` que llame a `https://api.openai.com/v1/embeddings` con `text-embedding-3-small`
2. En `searchKnowledge()`: generar embedding del query, llamar a `SELECT * FROM match_knowledge($1, 0.7, 5)`, devolver `rows.map(r => r.content).join('\n---\n')`
3. Manejar el caso de `OPENAI_API_KEY` no configurada (devolver '' + log)

**Estimación**: 1-2 horas.

---

## 3. Knowledge base: URL scraper y text endpoint — **STUBS**

**`/api/knowledge/url`** (`apps/web/app/api/knowledge/url/route.ts`): solo devuelve `{ note: 'TODO' }`. Falta implementar fetch HTTP, extracción de texto (recomiendo `cheerio` para HTML o `mozilla/readability` para contenido principal), limpieza, chunking, embeddings, INSERT.

**`/api/knowledge/text`** (`apps/web/app/api/knowledge/text/route.ts`): chunking hecho, pero la llamada a OpenAI embeddings + INSERT en `knowledge_chunks` es un stub que solo cuenta los chunks.

**Dependencia**: bloqueado por #2 (necesitamos el helper de embeddings).

**Estimación**: 2-4 horas (URL scraper) + 1 hora (completar text).

---

## 4. Watchdog: envío real de alertas WhatsApp — **STUB**

**`apps/worker/src/watchdog/index.ts:243-254`** (`sendAlert()`): tiene un TODO literal "integrar envío cuando haya canal". La alerta se guarda en `audit_log` pero **no se envía** al `ALERT_WHATSAPP` configurado.

**Impacto**: las alertas del watchdog (bot mudo, saldo bajo, pico de fallbacks, parte diario) NO llegan al dueño. Solo quedan en logs + `audit_log` (visibles desde el dashboard si se añade una vista).

**Fix mínimo**:
- Reusar el canal WhatsApp ya conectado (Baileys o Evolution)
- Si `ALERT_WHATSAPP` está configurado, enviar el mensaje con `channel.sendText()`
- Si no, no hacer nada (comportamiento actual: solo log)

**Riesgo**: si el canal está caído, las alertas tampoco — se debería tener un canal secundario (email, webhook, etc.). Para v1 es aceptable.

**Estimación**: 30 min.

---

## 5. Watchdog: outbox polling marca como sent sin enviar — **BUG SILENCIOSO**

**`apps/worker/src/watchdog/index.ts:199-228`** (`startOutboxPolling()`): itera mensajes pendientes en `outbox`, hace `UPDATE outbox SET status = 'sent'`, pero **nunca llama al canal** para enviarlos de verdad.

**Impacto**: cuando un humano envía un mensaje desde el dashboard (modo HUMAN), el row se inserta en `outbox` con `status='pending'`, y a los 2s el polling lo marca como `'sent'` SIN enviarlo. **El mensaje nunca llega al lead.**

**Fix**: en el bucle, llamar a `channel.sendText(item.jid, item.content)` antes de marcar como sent. Si falla, incrementar `retry_count` y guardar `error`.

**Severidad**: ALTA — la feature de "modo HUMAN" está rota silenciosamente en producción. Es el último ítem a tocar antes de desplegar a un cliente real con conversaciones en modo humano.

**Estimación**: 15-30 min.

---

## 6. Dockerfile para Coolify — **NO EXISTE**

**`docs/03-despliegue.md`** recomienda "Build Pack = Dockerfile" como preferred option, pero **no hay `Dockerfile` en la raíz del monorepo**. Solo existen los package.json, tsconfig y código fuente.

**Workaround actual**: usar `Nixpacks` (auto-detecta Node y `pnpm`), o crear los Dockerfiles manualmente antes de desplegar.

**Mínimo a entregar**:
- `Dockerfile` raíz (multi-stage: build deps → build web + worker → runtime con solo dist)
- `Dockerfile.worker` (alternativa si se quiere separar web y worker en dos apps Coolify, como recomienda `docs/03-despliegue.md` sección 10)
- `.dockerignore` raíz

**Estimación**: 1-2 horas (incluyendo test local con `docker build`).

---

## 7. Tests unitarios e integración — **NO IMPLEMENTADOS**

`vitest` está instalado como devDependency (heredado del setup del monorepo), pero **no hay un solo test escrito**. Áreas críticas sin cubrir:

- `core/guardrails` (lógica de seguridad — la más importante)
- `core/llm/system-prompt` (construcción del prompt)
- `core/humanize` (limpieza de texto)
- `db/postgres` queries
- `core/llm/tools` (handlers de tools)
- API routes críticas (`auth`, `conversations`, `messages`)

El `scripts/redteam.ts` existe pero es un test runner manual, no se ejecuta en CI.

**Estimación**: 1 día completo de trabajo para cubrir el 80% del código crítico.

---

## 8. `setup-cliente.ts`: shell cross-platform — **FRÁGIL**

**`scripts/setup-cliente.ts`** usa `execSync` con paths hardcoded tipo `'./apps/worker/src/db/postgres.js'`. Asume bash-style. **No funciona en Windows PowerShell** (que es el shell por defecto de este proyecto según el entorno del usuario).

**Fix**: reescribir el script en TypeScript nativo usando `import` directo en vez de `execSync` con `node -e "..."`. La lógica es trivial: importar `setSetting` de `apps/worker/src/db/postgres.js` y llamarlo.

**Estimación**: 30 min.

---

## 9. Auth: rate limiting en login — **NO IMPLEMENTADO**

**`apps/web/app/api/auth/login/route.ts`**: el endpoint acepta login sin rate limiting. Un atacante con la URL del dashboard puede intentar brute-force `ADMIN_PASSWORD_HASH` (aunque bcrypt con cost=12 lo hace caro: ~250ms por intento, 4/s por core).

**Fix mínimo**: middleware que cuente intentos fallidos por IP en los últimos 5 minutos y bloquee tras N (ej. 10). Estado puede vivir en memoria o en una tabla `login_attempts` (preferible esto último para multi-instancia).

**Severidad**: MEDIA. Aceptable para MVP detrás de Tailscale o Cloudflare Access. No aceptable si el dashboard se expone a internet sin protección adicional.

**Estimación**: 2-3 horas.

---

## 10. Migración polling → LISTEN/NOTIFY en el dashboard — **PREPARADO PERO NO ACTIVO**

Los triggers `trg_notify_message` y `trg_notify_outbox` están en `postgres/migrations/001_initial_schema.sql` y emiten `pg_notify('kit_messages', payload)` con cada INSERT. El dashboard sigue usando polling 3s (`apps/web/components/chat/conversation-list.tsx:30`).

**Tradeoff documentado en `docs/00-arquitectura.md`**: el polling 3s es una decisión consciente para MVP. La migración a `LISTEN/NOTIFY` vía SSE (Server-Sent Events) está pendiente.

**Fix**:
1. Crear `app/api/stream/messages/route.ts` que haga `LISTEN kit_messages` y emita SSE
2. En el cliente, reemplazar `setInterval(load, 3000)` por `new EventSource('/api/stream/messages')`
3. Mantener el polling como fallback si la conexión SSE se cae

**Estimación**: 3-4 horas (incluyendo reconexión automática en cliente).

---

## 11. Outbox: vista y reintento manual de items `failed` — **NO IMPLEMENTADO**

Tras el fix del bug #5, los items del outbox que agoten los 5 reintentos pasan a `status='failed'` y se quedan ahí indefinidamente. El operador del dashboard no tiene forma de verlos ni de reintentarlos desde la UI: solo puede hacerlo a mano con `psql`.

**Por qué importa**: si WhatsApp está caído durante >20 minutos (5 reintentos × 4-40s = ~5-6 min en el peor caso, más realista ~10-15 min con canales lentos), el item pasa a `failed` y el operador no se entera. Sin la vista, el lead se queda sin respuesta y el operador no lo sabe hasta que el lead reclame.

**Workaround actual** (SQL a mano, documentar en `docs/05-errores-comunes.md` si se decide no hacerlo en UI):

```sql
-- 1. Ver items fallidos
SELECT o.id, o.conversation_id, o.content, o.retry_count, o.error, o.created_at
FROM outbox o
WHERE o.status = 'failed'
ORDER BY o.created_at DESC;

-- 2. Reintentar uno específico
UPDATE outbox
SET status = 'pending', retry_count = 0, error = NULL
WHERE id = '<id>';

-- 3. Reintentar todos los fallidos (cuidado: hacerlo cuando el canal esté sano)
UPDATE outbox
SET status = 'pending', retry_count = 0, error = NULL
WHERE status = 'failed';
```

El item volverá a procesarse en el próximo tick del poller (≤2s).

**Fix mínimo** (cuando se implemente):
1. Nueva página `/outbox` (o sección dentro de `/chats`) que liste items por estado: `pending`, `failed`, `sent`
2. Para los `failed`: mostrar el error guardado, permitir "Reintentar" con un click (POST a `/api/outbox/[id]/retry` que haga el `UPDATE` del paso 2)
3. Para los `pending`: mostrar cuántos reintentos lleva, cuándo será el próximo intento
4. En el home dashboard, añadir contador "X items fallidos en outbox" con link a la lista

**Severidad**: BAJA mientras no haya clientes activos (los `failed` no se acumulan). MEDIA-ALTA en cuanto haya >1 cliente en producción: si WhatsApp se cae de madrugada, el operador necesita ver el impacto al día siguiente.

**Estimación**: 2-3 horas (página + endpoint + integrar en sidebar/home).

---

## Cómo trabajar con esta lista

Cuando se aborde cualquiera de estos puntos:

1. Crear rama `fix/<numero>-<descripcion-corta>` (ej. `fix/05-outbox-send-real`)
2. Marcar el ítem en este archivo con `~~tachado~~` cuando esté hecho y moverlo a `CHANGELOG.md`
3. Si un ítem se subdivide en varios más pequeños, listarlos aquí
4. Revisar este archivo en cada sesión: lo que no se mueve, se queda como recordatorio activo

---

*Última actualización: 2026-07-13 — kit v2.1 antes de dar por cerrado.*
