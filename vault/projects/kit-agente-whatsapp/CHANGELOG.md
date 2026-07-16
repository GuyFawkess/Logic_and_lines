# Changelog

Todos los cambios notables del Kit Agente WhatsApp.

## [2.1.0] - 2026-07-13

### Corrección de rumbo: SINGLE-TENANT (no multi-tenant)

**Decisión revertida**: la v2.0 introdujo multi-tenant con Supabase compartida + RLS. La v2.1
corrige esto: **cada cliente tiene su propia instancia completa del kit en su propio VPS
con su propia base de datos Postgres**. La separación entre clientes es **física**, no
lógica (RLS).

**Por qué se revierte:**
- Un bug en una política RLS o un incidente de DB puede filtrar datos entre clientes
- Un incidente de Supabase tumba a todos los clientes a la vez
- Ningún cliente grande puede exigir "mis datos en mi propia infraestructura" bajo multi-tenant
- Con VPS aislado, estos riesgos no existen estructuralmente

### Cambios principales

- **Postgres self-hosted en lugar de Supabase**
  - Driver `pg` directo (sin Supabase JS, sin RLS)
  - Cada instancia corre su propia DB (Coolify recomendado)
  - Directorio `supabase/` renombrado a `postgres/`

- **Eliminación de `tenant_id` y RLS**
  - 12 tablas reescritas sin `tenant_id` ni políticas RLS
  - `tenants` y `tenant_members` eliminadas
  - Las tablas son single-tenant por construcción

- **Rutas aplanadas**
  - Eliminado `/t/[slug]/` — ahora rutas planas: `/chats`, `/metrics`, `/knowledge`, `/settings`
  - Sin selector de tenants en el sidebar

- **Auth single-operator**
  - Eliminado signup (`/signup`)
  - Cookie HMAC + bcrypt en lugar de Supabase Auth
  - Un solo usuario por instancia (configurado en `.env`)
  - Middleware protege rutas excepto `/login` y webhooks

- **Watchdog auto-programado con node-cron**
  - Auditoría diaria se programa DENTRO del worker con `node-cron`
  - Eliminado `/api/cron/*` (ya no se necesita)
  - Simplifica el deploy: no requiere configurar cron externo por cliente

- **Worker ↔ web: mecanismo explícito**
  - Ambos procesos hablan con la misma DB local directamente
  - MVP: polling 3s desde el dashboard (decisión consciente, documentada)
  - Futuro: `LISTEN`/`NOTIFY` de Postgres — los triggers ya están listos
  - Triggers `trg_notify_message` y `trg_notify_outbox` en el schema

- **Script renombrado**
  - `new-tenant.ts` → `setup-cliente.ts` (wizard de alta de instancia, no gestor de tenants)

- **Redteam reorientado**
  - Ya no prueba fugas entre tenants (no existen)
  - Enfocado en jailbreak, prompt injection, fuga de system prompt, precios no autorizados

- **Pricing actualizado**
  - De "10 clientes en 1 VPS" a coste por VPS individual (~8-12 €/mes por instancia)
  - Documentación refleja el modelo de negocio real

### Lo que se mantiene de v2.0

- **Interfaz `WhatsAppChannel`** con Baileys y Evolution API — patrón correcto
- **9 lecciones heredadas del kit original** (versión de Baileys, `Browsers.macOS('Desktop')`, etc.)
- **shadcn/ui + Tailwind v4** para el dashboard
- **pgvector** para RAG — ahora en el Postgres local de cada VPS
- **Chatwoot opcional** y **n8n opcional** — ortogonales a multi-tenant vs single-tenant
- **Buenas prácticas de seguridad** — guardrails, canary, precios, hosts
- **Tool calling loop** del original — capturar texto de cualquier turno

### Migración desde v2.0

Si tienes v2.0 desplegada, NO intentes migrar in-place — el modelo es fundamentalmente
diferente. Para un cliente existente:

1. Provisiona un nuevo VPS
2. Despliega la v2.1
3. Migra datos (conversaciones, leads, knowledge) por SQL dump
4. Apunta el WhatsApp a la nueva instancia
5. Da de baja la v2.0

Si tienes 5 clientes en v2.0, son 5 nuevas instancias v2.1. Es el modelo de negocio correcto.

## [2.0.0] - 2026-07-13 (CORREGIDO en v2.1)

### ❌ Multi-tenant con Supabase + RLS (descartado)

Esta versión tomó la decisión de multi-tenant compartido. La v2.1 la corrige porque no
era el modelo de negocio. NO se recomienda usar v2.0.

**Por qué se documenta**: para que la decisión y su corrección queden explícitas en la
historia del proyecto, y para que no se repita el error.

## [1.0.0] - 2026-06-XX (kit original)

- Next.js 16 + Baileys + SQLite
- Single-tenant
- OpenRouter LLM
- Airtable CRM opcional
- Supabase REST para memoria
- Dashboard con QR, conversaciones, métricas
- Deploy EasyPanel/Hostinger
- 18 errores documentados
