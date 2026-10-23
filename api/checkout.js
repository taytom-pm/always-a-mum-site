// Vercel serverless function: turns the cart into a Stripe Checkout session.
// Prices come from products.json on the server, never from the browser.
// Env vars (Vercel > Project > Settings > Environment Variables):
//   STRIPE_SECRET_KEY   required, sk_test_... while testing, sk_live_... when live
//   SHIPPING_PENCE      optional, flat UK delivery charge in pence (default 395 = £3.95)
//   FREE_SHIPPING_OVER  optional, subtotal in pence above which delivery is free (default 0 = never)
//   SHIP_COUNTRIES      optional, comma-separated ISO codes (default GB)
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: 'Stripe is not configured yet.' });

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const products = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'products.json'), 'utf8'));
  const params = new URLSearchParams();
  let n = 0, subtotal = 0;
  for (const it of Array.isArray(body.items) ? body.items : []) {
    const prod = products.find(p => p.id === it.id);
    if (!prod) continue;
    const qty = Math.min(20, Math.max(1, parseInt(it.qty, 10) || 1));
    subtotal += prod.price * qty;
    params.append(`line_items[${n}][quantity]`, String(qty));
    params.append(`line_items[${n}][price_data][currency]`, 'gbp');
    params.append(`line_items[${n}][price_data][unit_amount]`, String(prod.price));
    params.append(`line_items[${n}][price_data][product_data][name]`, prod.title);
    if (prod.photoUrl) params.append(`line_items[${n}][price_data][product_data][images][0]`, prod.photoUrl);
    n++;
  }
  if (!n) return res.status(400).json({ error: 'Your cart is empty.' });

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const origin = `${proto}://${req.headers.host}`;
  let shopPath = typeof body.shopPath === 'string' && /^\/[^/]/.test(body.shopPath) ? body.shopPath : '/';
  if (shopPath === '/' && body.shopPath === '/') shopPath = '/';

  const shipping = parseInt(process.env.SHIPPING_PENCE || '395', 10);
  const freeOver = parseInt(process.env.FREE_SHIPPING_OVER || '0', 10);
  const shipFree = freeOver > 0 && subtotal >= freeOver;

  params.append('mode', 'payment');
  params.append('success_url', origin + shopPath + '?checkout=success');
  params.append('cancel_url', origin + shopPath + '?checkout=cancelled');
  (process.env.SHIP_COUNTRIES || 'GB').split(',').map(s => s.trim()).filter(Boolean)
    .forEach((cc, i) => params.append(`shipping_address_collection[allowed_countries][${i}]`, cc));
  params.append('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
  params.append('shipping_options[0][shipping_rate_data][display_name]', shipFree ? 'Free UK delivery' : 'UK delivery');
  params.append('shipping_options[0][shipping_rate_data][fixed_amount][amount]', String(shipFree ? 0 : shipping));
  params.append('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'gbp');

  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await r.json();
  if (!r.ok) return res.status(400).json({ error: (data.error && data.error.message) || 'Stripe error' });
  return res.status(200).json({ url: data.url });
};
