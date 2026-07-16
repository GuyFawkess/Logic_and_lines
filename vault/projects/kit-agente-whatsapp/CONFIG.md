# Configuración — Kit Agente WhatsApp v2.1

> Variables de entorno, settings dinámicos, y personalización del prompt del negocio.

## Tabla de variables de entorno

### Obligatorias (sin ellas el proceso no arranca)

| Variable | Formato | Ejemplo | Dónde obtenerla |
|---|---|---|---|
| `DATABASE_URL` | URL Postgres | `postgresql://kit:pass@db:5432/kit` | Coolify o tu Postgres |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | `sk-or-v1-abc123...` | https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | `proveedor/modelo` | `openai/gpt-4o-mini` | https://openrouter.ai/models |
| `ADMIN_USERNAME` | string | `admin` | La que tú elijas |
| `ADMIN_PASSWORD_HASH` | bcrypt `$2a$12$...` | `$2a$12$abcdef...` | Generar con `node -e "console.log(require('bcryptjs').hashSync('pass', 12))"` |
| `SESSION_SECRET` | string ≥ 32 chars | `<openssl rand -hex 32>` | `openssl rand -hex 32` |

### Recomendadas (producción)

| Variable | Default | Ejemplo | Para qué |
|---|---|---|---|
| `APP_URL` | `http://localhost:3000` | `https://cliente.ejemplo.com` | Usado por el bot en respuestas |
| `WHATSAPP_CHANNEL` | `baileys` | `evolution` | `baileys` (gratis) o `evolution` (oficial-like) |
| `BUFFER_SECONDS` | `10` | `15` | Segundos de espera para agrupar mensajes |
| `ALLOWED_PRICES` | `[]` | `77,497,997` | CSV de precios autorizados (si vacío, no se filtran) |
| `ALLOWED_HOSTS` | `[]` | `tuweb.com,tienda.com` | CSV de hosts permitidos en enlaces |
| `SECURITY_CANARY` | `CANARIO-LL-CAMBIAME` | `<random string>` | Anti-fuga de prompt |
| `ALERT_WHATSAPP` | (vacío) | `34612345678` | Número para alertas (PENDIENTE #4) |

### Opcionales (features extra)

| Variable | Default | Para qué |
|---|---|---|
| `TRANSCRIPTION_MODEL` | `google/gemini-2.5-flash` | Modelo para transcribir audios |
| `VISION_MODEL` | `google/gemini-2.5-flash` | Modelo para describir imágenes |
| `AUDIO_ENABLED` | `true` | Procesar notas de voz |
| `VISION_ENABLED` | `true` | Procesar imágenes |
| `OPENAI_API_KEY` | (vacío) | Para RAG (PENDIENTE #2) y transcripción si no usas OpenRouter |
| `EVOLUTION_API_URL` | (vacío) | Si `WHATSAPP_CHANNEL=evolution` |
| `EVOLUTION_API_KEY` | (vacío) | Si `WHATSAPP_CHANNEL=evolution` |
| `EVOLUTION_INSTANCE_NAME` | `default` | Nombre de instancia en Evolution |
| `CHATWOOT_*` | (vacíos) | Integración con Chatwoot (inbox unificado) |
| `N8N_*` | (vacíos) | Webhooks a workflows n8n |
| `DB_POOL_MAX` | `10` | Conexiones simultáneas al pool de Postgres |
| `LOG_LEVEL` | `info` | `error` / `warn` / `info` / `debug` |
| `NODE_ENV` | `development` | `production` en deploy |
| `PORT` | `3000` | Puerto del dashboard |

## Settings dinámicos (modificables en caliente)

Estos viven en la tabla `settings` de Postgres y se pueden cambiar desde el dashboard (o con SQL) sin reiniciar el worker.

| Key | Tipo | Default | Efecto |
|---|---|---|---|
| `model` | string | `openai/gpt-4o-mini` | Modelo de IA para responder |
| `temperature` | number | `0.7` | Creatividad (0 = determinista, 2 = muy creativo) |
| `buffer_seconds` | number | `10` | Segundos de agrupación de mensajes |
| `paused` | boolean | `false` | Si `true`, el bot no responde a nadie |
| `audio_enabled` | boolean | `true` | Procesar notas de voz |
| `vision_enabled` | boolean | `true` | Procesar imágenes |
| `transcription_model` | string | `google/gemini-2.5-flash` | Modelo para audios |
| `vision_model` | string | `google/gemini-2.5-flash` | Modelo para imágenes |
| `max_turns` | number | `5` | Máx turnos del tool calling loop |
| `allowed_prices` | number[] | `[]` | Precios que el bot puede mencionar |
| `allowed_hosts` | string[] | `[]` | Hosts permitidos en enlaces |
| `language` | string | `es` | Idioma por defecto |
| `business_name` | string | `Mi Negocio` | Nombre mostrado en header y parte diario |
| `business_website` | string | `""` | Web del cliente (opcional) |

### Cambiar un setting en caliente

**Desde el dashboard**: `Ajustes` → modificar → `Guardar cambios`. El worker relee los settings cada 30s (cache).

**Desde SQL**:
```sql
UPDATE settings SET value = '"claude-haiku-4-5"'::jsonb WHERE key = 'model';
UPDATE settings SET value = 'true'::jsonb WHERE key = 'paused';
UPDATE settings SET value = '[77, 497, 997]'::jsonb WHERE key = 'allowed_prices';
```

## Personalizar el prompt del negocio

`prompts/negocio.md` es el archivo que define la personalidad, productos y reglas del bot. Tiene 13 secciones, todas editables.

### Estructura del template

```markdown
# Prompt del negocio: [NOMBRE]

## 1. Nombre y qué vendes
## 2. A quién le hablas (cliente ideal)
## 3. Quién eres: el agente IA
## 4. Qué ofreces (productos / servicios)
## 5. Precio, pago y garantía
## 6. Preguntas frecuentes
## 7. Objeciones frecuentes
## 8. Flujo de conversación
## 9. Cómo guardar un lead
## 10. Blindaje (reglas de seguridad)
## 11. Tono y estilo
## 12. Enlaces permitidos
## 13. Código canario
```

### Cómo editarlo

1. Abre `prompts/negocio.md` con tu editor favorito
2. Reemplaza los `[CORCHETES]` con la información real del cliente
3. Borra los `(comentarios entre paréntesis)` que son ejemplos
4. Guarda el archivo — el worker lo recarga automáticamente en el siguiente mensaje

### Validar que no quedan huecos

```bash
grep -E '\[[A-Z]+\]' prompts/negocio.md
```

Si devuelve algo, hay huecos por rellenar.

### Ejemplos completos

Ver `examples/`:

- `examples/ecommerce/negocio.md` — Tienda Lobo (venta de licencias)
- `examples/agencia/negocio.md` — Agencia Nova (consultoría IA B2B)
- `examples/restaurante/negocio.md` — Restaurante El Lobo (reservas)

## Reglas de oro del prompt

1. **Sé concreto**: mejor "Curso de Next.js 15 con TypeScript, 40 vídeos, 6 meses de soporte" que "curso de programación completo".

2. **Máximo 2-3 frases por mensaje**: el bot está entrenado para mensajes cortos. Si el prompt es muy denso, generará respuestas largas y anti-naturales.

3. **Define bien lead bueno vs malo**: el bot usa `calificarLead` para puntuar. Si los criterios son vagos, las puntuaciones no sirven.

4. **Tabla de precios con cifras exactas**: si tienes `ALLOWED_PRICES=77,497,997` en `.env` y el prompt dice "cursos desde 99€", el guardrail rechazará la respuesta del bot. Mantén sincronizados prompt y setting.

5. **Sección 12 (enlaces) lo más concreta posible**: si dices "enlace de pago" sin URL, el bot no sabrá qué mandar.

## Tests automatizados del prompt

No hay (todavía — PENDIENTE #7). Por ahora, los tests son manuales:

1. Modo `paused=true` para que el bot no responda a leads reales
2. Probar 5-10 preguntas típicas desde otro móvil
3. Evaluar tono, exactitud de la info, respeto a los precios
4. Verificar que NO aparece el código canario en ninguna respuesta
