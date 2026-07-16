# Operación día a día — Kit Agente WhatsApp v2.1

> Tareas de mantenimiento, troubleshooting, y diagnóstico para el operador de la instancia.

## Chequeo diario (5 minutos)

```bash
# 1. ¿El worker está corriendo?
ps aux | grep "kit.*worker" | grep -v grep
# Esperado: un proceso node corriendo apps/worker

# 2. ¿El health check responde?
curl -s https://cliente.tu-dominio.com/api/health | jq
# Esperado: {"status":"ok","mode":"single-tenant",...}

# 3. ¿Cuántas conversaciones hoy?
psql $DATABASE_URL -c "SELECT COUNT(*) FROM conversations WHERE last_message_at >= CURRENT_DATE"

# 4. ¿Cuánto IA hemos gastado este mes?
psql $DATABASE_URL -c "SELECT COALESCE(SUM(cost_usd), 0) FROM usage WHERE created_at >= date_trunc('month', now())"

# 5. ¿Hay items fallidos en el outbox? (intervención manual)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM outbox WHERE status='failed'"

# 6. ¿Alertas recientes del watchdog?
psql $DATABASE_URL -c "SELECT created_at, action, details FROM audit_log WHERE action IN ('watchdog_alert','daily_audit') ORDER BY created_at DESC LIMIT 5"
```

## Logs en tiempo real

```bash
# Logs del worker
journalctl -u kit-worker -f     # si está con systemd
docker logs -f kit-worker        # si está con docker
# O directamente:
pnpm --filter @kit/worker dev

# Logs del web
journalctl -u kit-web -f
docker logs -f kit-web
```

**Niveles de log** (variable `LOG_LEVEL`):
- `error`: solo errores
- `warn`: errores + advertencias (recomendado en producción)
- `info`: + eventos importantes (recomendado en dev)
- `debug`: + todo (solo para diagnosticar)

## Tareas periódicas

### Semanal

```bash
# Ver cuánto se ha gastado en OpenRouter y si queda saldo
curl -s https://openrouter.ai/api/v1/credits \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" | jq

# Verificar que el backup diario de Postgres se hizo
ls -lh /backups/kit-*.sql.gz | tail -5
```

### Mensual

```bash
# Coste total del mes
psql $DATABASE_URL -c "
  SELECT
    model,
    SUM(in_tokens) AS tokens_in,
    SUM(out_tokens) AS tokens_out,
    SUM(cost_usd)::numeric(10,2) AS cost_usd
  FROM usage
  WHERE created_at >= date_trunc('month', now())
  GROUP BY model
  ORDER BY cost_usd DESC
"

# Leads del mes
psql $DATABASE_URL -c "
  SELECT temperature, COUNT(*)
  FROM leads
  WHERE created_at >= date_trunc('month', now())
  GROUP BY temperature
"

# Churn del outbox (items que siguen pending tras mucho tiempo)
psql $DATABASE_URL -c "
  SELECT id, retry_count, error, created_at, age(now(), created_at)
  FROM outbox
  WHERE status = 'pending'
    AND created_at < now() - interval '1 hour'
  ORDER BY created_at
"
```

### Cuando se rota el número de WhatsApp

```bash
# 1. Borrar sesión de Baileys (fuerza reconexión con QR)
rm -rf apps/worker/auth/*

# 2. Reiniciar worker
docker restart kit-worker
# o
systemctl restart kit-worker

# 3. Ir a /settings en el dashboard, escanear nuevo QR
```

## Watchdog — qué hace y cómo consultarlo

### Lo que detecta automáticamente (cada 5 min)

| Detección | Cuándo se dispara | Dónde se registra |
|---|---|---|
| Bot mudo | Conversación en modo AI con `last_message_at` entre 3 min y 2h | `audit_log` (action='watchdog_alert', type='mute') |
| Saldo bajo OpenRouter | Saldo < $2 | `audit_log` (type='balance') |
| Pico de fallbacks | ≥3 mensajes de emergencia en 15 min | `audit_log` (type='fallback_spike') |

### Lo que hace cada día a las 09:00

Genera un parte diario con IA sobre las conversaciones de las últimas 24h y lo guarda en `audit_log`:

```sql
SELECT
  created_at,
  details->>'report' AS parte_diario,
  details->>'model' AS modelo,
  (details->>'cost')::numeric AS coste
FROM audit_log
WHERE action = 'daily_audit'
ORDER BY created_at DESC
LIMIT 1;
```

### **PENDIENTE #4**: el envío real de alertas (WhatsApp/email al operador) **NO está implementado**. Por ahora hay que consultar `audit_log` con SQL o revisar los logs del worker.

## Outbox — reintentos y modo HUMAN

### Ver el estado del outbox

```sql
-- Items pendientes
SELECT o.id, c.phone, c.name, o.message_type, o.retry_count, o.created_at
FROM outbox o
JOIN conversations c ON c.id = o.conversation_id
WHERE o.status = 'pending'
ORDER BY o.created_at;

-- Items fallidos (intervención manual)
SELECT o.id, c.phone, o.content, o.retry_count, o.error, o.created_at
FROM outbox o
JOIN conversations c ON c.id = o.conversation_id
WHERE o.status = 'failed'
ORDER BY o.created_at DESC;

-- Reintentar uno específico
UPDATE outbox SET status='pending', retry_count=0, error=NULL WHERE id='<id>';

-- Reintentar todos los fallidos (cuidado: hacerlo cuando el canal esté sano)
UPDATE outbox SET status='pending', retry_count=0, error=NULL WHERE status='failed';
```

### Cuándo un item pasa a `failed`

Tras 5 reintentos con backoff (5s, 10s, 20s, 40s) el `OutboxPoller` marca el item como `failed` y deja de intentar. Esto ocurre típicamente cuando:

- El número de WhatsApp se ha desconectado > 5 min
- El lead ha bloqueado el número
- El contenido del mensaje es rechazado por WhatsApp (muy raro)

**PENDIENTE #11**: no hay vista en el dashboard para ver/reintentar items fallidos — hay que hacerlo por SQL.

## Troubleshooting

### El bot no responde

```bash
# 1. ¿El worker está corriendo?
ps aux | grep "kit.*worker" | grep -v grep
# Si no, arrancarlo: systemctl start kit-worker

# 2. ¿Está conectado a WhatsApp?
psql $DATABASE_URL -c "SELECT status, phone, last_error FROM connection_state WHERE id=1"
# Si status='disconnected' o 'qr', ir a /settings y reconectar

# 3. ¿Está en pausa?
psql $DATABASE_URL -c "SELECT value FROM settings WHERE key='paused'"
# Si es 'true', quitar la pausa desde el dashboard

# 4. ¿El LLM responde? (verificar API key)
curl -s https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" | jq '.data[0].id'

# 5. ¿Hay errores en el log?
docker logs kit-worker --tail 200 | grep -i error
```

### El bot responde pero mal

- **Tono incorrecto**: editar `prompts/negocio.md` sección 11 (Tono y estilo)
- **Datos incorrectos**: editar sección 4 (Qué ofreces) o 5 (Precio, pago y garantía)
- **Filtra info legítima**: revisar `ALLOWED_PRICES` y `ALLOWED_HOSTS` en `.env` (si están vacíos, no se filtran)
- **Genera respuestas largas**: bajar `temperature` a 0.3-0.5

### Los mensajes del modo HUMAN no salen al lead

**Si este bug reaparece**, los tests están en `apps/worker/src/outbox/poller.test.ts` y deberían fallar. Para diagnosticarlo:

```bash
# 1. ¿El OutboxPoller está corriendo?
docker logs kit-worker | grep Outbox

# 2. ¿Hay items en pending con error?
psql $DATABASE_URL -c "SELECT id, error, retry_count, last_update FROM outbox WHERE status='pending' AND error IS NOT NULL"

# 3. ¿El canal está conectado?
psql $DATABASE_URL -c "SELECT status FROM connection_state WHERE id=1"
# Si no está 'connected', el poller deja el item pending sin reintentar
```

### Errores de Baileys recurrentes

| Error | Causa | Solución |
|---|---|---|
| Code 405 | Baileys desactualizado | `pnpm update @whiskeysockets/baileys` |
| Code 440 loop | Fingerprint detectado | Ya mitigado en código (Browsers.macOS('Desktop')) |
| Code 401 | LoggedOut — credenciales muertas | Borrar `apps/worker/auth/*` y re-escanear QR |
| Code 515 | Pairing OK (NO es error) | Ignorar |
| Sesión perdida en deploy | Falta volumen persistente en Coolify | Configurar mount `/app/apps/worker/auth` |

### Performance — bot lento

- **Buffer demasiado alto**: bajar `BUFFER_SECONDS` a 5
- **Modelo lento**: cambiar a `openai/gpt-4o-mini` (default, barato y rápido)
- **Temperature alta**: bajar a 0.3 para respuestas más deterministas y rápidas
- **Postgres lento**: revisar índices, considerar upgrade de plan

## Reset de emergencia (cuando todo falla)

```bash
# 1. Backup del estado actual
pg_dump $DATABASE_URL > /tmp/backup-emergencia-$(date +%F).sql

# 2. Pausar el bot
psql $DATABASE_URL -c "UPDATE settings SET value='true'::jsonb WHERE key='paused'"

# 3. Reconectar WhatsApp
rm -rf apps/worker/auth/*
docker restart kit-worker
# Escanear QR desde /settings

# 4. Reactivar el bot
psql $DATABASE_URL -c "UPDATE settings SET value='false'::jsonb WHERE key='paused'"

# 5. Probar
# Enviar "Hola" desde otro móvil. El bot debe responder.
```

## Métricas de salud (KPIs del operador)

| KPI | Cómo medirlo | Valor saludable |
|---|---|---|
| Uptime del worker | UptimeRobot sobre `/api/health` | > 99% |
| Latencia respuesta | `messages` con `created_at` consecutivos user → assistant | < 30s (incluye buffer 10s) |
| Tasa de respuesta | Conversaciones con respuesta vs sin respuesta | > 95% |
| Items `failed` en outbox | Count en `outbox WHERE status='failed'` | 0 |
| Coste IA por conversación | `SUM(cost_usd) / COUNT(DISTINCT conversation_id)` | < $0.05 |
| Saldo OpenRouter | API credits | > $5 |

## Siguiente paso

- **Problemas con la DB**: `psql $DATABASE_URL` y consultar las tablas directamente
- **Cambiar el prompt del negocio**: `CONFIG.md` sección "Personalizar el prompt"
- **Alta de un cliente nuevo**: `CLIENT-SETUP.md`
