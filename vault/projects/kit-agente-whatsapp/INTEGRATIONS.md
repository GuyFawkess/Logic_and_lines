# Integraciones opcionales — Kit Agente WhatsApp v2.1

> Features que se pueden activar o no según el cliente. Todas son **opt-in** y no afectan al core del bot.

## Chatwoot (inbox unificado)

[Chatwoot](https://www.chatwoot.com) es un CRM de inbox open-source. Permite unificar WhatsApp + email + webchat en una sola pantalla para el equipo de soporte.

### Cuándo activarlo

- El cliente tiene **varios agentes humanos** respondiendo (no solo el dueño)
- Quiere **asignar conversaciones** a agentes específicos
- Quiere **etiquetas y notas** centralizadas
- Quiere **reportes de equipo** (tiempo de respuesta, satisfacción)

Si solo responde el dueño desde el dashboard del kit, **no necesitas Chatwoot**.

### Configuración

1. Despliega Chatwoot (cloud: https://app.chatwoot.com o self-hosted)
2. Settings → Inboxes → Add Inbox → WhatsApp (conectar vía Evolution API)
3. Settings → Integrations → Webhooks → Add:
   - URL: `https://cliente.tudominio.com/api/webhooks/chatwoot`
   - Eventos: `message_created`, `message_updated`
4. Settings → Agents → copiar el `agent_bot_token` y el `account_id`
5. Configurar en `.env` del kit:
   ```bash
   CHATWOOT_ENABLED=true
   CHATWOOT_URL=https://app.chatwoot.com
   CHATWOOT_ACCOUNT_ID=12345
   CHATWOOT_BOT_TOKEN=<agent_bot_token>
   CHATWOOT_INBOX_ID=67890
   CHATWOOT_WEBHOOK_SECRET=<random_string_para_validar_webhook>
   ```

### Cómo funciona

```
Bot responde al lead
       ↓
Mensaje se guarda en kit.messages
       ↓
Sincronizado a Chatwoot inbox
       ↓
Humano en Chatwoot ve la conversación
       ↓
Humano responde desde Chatwoot
       ↓
Webhook al kit → INSERT en outbox
       ↓
OutboxPoller envía por WhatsApp al lead
       ↓
Mensaje se guarda en kit.messages (role='human')
       ↓
Bot no responde (conversación en modo HUMAN)
```

### Vincular conversaciones existentes

Las conversaciones que ya existen en el kit no se migran automáticamente. Para vincular una conversación del kit con su equivalente en Chatwoot:

```sql
UPDATE conversations SET external_id = '<chatwoot_conversation_id>'
WHERE phone = '+34612345678';
```

A partir de ese momento, los mensajes se sincronizan en ambas direcciones.

## n8n (workflows externos)

[n8n](https://n8n.io) es una herramienta de automatización visual. Útil para:

- Cuando se guarda un lead → notificar a Slack/Discord/Microsoft Teams
- Cuando se detecta una incidencia → crear ticket en Jira/Linear
- Cuando la temperatura es "Caliente" → enviar email al equipo de ventas
- Cuando el saldo OpenRouter baja → avisar al dueño

### Configuración

1. Despliega n8n (cloud o self-hosted)
2. Crear un workflow con nodo "Webhook"
3. Copiar la URL del webhook
4. Configurar en `.env`:
   ```bash
   N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/kit-eventos
   N8N_WEBHOOK_SECRET=<random_string_para_validar>
   ```

### Eventos que el kit puede emitir

**PENDIENTE**: actualmente el kit NO emite eventos a n8n automáticamente. El cliente puede:

1. Crear un cron en n8n que consulte el `audit_log` del kit cada X minutos
2. O añadir un endpoint en el kit que n8n llame periódicamente

Workaround actual: queries SQL desde n8n directamente.

## Cal.com / Google Calendar (agendamiento)

El bot detecta automáticamente cuando el lead quiere agendar y le manda el link configurado en `prompts/negocio.md`.

### Configuración (sin código)

En `prompts/negocio.md`:

```markdown
## Cierre
Cuando el lead quiera agendar, envíale este link:
https://cal.com/tu-usuario/llamada-30min
```

El bot usará ese link cuando el flujo de conversación llegue al paso de cierre.

### Setup de Cal.com (recomendado)

1. Crear cuenta en https://cal.com
2. Configurar evento "Llamada de descubrimiento" (30 min)
3. Copiar el link público
4. Configurar campos personalizados: nombre, email (se auto-rellenan)
5. Añadir webhooks (opcional): email al dueño cuando hay nueva reserva

## CRM externos (Airtable, HubSpot, Notion)

**PENDIENTE**: no hay integración nativa con CRMs externos.

Workaround actual: export CSV manual desde la tabla `leads`:

```sql
\COPY (SELECT name, email, phone, objective, situation, temperature, score, status, created_at
       FROM leads
       WHERE created_at >= now() - interval '30 days')
TO '/tmp/leads-export.csv' CSV HEADER;
```

## Stripe (cobros)

**PENDIENTE**: el bot no procesa pagos directamente. Esto es deliberado por seguridad.

El flujo recomendado:

1. El bot califica al lead
2. El bot manda el link de pago (configurado en `prompts/negocio.md`):
   - **Stripe Payment Link**: el más simple. Crear en https://dashboard.stripe.com/payment-links
   - **Cal.com con cobro**: https://cal.com tiene integración con Stripe
   - **Tu web con checkout**: el bot manda el link a tu checkout
3. El lead paga fuera
4. (Opcional, cuando se implemente) Webhook de Stripe → actualiza `leads.status='converted'`

## Tailscale (acceso seguro al dashboard)

[Tailscale](https://tailscale.com) es una VPN mesh que permite acceder a servidores sin exponer puertos.

### Setup (recomendado para L&L admin)

```bash
# En el VPS del cliente
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

- L&L añade su portátil a la misma red Tailscale
- Acceso al dashboard por IP Tailscale (100.x.x.x:3000)
- El dashboard NO se expone públicamente (firewall cierra puerto 3000)
- El cliente NO necesita hacer nada — su acceso es vía Cloudflare Access o basic auth

### Cuándo NO usar Tailscale

- El cliente quiere acceder al dashboard desde su móvil en la calle
- El cliente quiere dar acceso a varios empleados

En esos casos, usar **Cloudflare Access** con email OTP.

## Meta Ads / TikTok Ads (atribución de leads)

Para saber de dónde vienen los leads:

1. Crear campaña con UTMs:
   ```
   https://wa.me/34612345678?text=Hola&utm_source=meta&utm_campaign=black-friday
   ```
2. El cliente mete el mensaje pre-llenado con UTMs
3. El bot detecta los UTMs y los guarda en `leads.utm_source` y `leads.utm_campaign`
4. Analizar con SQL:
   ```sql
   SELECT utm_source, utm_campaign, COUNT(*), temperature
   FROM leads
   WHERE created_at >= now() - interval '30 days'
   GROUP BY utm_source, utm_campaign, temperature
   ORDER BY COUNT(*) DESC;
   ```

## Resumen: cuándo usar qué

| Necesidad del cliente | Integración |
|---|---|
| Solo el dueño responde | **Nada** (kit puro) |
| Varios agentes humanos | **Chatwoot** |
| Automatizar notificaciones (Slack, Jira, email) | **n8n** (vía cron a `audit_log`) |
| Cobros online | **Stripe Payment Link** en el prompt |
| Reservas / agendar llamada | **Cal.com** link en el prompt |
| Saber de dónde vienen los leads | **UTMs** en el link wa.me |
| Proteger el dashboard | **Tailscale** (interno) o **Cloudflare Access** (cliente) |
| Mover leads a un CRM externo | **Export CSV** manual (PENDIENTE integración) |
