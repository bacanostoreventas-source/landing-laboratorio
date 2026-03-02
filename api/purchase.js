// Vercel Serverless Function — Registrar venta manual
// Valida ADMIN_KEY y envía evento Purchase al CAPI de Meta

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { key } = req.body || {};

  // Validar clave de administrador
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ ok: false, error: 'No autorizado' });
  }

  const PIXEL_ID     = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ ok: false, error: 'Faltan variables de entorno' });
  }

  const eventId = 'purchase_manual_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

  const payload = {
    data: [
      {
        event_name:       'Purchase',
        event_time:       Math.floor(Date.now() / 1000),
        event_id:         eventId,
        action_source:    'website',
        event_source_url: 'https://landing-laboratorio.vercel.app',
        user_data: {
          client_ip_address: (req.headers['x-forwarded-for'] || '').split(',')[0].trim(),
          client_user_agent: req.headers['user-agent'] || '',
        },
        custom_data: {
          currency:         'PEN',
          value:            10.00,
          content_name:     'Guía Interpretación Exámenes de Laboratorio',
          content_category: 'Ebook',
          num_items:        1,
        },
      },
    ],
  };

  try {
    const fbRes = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      }
    );
    const json = await fbRes.json();

    if (json.error) {
      return res.status(400).json({ ok: false, fb_error: json.error });
    }

    return res.status(200).json({ ok: true, events_received: json.events_received });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
