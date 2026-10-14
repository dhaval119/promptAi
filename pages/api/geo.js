// pages/api/geo.js
// Country + city from Vercel / Cloudflare headers (free, no external API).
// Locally returns XX / empty city.

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const rawCountry =
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['x-country-code'] ||
    'XX';
  const country = String(rawCountry).trim().toUpperCase().slice(0, 2);
  const rawCity =
    req.headers['x-vercel-ip-city'] ||
    req.headers['cf-ipcity'] ||
    req.headers['x-city'] ||
    '';
  // Vercel encodes city with percent-encoding sometimes
  let city = '';
  try {
    city = decodeURIComponent(String(rawCity).trim()).slice(0, 80);
  } catch {
    city = String(rawCity).trim().slice(0, 80);
  }
  const region = String(
    req.headers['x-vercel-ip-country-region'] || req.headers['x-region'] || ''
  )
    .trim()
    .slice(0, 40);

  res.status(200).json({
    country: /^[A-Z]{2}$/.test(country) ? country : 'XX',
    city: city || null,
    region: region || null,
  });
}
