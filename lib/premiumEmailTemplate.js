// lib/premiumEmailTemplate.js
// "Dev jaag gaya" - sent when an admin grants Premium. Brutalist, minimal, sarcastic.
// Email-safe: tables + inline styles only.

import { escapeHtml } from './welcomeEmailTemplate.js';

const BLACK = '#050505';
const PAPER = '#E8E6DF';
const PURPLE = '#7c3aed';
const LILAC = '#a78bfa';
const HEAD = "'Arial Black','Helvetica Neue',Arial,sans-serif";
const MONO = "'Courier New',Courier,monospace";
const BODY = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

export function renderPremiumEmail({ firstName, fullName, siteUrl }) {
  const base = String(siteUrl || 'https://prompt-ai-teal.vercel.app').replace(/\/+$/, '');
  const raw = (firstName || 'dost').trim() || 'dost';
  const name = escapeHtml(raw);
  const full = escapeHtml((fullName || raw).trim() || raw);
  const img = (f) => `${base}/assets/email/${f}`;
  const subject = `The dev woke up, ${raw}. Premium ON.`;
  const preheader = '3/3 is history. Limit removed. (Yes, really.)';

  const row = (k, v) => `
    <tr>
      <td width="120" valign="top" style="padding:11px 0;border-top:2px solid #333333;font-family:${MONO};font-size:12px;font-weight:bold;letter-spacing:1.5px;color:#8a8a8a;">${k}</td>
      <td valign="top" style="padding:11px 0;border-top:2px solid #333333;font-family:${BODY};font-size:15px;line-height:1.4;color:${PAPER};">${v}</td>
    </tr>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(subject)}</title>
<style>
  @media only screen and (max-width:620px){
    .wrap{padding:16px 8px !important}
    .pad{padding-left:20px !important;padding-right:20px !important}
    .big{font-size:60px !important}
    .h1{font-size:46px !important}
    .col{display:block !important;width:100% !important;padding:0 0 18px 0 !important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAPER};font-size:1px;line-height:1px;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPER}" style="background:${PAPER};">
<tr><td align="center" class="wrap" style="padding:36px 12px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${BLACK}" style="width:100%;max-width:600px;background:${BLACK};border:4px solid ${BLACK};">

    <!-- top strip -->
    <tr><td class="pad" style="background:${PURPLE};padding:10px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${MONO};font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#ffffff;">STATUS UPDATE / NO. 0002</td>
        <td align="right" style="font-family:${MONO};font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#ffffff;">(PAYMENT GATEWAY? NEVER BUILT.)</td>
      </tr></table>
    </td></tr>

    <!-- before -> after -->
    <tr><td class="pad" style="padding:38px 28px 6px 28px;">
      <div style="font-family:${MONO};font-size:12px;font-weight:bold;letter-spacing:1px;color:#8a8a8a;padding-bottom:12px;">// ${full.toUpperCase()} &mdash; ACCOUNT STATUS</div>
      <div class="big" style="font-family:${HEAD};font-weight:900;font-size:100px;line-height:0.95;letter-spacing:-5px;color:${PAPER};white-space:nowrap;"><span style="color:#555555;text-decoration:line-through;">3/3</span> <span style="color:${LILAC};">&rarr;&infin;</span></div>
    </td></tr>

    <!-- headline -->
    <tr><td class="pad" style="padding:14px 28px 6px 28px;">
      <div class="h1" style="font-family:${HEAD};font-weight:900;font-size:58px;line-height:0.92;letter-spacing:-3px;color:${PAPER};text-transform:uppercase;">THE DEV<br>WOKE UP.</div>
      <div style="font-family:${SERIF};font-style:italic;font-size:18px;line-height:1.45;color:#bdbdbd;padding-top:14px;">(Remember hitting &ldquo;Wake the Dev&rdquo;? It worked.)</div>
    </td></tr>

    <!-- copy -->
    <tr><td class="pad" style="padding:20px 28px 6px 28px;font-family:${BODY};font-size:16px;line-height:1.6;color:${PAPER};">
      Hi <b><i>${name}</i></b>, the admin just gave you <b style="color:${LILAC};">PREMIUM</b>. The payment gateway never got built, so they handed it over by hand. You&rsquo;re lucky. No need to thank us. Just go break the old limit. (It&rsquo;s allowed now.)
    </td></tr>

    <!-- toggle -->
    <tr><td class="pad" style="padding:18px 28px 6px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" style="padding-right:16px;"><img src="${img('toggle.png')}" width="120" alt="ON" style="display:block;border:0;width:120px;height:auto;"></td>
        <td valign="middle" style="font-family:${HEAD};font-weight:900;font-size:26px;letter-spacing:-1px;color:${PAPER};text-transform:uppercase;">PREMIUM: ON</td>
      </tr></table>
    </td></tr>

    <!-- what changed -->
    <tr><td class="pad" style="padding:22px 28px 6px 28px;">
      <div style="font-family:${MONO};font-size:12px;font-weight:bold;letter-spacing:1px;color:#8a8a8a;padding-bottom:8px;">// WHAT CHANGED</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${row('LIMIT', '<span style="color:#666666;text-decoration:line-through;">3 a day</span> &rarr; <b style="color:' + LILAC + ';">&infin;</b>')}
        ${row('DOGE', 'Used to show up. Now on vacation.')}
        ${row('PRICE', '&#8377;0 <span style="color:#8a8a8a;">(yes, really)</span>')}
        ${row('VALID TILL', 'As long as the admin is in a good mood.')}
      </table>
      <div style="border-top:2px solid #333333;font-size:0;line-height:0;">&nbsp;</div>
    </td></tr>

    <!-- doge + stamp -->
    <tr><td class="pad" style="padding:20px 28px 10px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="bottom" width="40%"><img src="${img('doge.png')}" width="150" alt="Doge" style="display:block;border:0;width:150px;height:auto;"><div style="font-family:${MONO};font-size:10px;font-weight:bold;letter-spacing:1.5px;color:#8a8a8a;padding-top:6px;">WOW. MUCH FREE.</div></td>
        <td valign="middle" align="right" width="60%"><img src="${img('stamp-premium.png')}" width="300" alt="PREMIUM." style="display:block;border:0;width:100%;max-width:300px;height:auto;margin-left:auto;"></td>
      </tr></table>
    </td></tr>

    <!-- CTA -->
    <tr><td class="pad" align="left" style="padding:18px 28px 30px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="${PAPER}" style="background:${PAPER};">
          <a href="${base}/chat" style="display:block;padding:17px 28px;font-family:${HEAD};font-weight:900;font-size:17px;letter-spacing:-0.3px;color:${BLACK};text-decoration:none;text-transform:uppercase;">GO, BREAK THE LIMIT &rarr;</a>
        </td>
      </tr></table>
    </td></tr>

    <tr><td align="center" style="border-top:2px solid #333333;padding:14px 18px;font-family:${MONO};font-size:10px;line-height:1.7;letter-spacing:1.5px;color:#8a8a8a;text-transform:uppercase;">
      PromptAI&reg; 2026 &middot; Designed + built by Dhaval<br>Sent by the admin. Don&rsquo;t reply. (Do. The dev is awake now.)
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;

  const text = [
    `THE DEV WOKE UP, ${raw}. PREMIUM ON.`,
    '',
    '3/3 -> UNLIMITED',
    '',
    'The admin just gave you Premium. The payment gateway never got built, so they handed it over by hand.',
    'Doge is on vacation. Price: Rs 0 (yes, really). Valid till: as long as the admin is in a good mood.',
    '',
    `Go break the limit: ${base}/chat`,
  ].join('\n');

  return { subject, html, text };
}
