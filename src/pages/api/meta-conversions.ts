import type { APIRoute } from 'astro';
import { createHash } from 'crypto';

const PIXEL_ID = import.meta.env.META_PIXEL_ID;
const ACCESS_TOKEN = import.meta.env.META_ACCESS_TOKEN;
const API_VERSION = 'v21.0';

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export const POST: APIRoute = async ({ request }) => {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Meta CAPI credentials not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { event_name, event_time, action_source, event_id, user_data, custom_data } = body;

    const hashedUserData: Record<string, unknown> = {};

    if (user_data) {
      if (user_data.em) hashedUserData.em = [sha256(user_data.em)];
      if (user_data.ph) hashedUserData.ph = [sha256(user_data.ph)];
      if (user_data.fn) hashedUserData.fn = [sha256(user_data.fn)];
      if (user_data.ln) hashedUserData.ln = [sha256(user_data.ln)];
      if (user_data.ct) hashedUserData.ct = [sha256(user_data.ct)];
      if (user_data.st) hashedUserData.st = [sha256(user_data.st)];
      if (user_data.zp) hashedUserData.zp = [sha256(user_data.zp)];
      if (user_data.country) hashedUserData.country = [sha256(user_data.country)];
      if (user_data.external_id) hashedUserData.external_id = [sha256(user_data.external_id)];

      if (user_data.client_user_agent) hashedUserData.client_user_agent = user_data.client_user_agent;
      if (user_data.fbc) hashedUserData.fbc = user_data.fbc;
      if (user_data.fbp) hashedUserData.fbp = user_data.fbp;
      if (user_data.client_ip_address) hashedUserData.client_ip_address = user_data.client_ip_address;
    }

    const payload = {
      data: [
        {
          event_name,
          event_time: event_time || Math.floor(Date.now() / 1000),
          action_source: action_source || 'website',
          event_id,
          user_data: hashedUserData,
          custom_data: custom_data || {},
          original_event_data: {
            event_name,
            event_time: event_time || Math.floor(Date.now() / 1000)
          }
        }
      ]
    };

    const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Meta CAPI] Error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send event to Meta', details: result }),
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
