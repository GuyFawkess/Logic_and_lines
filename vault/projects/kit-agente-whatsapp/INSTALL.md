# Instalación — Kit Agente WhatsApp v2.1

> Guía paso a paso para tener una instancia corriendo en local en 30 minutos.
> Para producción ver `DEPLOY.md`.

## Requisitos

- **Node.js 22+** — https://nodejs.org
- **pnpm 9+** — `npm install -g pnpm`
- **Postgres 15+ con `pgvector`** — local (Docker), o cloud (Supabase, Neon, RDS)
- **Cuenta OpenRouter** — https://openrouter.ai (cargar $5 mínimo)
- **WhatsApp Business** — un número que NO uses personalmente (recomendado uno nuevo)

## 1. Clonar e instalar

```bash
git clone <repo-del-kit> kit-agente-whatsapp
cd kit-agente-whatsapp
pnpm install
```

Si `pnpm install` falla con `reify/rollback`:
```bash
rm -rf node_modules
pnpm install
```

## 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus valores reales. Mínimo viable:

```bash
# --- Postgres (obligatorio) ---
DATABASE_URL=postgresql://kit:tu-password@localhost:5432/kit
DB_POOL_MAX=10

# --- OpenRouter (obligatorio) ---
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_HTTP_REFERER=http://localhost:3000
OPENROUTER_APP_NAME=Kit Agente WhatsApp (local)

# --- Auth del dashboard (obligatorio) ---
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$12$xxxx...   # ver paso 2.1
SESSION_SECRET=                       # OBLIGATORIO, mínimo 32 chars, ver paso 2.2
SESSION_TTL_HOURS=168                 # 7 días

# --- WhatsApp ---
WHATSAPP_CHANNEL=baileys              # o 'evolution'
BAILEYS_SESSION_PATH=./apps/worker/auth

# --- App ---
NODE_ENV=development
LOG_LEVEL=info
PORT=3000
APP_URL=http://localhost:3000
```

### 2.1 Generar el hash de la contraseña

```bash
node -e "console.log(require('bcryptjs').hashSync('tu-password-aqui', 12))"
```

Copia el output (empieza por `$2a$12$...`) a `ADMIN_PASSWORD_HASH`.

### 2.2 Generar SESSION_SECRET

**OBLIGATORIO**, mínimo 32 caracteres. Si no está o es < 32 chars, el proceso **no arranca** (fail-fast explícito).

```bash
# Linux/macOS
openssl rand -hex 32

# Windows PowerShell
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -AsByte[])
```

Copia el output a `SESSION_SECRET`.

## 3. Levantar Postgres con pgvector

### Opción A — Docker local (recomendado para dev)

```bash
docker run -d --name kit-postgres \
  -e POSTGRES_USER=kit \
  -e POSTGRES_PASSWORD=tu-password \
  -e POSTGRES_DB=kit \
  -p 5432:5432 \
  -v kit_pgdata:/var/lib/postgresql/data \
  pgvector/pgvector:pg16
```

### Opción B — Postgres local sin Docker

Instala Postgres 16 y asegúrate de tener la extensión `pgvector`:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Opción C — Supabase / Neon / RDS

Crea un proyecto, anota la `DATABASE_URL` (con password) y aplica la migración manualmente.

## 4. Aplicar las migraciones

```bash
psql $DATABASE_URL -f postgres/migrations/001_initial_schema.sql
psql $DATABASE_URL -f postgres/migrations/002_helper_functions.sql
```

Deberías ver 12 tablas creadas: `connection_state`, `conversations`, `messages`, `leads`, `settings`, `knowledge_chunks`, `contact_memory`, `outbox`, `usage`, `audit_log`, `tenant_settings` (NO — esta se eliminó en v2.1, queda como `settings`).

Verificar:

```sql
\dt
```

Debe mostrar las 11 tablas + `pg_*` y `information_schema.*`.

## 5. Verificar el entorno

```bash
pnpm check
pnpm doctor
```

`pnpm doctor` debe imprimir `✓ Todo OK`. Si hay `✗`:
- `✗ DATABASE_URL` → vuelve al paso 2
- `✗ OpenRouter` → verifica `OPENROUTER_API_KEY`
- `✗ Tabla conversations no existe` → vuelve al paso 4
- `✗ SESSION_SECRET < 32 chars` → vuelve al paso 2.2

## 6. Configurar el prompt del negocio

`prompts/negocio.md` define cómo habla el bot. Si no existe:

```bash
pnpm setup
```

Esto genera el template. Después edítalo con la información del cliente (productos, precios, FAQs, tono, etc.). Ver `CONFIG.md` sección "Personalizar el prompt del negocio".

## 7. Arrancar

En una terminal:

```bash
pnpm dev
```

Esto arranca:
- `apps/web` (Next.js) en `http://localhost:3000`
- `apps/worker` (bot) en background

## 8. Conectar WhatsApp

1. Abre `http://localhost:3000` en el navegador
2. Inicia sesión con el `ADMIN_USERNAME` y la contraseña del paso 2.1
3. Ve a **Ajustes** — verás el QR (o el estado del canal)
4. Si ves QR: escanéalo desde WhatsApp Business del cliente (Configuración → Dispositivos vinculados → Vincular dispositivo)
5. Espera 5-10s. El estado debe pasar a `connected` con el número de teléfono visible

## 9. Probar

Desde otro móvil, envía un mensaje al WhatsApp Business del cliente. El bot debería responder en < 30s (más los 10s del buffer de agrupación).

## 10. Verificar el dashboard

- **Inicio**: contadores de conversaciones hoy, coste IA del mes, knowledge base
- **Conversaciones**: lista + chat con la conversación, toggle AI/HUMAN
- **Métricas**: mensajes por día, embudo de conversión
- **Knowledge**: chunks guardados (nota: la búsqueda RAG automática está PENDIENTE #2, el bot NO usa estos chunks todavía)
- **Ajustes**: modelo, temperatura, pausa global, branding

## Comandos útiles

```bash
# Solo web (sin worker)
pnpm --filter @kit/web dev

# Solo worker (sin dashboard)
pnpm --filter @kit/worker dev

# Build para producción
pnpm build

# Ver logs del worker en tiempo real
pnpm --filter @kit/worker dev | npx pino-pretty

# Tests del outbox poller
pnpm --filter @kit/worker test

# Tests de seguridad (guardrails)
pnpm redteam
```

## Troubleshooting

| Problema | Solución |
|---|---|
| `pnpm install` falla con `reify/rollback` | `rm -rf node_modules && pnpm install` |
| `ECONNREFUSED 127.0.0.1:5432` | Postgres no está corriendo o `DATABASE_URL` mal |
| `Cannot find module '@kit/shared'` | `pnpm install` en la raíz |
| `SESSION_SECRET` no está o es < 32 chars | Genera uno con `openssl rand -hex 32` y añádelo a `.env` |
| QR no aparece | Revisa el log del worker; debería decir "QR generado. Escanéalo desde WhatsApp." |
| Bot no responde | `pnpm doctor` + revisa logs del worker (`pino-pretty`) |
| Mensajes del modo HUMAN no salen al lead | **BUG #5 está resuelto**, pero verifica que el `OutboxPoller` está corriendo (debería aparecer en el log al arrancar) |

## Siguiente paso

- **Producción**: `DEPLOY.md`
- **Operación día a día**: `OPERATIONS.md`
- **Alta de cliente nuevo**: `CLIENT-SETUP.md`
