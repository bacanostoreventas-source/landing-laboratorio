// Vercel Serverless Function — Meta Conversions API
// Recibe eventos desde el cliente y los reenvía al CAPI de Meta
// El Access Token nunca sale al navegador

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const PIXEL_ID      = process.env.META_PIXEL_ID;
  const ACCESS_TOKEN  = process.env.META_ACCESS_TOKEN;

  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ ok: false, error: 'Missing env vars' });
  }

  const { event_name, event_id, fbp, fbc, user_agent, page_url } = req.body || {};

  const clientIp = (req.headers['x-forwarded-for'] || '')
    .split(',')[0].trim() || req.socket?.remoteAddress || '';

  // custom_data solo para eventos de conversión con valor económico
  const isPurchase = event_name === 'Purchase';
  const customData = isPurchase ? {
    currency:         'PEN',
    value:            10.00,
    content_name:     'Guía Interpretación Exámenes de Laboratorio',
    content_category: 'Ebook',
    num_items:        1,
  } : undefined;

  const payload = {
    data: [
      {
        event_name:       event_name  || 'PageView',
        event_time:       Math.floor(Date.now() / 1000),
        event_id:         event_id    || `ev_${Date.now()}`,
        event_source_url: page_url    || '',
        action_source:    'website',
        user_data: {
          client_ip_address: clientIp,
          client_user_agent: user_agent || req.headers['user-agent'] || '',
          ...(fbp ? { fbp } : {}),
          ...(fbc ? { fbc } : {}),
        },
        ...(customData ? { custom_data: customData } : {}),
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
    return res.status(200).json({ ok: true, fb: json });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
