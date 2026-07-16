# Alta de un cliente nuevo — Kit Agente WhatsApp v2.1

> Cada cliente = una **instancia nueva** del kit en su propio VPS. NO hay atajos.
> Esta guía explica los pasos exactos para dar de alta un cliente nuevo desde cero.

## Resumen del proceso

1. **VPS** → aprovisionar nuevo (Hostinger KVM 1 = 5,49 €/mes)
2. **Coolify** → instalar, crear servicio Postgres con pgvector
3. **Código** → clonar el repo en el VPS
4. **Migraciones** → aplicar las 2 SQL a la DB del cliente
5. **Env vars** → rellenar `.env` con los valores del cliente
6. **Apps Coolify** → desplegar web + worker
7. **Volúmenes** → montar `/app/apps/worker/auth` (CRÍTICO para Baileys)
8. **DNS** → apuntar `cliente.tudominio.com` al VPS
9. **SSL** → Let's Encrypt automático en Coolify
10. **Proteger dashboard** → Tailscale / Cloudflare Access / Basic Auth
11. **Prompt del negocio** → `prompts/negocio.md` con la info del cliente
12. **WhatsApp** → escanear QR desde `/settings`
13. **Probar** → enviar mensaje desde otro móvil
14. **Handover** → entregar al cliente con credenciales del dashboard

**Tiempo estimado:** 30-60 min para la primera vez; 20-30 min cuando ya tienes práctica.

## Paso 1 — Aprovisionar VPS

Recomendado: **Hostinger KVM 1** (5,49 €/mes) para clientes con tráfico bajo-medio.

- Contratar en https://www.hostinger.com (usar código **JUANPE** para 10% descuento)
- Elegir Ubuntu 22+ LTS
- Anotar la IP del VPS

## Paso 2 — Instalar Coolify

Conectar por SSH al VPS y ejecutar:

```bash
curl -sSL https://coolify.io/install.sh | bash
```

Acceder a `http://<ip-vps>:8000` desde el navegador y completar el setup inicial (crear admin user).

## Paso 3 — Crear servicio Postgres

En Coolify:
- New Resource → Database → PostgreSQL
- Nombre: `kit-db-<cliente-slug>` (ej. `kit-db-tienda-lobo`)
- Versión: **16**
- En "Init Scripts" añadir:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- Anotar la `DATABASE_URL` resultante

## Paso 4 — Subir el código a Git (una sola vez)

Este paso se hace **una vez** en tu local, no por cliente. Si ya lo hiciste, sáltalo.

```bash
cd /path/a/kit-agente-whatsapp
git init
git add .
git commit -m "Initial"
git remote add origin git@github.com:tu-usuario/kit-agente-whatsapp.git
git push -u origin main
```

## Paso 5 — Desplegar en Coolify

Para cada cliente nuevo:

### 5.1 — Crear app `web`

- New Resource → Application → Public/Private Repository
- Repo: el de arriba
- Branch: `main`
- Build Pack: **Dockerfile**
- Puerto: **3000**
- Domain: `cliente.tudominio.com` (se configura SSL después)
- Health check: `/api/health`

### 5.2 — Crear app `worker`

- Mismo repo
- Build Pack: Dockerfile
- **Comando**: `pnpm start:worker`
- **Sin puerto expuesto** (es proceso background)
- **Volumen persistente** (CRÍTICO):
  - Mount path: `/app/apps/worker/auth`
  - Esto preserva la sesión de Baileys entre redeploys

### 5.3 — Variables de entorno (en ambas apps)

| Variable | Valor para el cliente |
|---|---|
| `DATABASE_URL` | La del paso 3 (mismo valor en web y worker) |
| `ADMIN_USERNAME` | `admin` o el que el cliente quiera |
| `ADMIN_PASSWORD_HASH` | bcrypt de la contraseña — **generar una por cliente** |
| `SESSION_SECRET` | **uno por cliente** — `openssl rand -hex 32` |
| `OPENROUTER_API_KEY` | La cuenta puede ser compartida entre clientes (recomendado al inicio) o una propia por cliente |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` (default) |
| `WHATSAPP_CHANNEL` | `baileys` (default) o `evolution` |
| `BAILEYS_SESSION_PATH` | `/app/apps/worker/auth` |
| `APP_URL` | `https://cliente.tudominio.com` |
| `NODE_ENV` | `production` |

**Por qué un SESSION_SECRET por cliente**: si todos comparten el mismo, en un redeploy todas las sesiones se invalidan a la vez. Con uno por cliente, esto es independiente.

### 5.4 — Aplicar migraciones (desde tu local o desde Coolify)

```bash
export DATABASE_URL="postgresql://kit:<password>@<ip-vps>:5432/kit"

psql $DATABASE_URL -f postgres/migrations/001_initial_schema.sql
psql $DATABASE_URL -f postgres/migrations/002_helper_functions.sql
```

Si el puerto 5432 no está expuesto, hacerlo desde el panel de Coolify del servicio Postgres → "Execute" → pegar el SQL.

## Paso 6 — DNS

En el proveedor del dominio del cliente (Cloudflare, Namecheap, etc.):
- A record `cliente` (o `@` si es el dominio principal) → IP del VPS
- TTL bajo (300s) para iterar rápido

## Paso 7 — SSL

En Coolify, en la app `web`:
- Settings → Domains
- Verificar que `cliente.tudominio.com` resuelve
- Click "Generate" o "Force SSL"
- Esperar 1-2 minutos al certificado Let's Encrypt

## Paso 8 — Proteger el dashboard

Por defecto el dashboard tiene su propio login (cookie HMAC). En producción añade una capa más (ver `DEPLOY.md` sección 9 para detalle):

**Recomendado para clientes finales:** Cloudflare Access (email OTP).

**Recomendado para ti como L&L admin:** Tailscale.

## Paso 9 — Personalizar `prompts/negocio.md`

Una vez que la instancia esté corriendo:

1. Conectar al VPS (vía Coolify "Execute" o SSH)
2. Editar `prompts/negocio.md` con la información del cliente:
   - Nombre comercial
   - Productos / servicios con precios
   - FAQs
   - Tono
   - Enlaces (pago, calendly, etc.)
3. El worker recarga el prompt automáticamente en el siguiente mensaje (no requiere reinicio)

Ver `CONFIG.md` sección "Personalizar el prompt del negocio" para el detalle.

## Paso 10 — Conectar WhatsApp

1. Abrir `https://cliente.tudominio.com/login`
2. Login con `ADMIN_USERNAME` y la contraseña del paso 5.3
3. Ir a **Ajustes** → ver QR
4. Escanear desde el WhatsApp Business del cliente (Configuración → Dispositivos vinculados → Vincular dispositivo)
5. Esperar 5-10s. El estado debe pasar a `connected` con el número visible

## Paso 11 — Probar

Desde otro móvil:
1. Enviar "Hola" al WhatsApp Business del cliente
2. Esperar 10-15s (10s de buffer + procesamiento LLM)
3. El bot debe responder presentándose
4. Probar 2-3 preguntas típicas
5. Verificar que el bot usa los precios y enlaces correctos del prompt

## Paso 12 — Handover al cliente

Entregar al cliente:
- URL del dashboard: `https://cliente.tudominio.com`
- `ADMIN_USERNAME`
- Contraseña (NO el hash)
- Acceso a Tailscale (si aplica) o instrucciones para Cloudflare Access

**IMPORTANTE:** Entregar la contraseña en un canal seguro (1Password, Bitwarden, signal — NO email plano). Y recordarles:
- La contraseña se cambia con `node -e "console.log(require('bcryptjs').hashSync('nueva-pass', 12))"` y actualizando `ADMIN_PASSWORD_HASH` en Coolify
- El `SESSION_SECRET` también puede rotarse (invalidará todas las sesiones, hay que volver a login)
- Los datos viven en la DB Postgres del VPS — hay backups automáticos

## Anti-patrones (NO hacer)

- ❌ **NO** desplegar dos clientes en el mismo VPS "para ahorrar" — vuelve a multi-tenant en la práctica
- ❌ **NO** compartir `SESSION_SECRET` entre clientes — invalida sesiones en redeploys
- ❌ **NO** compartir `OPENROUTER_API_KEY` sin tracking de gasto — un cliente puede gastar el presupuesto de todos
- ❌ **NO** modificar las migraciones después de aplicadas en producción — crear nueva migración
- ❌ **NO** usar el mismo `prompts/negocio.md` para dos clientes — cada uno tiene su propia DB y su propio archivo

## Próximo nivel (cuando escales)

- **Script de provisioning** que automatice los pasos 5-10 con variables
- **Backup centralizado opcional**: cada instancia envía snapshots a un Postgres nuestro (Logic & Lines) para DR y visión agregada. Ese SÍ lleva `cliente_id`. PENDIENTE.
- **Monitoring centralizado**: cada instancia reporta health a nuestro Prometheus. PENDIENTE.

## Siguiente paso

- **Operación día a día**: `OPERATIONS.md`
- **Problemas técnicos**: `OPERATIONS.md` sección Troubleshooting
