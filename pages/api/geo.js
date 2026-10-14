// pages/api/geo.js
// Returns the visitor's country code. On Vercel this comes for free from the request headers
// (no IP lookup service, no extra cost). Locally it returns "XX" (unknown).

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const raw =
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['x-country-code'] ||
    'XX';
  const country = String(raw).trim().toUpperCase().slice(0, 2);
  res.status(200).json({ country: /^[A-Z]{2}$/.test(country) ? country : 'XX' });
}
