import type { APIRoute } from 'astro';
import { createHash } from 'crypto';

const PIXEL_ID = import.meta.env.PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = import.meta.env.META_CAPI_TOKEN;
const API_VERSION = 'v20.0';

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function hashField(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return [sha256(value)];
}

const HASHABLE_FIELDS = ['em', 'ph', 'fn', 'ln', 'ct', 'st', 'zp', 'country', 'external_id'];
const PASSTHROUGH_FIELDS = [
  'client_user_agent',
  'fbc',
  'fbp',
  'client_ip_address',
  'subscription_id',
  'fb_login_id',
  'lead_id',
];

// Rate limiter in-memory: 100 requests/minuto por IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_MS = 60_000;
let rateLimitRequestCount = 0;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function cleanupExpiredRateLimitEntries(now: number): void {
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetTime) rateLimitMap.delete(ip);
  }
}

// Whitelist de eventos permitidos
const ALLOWED_EVENTS = [
  'PageView',
  'Lead',
  'Schedule',
  'CompleteRegistration',
  'Purchase',
  'ViewContent',
  'AddToCart',
  'Contact',
  'SubmitApplication',
];

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Rate limiting por IP
  if (clientAddress) {
    rateLimitRequestCount++;
    // Limpia entradas expiradas cada ~100 requests
    if (rateLimitRequestCount % 100 === 0) cleanupExpiredRateLimitEntries(Date.now());

    if (isRateLimited(clientAddress)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Meta CAPI credentials not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const {
      event_name,
      event_time,
      action_source,
      event_id,
      user_data = {},
      custom_data = {},
    } = body;

    if (!event_name || typeof event_name !== 'string') {
      return new Response(
        JSON.stringify({ error: 'event_name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!ALLOWED_EVENTS.includes(event_name)) {
      return new Response(
        JSON.stringify({ error: 'Invalid event_name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!event_id || typeof event_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'event_id is required for deduplication' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const processedUserData: Record<string, unknown> = {};

    for (const field of HASHABLE_FIELDS) {
      const hashed = hashField(user_data[field]);
      if (hashed) processedUserData[field] = hashed;
    }

    for (const field of PASSTHROUGH_FIELDS) {
      if (user_data[field] !== undefined) processedUserData[field] = user_data[field];
    }

    if (!processedUserData.client_ip_address && clientAddress) {
      processedUserData.client_ip_address = clientAddress;
    }

    const payload = {
      data: [
        {
          event_name,
          event_time: event_time || Math.floor(Date.now() / 1000),
          action_source: action_source || 'website',
          event_id,
          user_data: processedUserData,
          custom_data: custom_data || {},
        },
      ],
    };

    const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Meta CAPI] Error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send event to Meta' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, events_received: result.events_received }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Meta CAPI] Exception:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
