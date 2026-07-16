# Deploy a producción — Kit Agente WhatsApp v2.1

> Opciones de deploy según el tamaño del cliente. Recomendado: **Coolify en VPS único** para 1 cliente.

## Resumen de opciones

| Escenario | Recomendación |
|---|---|
| 1 cliente, VPS dedicado | **Coolify** (recomendado) |
| 1 cliente, máximo uptime / delegación de ops | Vercel (web) + Railway (worker) + Supabase |
| Multi-cliente (N instancias) | N VPS Coolify, ningún recurso compartido |
| Cliente con volumen muy alto | Coolify con VPS KVM 4 (16 GB RAM) |

## Opción A — Coolify (recomendado para single-tenant)

Coolify es un panel auto-hospedado tipo Heroku. Open Source. Corre en cualquier VPS.

### 1. Contratar VPS

| Plan | RAM | vCPU | Coste | Capacidad |
|---|---|---|---|---|
| KVM 1 | 4 GB | 1 | 5,49 €/mes | Cliente bajo volumen |
| KVM 2 | 8 GB | 2 | 7,99 €/mes | Cliente medio |
| KVM 4 | 16 GB | 4 | 10,99 €/mes | Cliente alto |

Proveedor recomendado: Hostinger. Con código **JUANPE** = 10% descuento.

### 2. Instalar Coolify

```bash
# En el VPS (Ubuntu 22+)
curl -sSL https://coolify.io/install.sh | bash
```

Acceder a `http://<ip-vps>:8000` y completar el setup inicial (crear admin user).

### 3. Crear servicio Postgres con pgvector

En Coolify:
- New Resource → Database → PostgreSQL
- Nombre: `kit-db`
- Versión: **16** (importante para `pgvector`)
- **Habilitar `pgvector`**: en "Init Scripts" añadir:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- Anotar la `DATABASE_URL` resultante (formato: `postgresql://kit:<password>@kit-db:5432/kit`)

### 4. Subir el código a Git

```bash
# En local
git init
git add .
git commit -m "Initial"
git remote add origin git@github.com:tu-usuario/kit-agente-whatsapp.git
git push -u origin main
```

### 5. Crear app Next.js (web)

En Coolify:
- New Resource → Application → Public/Private Repository (GitHub)
- Repo: el de arriba
- Branch: `main`
- Build Pack: **Dockerfile** (recomendado, da control total) o Nixpacks
- Puerto: **3000**
- Health check path: `/api/health`

En "Environment Variables" añadir TODAS las del `.env.example` con valores reales:

```
DATABASE_URL=postgresql://kit:<password>@kit-db:5432/kit
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$12$...
SESSION_SECRET=<openssl rand -hex 32>
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini
WHATSAPP_CHANNEL=baileys
BAILEYS_SESSION_PATH=/app/apps/worker/auth
APP_URL=https://cliente.tudominio.com
```

### 6. Crear app worker (separada, recomendado para producción)

- New Resource → Application → mismo repo
- Build Pack: Dockerfile
- Comando: `pnpm start:worker`
- **Volúmenes persistentes** (CRÍTICO para no perder la sesión de Baileys):

| Mount path | Guarda | Sin esto... |
|---|---|---|
| `/app/apps/worker/auth` | Sesión Baileys (credenciales) | Re-escanear QR en cada redeploy |
| `/app/apps/worker/data` | (opcional) cache local | Se regenera en cada redeploy |

- Sin puerto expuesto (es proceso background, no sirve HTTP público)

### 7. Aplicar las migraciones (desde tu local)

```bash
# Variable temporal con la URL remota
export DATABASE_URL="postgresql://kit:<password>@<ip-vps>:5432/kit"

psql $DATABASE_URL -f postgres/migrations/001_initial_schema.sql
psql $DATABASE_URL -f postgres/migrations/002_helper_functions.sql
```

(Si el puerto 5432 no está expuesto públicamente, puedes hacerlo desde el panel de Coolify → "Execute" en el servicio Postgres, o vía un job one-shot temporal.)

### 8. Configurar dominio y SSL

En Coolify:
- Settings de la app `web` → Domains
- Añadir `cliente.tudominio.com`
- SSL automático con Let's Encrypt (botón "Generate")
- DNS: A record `cliente` → IP del VPS

### 9. Proteger el dashboard (CRÍTICO en producción)

Por defecto el dashboard tiene login propio (cookie HMAC). Para producción añade una capa más. **Tres opciones** de mayor a menor esfuerzo:

#### Opción 1 — Tailscale (recomendado para L&L admin)

```bash
# En el VPS
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
```

- Creas una red Tailscale (gratis hasta 100 dispositivos)
- Solo los nodos autorizados pueden acceder al dashboard
- El dashboard NO se expone públicamente (no abras puerto 3000 al firewall)
- L&L puede administrar remotamente

#### Opción 2 — Cloudflare Access

1. Dominio en Cloudflare (cambiar nameservers)
2. Zero Trust → Access → Applications → Add
3. Policy: Allow tu email
4. Identity Provider: One-time PIN (sin configurar OAuth)
5. Todos los accesos requieren email OTP

#### Opción 3 — Basic Auth vía Caddy

```caddyfile
# /etc/caddy/Caddyfile
cliente.tudominio.com {
    basicauth {
        admin $2a$14$<hash-bcrypt-de-tu-pass>
    }
    reverse_proxy localhost:3000
}
```

Genera el hash: `caddy hash-password`. Caddy se reinicia automáticamente con `systemctl restart caddy`.

### 10. Verificar el deploy

```bash
# Health check
curl https://cliente.tudominio.com/api/health
# → {"status":"ok","mode":"single-tenant",...}

# Conectar WhatsApp
# 1. Abrir https://cliente.tudominio.com/login en el navegador
# 2. Login con ADMIN_USERNAME y contraseña
# 3. Ir a /settings → ver QR
# 4. Escanear desde WhatsApp Business

# Probar mensaje
# Desde otro móvil, enviar "Hola" al WhatsApp Business. El bot responde.
```

## Opción B — Vercel + Railway

Útil solo si quieres delegar la infraestructura o necesitas máximo uptime.

**Limitación importante:** Vercel no permite conexiones WebSocket persistentes (Baileys no funciona). Esta opción **solo funciona con `WHATSAPP_CHANNEL=evolution`**.

### Vercel para `apps/web`

```bash
cd apps/web
vercel
```

Configurar env vars en el panel de Vercel. **Build command**: `cd ../.. && pnpm install && cd apps/web && pnpm build`. **Output dir**: `.next`.

### Railway para `apps/worker`

1. Crear servicio desde el repo
2. Comando de start: `pnpm --filter @kit/worker start`
3. Provisionar Postgres (Railway tiene add-on)
4. **Volumen persistente** para `/app/apps/worker/auth` (necesita plan con volúmenes)
5. Configurar webhook en Evolution: `https://<railway-worker-url>/api/webhooks/evolution`

### Limitaciones
- WebSocket persistente no soportado en Vercel → forzado a Evolution API
- Volúmenes persistentes requieren plan Pro en Railway
- Más caro que Coolify para un solo cliente

## Volúmenes persistentes — qué montar y por qué

| Mount path | Por qué | Si no lo montas... |
|---|---|---|
| `/app/apps/worker/auth` | Credenciales de Baileys (token de sesión cifrado en disco) | Cada redeploy pide nuevo QR — molesto para el operador |
| `/app/apps/worker/data` | (opcional) cache local del worker | Se regenera — no rompe nada, solo tarda más en arrancar |

**NUNCA montar `/app/postgres/`** en producción — Coolify ya monta el volumen de Postgres internamente.

## Backups automáticos

```bash
# Cron en el VPS (3am diario)
0 3 * * * pg_dump $DATABASE_URL | gzip > /backups/kit-$(date +\%F).sql.gz

# Borrar backups >30 días
0 4 * * * find /backups -name "kit-*.sql.gz" -mtime +30 -delete
```

**Importante**: el backup es del estado de la conversación. La sesión de Baileys (volumen) se preserva aparte.

## Monitoreo

| Señal | Cómo |
|---|---|
| Worker vivo | `GET /api/health` → UptimeRobot (gratis, recomendado) |
| Coste IA | `SELECT SUM(cost_usd) FROM usage WHERE created_at >= date_trunc('month', now())` |
| Alertas watchdog | **PENDIENTE #4** — por ahora: `SELECT * FROM audit_log WHERE action='watchdog_alert' ORDER BY created_at DESC` |
| Errores 5xx | Logs de Next.js → Sentry (opcional) |

## Costes por instancia

| Concepto | Coste |
|---|---|
| VPS Hostinger KVM 1 | 5,49 €/mes |
| Postgres (Coolify) | 0 € (incluido) |
| OpenRouter (50-100 leads/día) | 2-5 €/mes |
| Dominio + SSL Let's Encrypt | 1-2 €/mes |
| **Total por instancia** | **~8-12 €/mes** |

## Post-deploy checklist

- [ ] Health check responde 200
- [ ] QR aparece y se puede escanear
- [ ] Bot responde a mensajes de prueba
- [ ] Monitor externo (UptimeRobot) configurado
- [ ] Backups automáticos de Postgres configurados
- [ ] Dashboard protegido con Tailscale / Cloudflare Access / Basic Auth
- [ ] DNS resuelve correctamente
- [ ] `prompts/negocio.md` personalizado con la info del cliente

## Próximo paso

- **Operación día a día**: `OPERATIONS.md`
- **Alta de cliente nuevo**: `CLIENT-SETUP.md`
