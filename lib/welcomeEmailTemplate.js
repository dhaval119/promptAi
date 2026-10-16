// lib/welcomeEmailTemplate.js
// "The Deal" - the welcome email is a one-page agreement between the user and PromptAI.
// Black sheet, brutalist, minimal, sarcastic. Email-safe: tables + inline styles, no JS, no background images.

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const BLACK = '#050505';
const PAPER = '#E8E6DF';
const PURPLE = '#7c3aed';
const LILAC = '#a78bfa';
const HEAD = "'Arial Black','Helvetica Neue',Arial,sans-serif";
const MONO = "'Courier New',Courier,monospace";
const BODY = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

// Gmail / Outlook dark mode auto-inverts light backgrounds. A gradient background-image
// (same colour) tells Gmail "this is intentional", so the paper parts stay white/cream.
const PAPER_BG = `background:${PAPER};background-color:${PAPER};background-image:linear-gradient(${PAPER},${PAPER});`;

export function renderWelcomeEmail({ firstName, fullName, siteUrl }) {
  const base = String(siteUrl || 'https://prompt-ai-teal.vercel.app').replace(/\/+$/, '');
  const raw = (firstName || 'dost').trim() || 'dost';
  const name = escapeHtml(raw);
  const full = escapeHtml((fullName || raw).trim() || raw);
  const img = (f) => `${base}/assets/email/${f}`;
  const subject = `Deal done, ${raw}. (Namaste.)`;
  const preheader = "You write. We handle it. It's signed.";

  const clause = (no, title, sub) => `
    <tr>
      <td width="52" valign="top" style="padding:14px 0;border-top:3px solid ${PAPER};font-family:${HEAD};font-weight:900;font-size:26px;line-height:1;color:${LILAC};">${no}</td>
      <td valign="top" style="padding:14px 0;border-top:3px solid ${PAPER};">
        <div style="font-family:${HEAD};font-weight:900;font-size:17px;line-height:1.15;color:${PAPER};text-transform:uppercase;letter-spacing:-0.4px;">${title}</div>
        <div style="font-family:${SERIF};font-style:italic;font-size:15px;line-height:1.4;color:#bdbdbd;padding-top:3px;">${sub}</div>
      </td>
    </tr>`;

  const check = (on, text) => `
    <tr>
      <td width="38" valign="top" style="padding:7px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="24" height="24" align="center" valign="middle" bgcolor="${on ? PURPLE : BLACK}" style="width:24px;height:24px;background:${on ? PURPLE : BLACK};border:3px solid ${on ? PURPLE : PAPER};font-family:${HEAD};font-weight:900;font-size:15px;line-height:24px;color:#ffffff;">${on ? '&#10003;' : '&nbsp;'}</td>
        </tr></table>
      </td>
      <td valign="middle" style="padding:7px 0;font-family:${BODY};font-size:15px;line-height:1.4;color:${PAPER};">${text}</td>
    </tr>`;

  // Live checkbox (CSS :checked). Works in Apple Mail / iOS Mail / Samsung Mail / Thunderbird / Outlook for Mac.
  // Gmail + Outlook.com strip <input>, so there it simply stays as the normal unchecked box.
  const liveCheck = () => `
    <input type="checkbox" id="pa-read" class="pa-input" style="display:none;max-height:0;overflow:hidden;opacity:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="pa-live">
    <tr>
      <td width="38" valign="top" style="padding:7px 0;">
        <label for="pa-read" style="cursor:pointer;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td class="pa-box" width="24" height="24" align="center" valign="middle" bgcolor="${BLACK}" style="width:24px;height:24px;background:${BLACK};border:3px solid ${PAPER};font-family:${HEAD};font-weight:900;font-size:15px;line-height:24px;color:${BLACK};cursor:pointer;"><span class="pa-tick" style="display:none;color:#ffffff;">&#10003;</span></td>
        </tr></table>
        </label>
      </td>
      <td valign="middle" style="padding:7px 0;font-family:${BODY};font-size:15px;line-height:1.4;color:${PAPER};">
        <label for="pa-read" style="cursor:pointer;">I read the terms. <span class="pa-before" style="color:#8a8a8a;">(We know you didn&rsquo;t.)</span><span class="pa-after" style="display:none;color:${LILAC};">(I know you&rsquo;re lying.)</span></label>
      </td>
    </tr>
    </table>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(subject)}</title>
<style>
  :root{color-scheme:light only;supported-color-schemes:light only}
  /* Apple Mail / iOS dark mode: keep paper parts light */
  @media (prefers-color-scheme: dark){
    .paper{background:${PAPER} !important;background-color:${PAPER} !important;background-image:linear-gradient(${PAPER},${PAPER}) !important}
    .ink{color:${BLACK} !important}
    .ink-btn{background:${BLACK} !important;color:${PAPER} !important}
  }
  /* Outlook.com dark mode */
  [data-ogsb] .paper{background:${PAPER} !important;background-color:${PAPER} !important}
  [data-ogsc] .ink{color:${BLACK} !important}
  @media only screen and (max-width:620px){
    .wrap{padding:16px 8px !important}
    .pad{padding-left:20px !important;padding-right:20px !important}
    .big{font-size:56px !important}
    .big2{font-size:44px !important}
    .col{display:block !important;width:100% !important;padding:0 0 18px 0 !important}
  }
</style>
<style>
  .pa-input:checked + .pa-live .pa-box{background:${PURPLE} !important;background-color:${PURPLE} !important;border-color:${PURPLE} !important}
  .pa-input:checked + .pa-live .pa-tick{display:inline !important;color:#ffffff !important}
  .pa-input:checked + .pa-live .pa-before{display:none !important}
  .pa-input:checked + .pa-live .pa-after{display:inline !important}
</style>
</head>
<body class="paper" style="margin:0;padding:0;${PAPER_BG}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAPER};font-size:1px;line-height:1px;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPER}" class="paper" style="${PAPER_BG}">
<tr><td align="center" class="wrap" style="padding:36px 12px;">

  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${BLACK}" style="width:100%;max-width:600px;background:${BLACK};border:4px solid ${BLACK};">

    <!-- top strip -->
    <tr><td class="pad" style="background:${PURPLE};padding:10px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${MONO};font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#ffffff;">AGREEMENT NO. 0001</td>
        <td align="right" style="font-family:${MONO};font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#ffffff;">(NO LAWYERS INVOLVED)</td>
      </tr></table>
    </td></tr>

    <!-- giant deal -->
    <tr><td class="pad" style="padding:40px 28px 8px 28px;">
      <div style="font-family:${MONO};font-size:12px;font-weight:bold;letter-spacing:1px;color:#8a8a8a;padding-bottom:14px;">// PARTY A: ${full.toUpperCase()} &nbsp;/&nbsp; PARTY B: PROMPTAI</div>
      <div class="big" style="font-family:${HEAD};font-weight:900;font-size:84px;line-height:0.9;letter-spacing:-4px;color:${PAPER};text-transform:uppercase;">YOU WRITE.</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;"><tr>
        <td class="paper" bgcolor="${PAPER}" style="${PAPER_BG}padding:6px 14px 10px 14px;">
          <div class="big2 ink" style="font-family:${HEAD};font-weight:900;font-size:56px;line-height:0.95;letter-spacing:-2.5px;color:${BLACK};text-transform:uppercase;">WE&rsquo;LL<br>HANDLE IT.</div>
        </td>
      </tr></table>
      <div style="font-family:${SERIF};font-style:italic;font-size:18px;line-height:1.45;color:#bdbdbd;padding-top:20px;">Hi ${name}, your account is ready. The deal is below. Read it. (You won&rsquo;t. We know.)</div>
    </td></tr>

    <!-- clauses -->
    <tr><td class="pad" style="padding:18px 28px 6px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${clause('1.', 'You write one line.', 'Typos allowed. Grammar optional. Brain not required.')}
        ${clause('2.', 'We turn it into a prompt.', 'Role, task, style, output. All of it. No complaints.')}
        ${clause('3.', 'No more copy-paste.', 'Hit Open in ChatGPT. That&rsquo;s it. Yes, really.')}
      </table>
      <div style="border-top:3px solid ${PAPER};font-size:0;line-height:0;">&nbsp;</div>
    </td></tr>

    <!-- initial here -->
    <tr><td class="pad" style="padding:20px 28px 6px 28px;">
      <div style="font-family:${MONO};font-size:12px;font-weight:bold;letter-spacing:1px;color:#8a8a8a;padding-bottom:6px;">// INITIAL HERE</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${check(true, 'I will write at least one line.')}
        ${check(true, 'I will stop typing &ldquo;make it better&rdquo; as a prompt.')}
      </table>
      ${liveCheck()}
    </td></tr>

    <!-- signatures -->
    <tr><td class="pad" style="padding:24px 28px 10px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="col" width="50%" valign="bottom" style="padding-right:14px;">
          <div style="font-family:${MONO};font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#8a8a8a;">YOU:</div>
          <div style="font-family:${SERIF};font-style:italic;font-size:34px;line-height:1.1;color:${PAPER};border-bottom:3px solid ${PAPER};padding:6px 0 4px 0;">${full}</div>
          <div style="font-family:${MONO};font-size:10px;letter-spacing:1px;color:#8a8a8a;padding-top:6px;">(SIGNED. YES, YOU DID.)</div>
        </td>
        <td class="col" width="50%" valign="bottom" style="padding-left:14px;">
          <div style="font-family:${MONO};font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#8a8a8a;">US:</div>
          <div style="font-family:${SERIF};font-style:italic;font-size:34px;line-height:1.1;color:${PAPER};border-bottom:3px solid ${PAPER};padding:6px 0 4px 0;">PromptAI</div>
          <div style="font-family:${MONO};font-size:10px;letter-spacing:1px;color:#8a8a8a;padding-top:6px;">(SIGNED. AUTOMATICALLY. 0.3 SECONDS.)</div>
        </td>
      </tr></table>
    </td></tr>

    <!-- stamp + witness -->
    <tr><td class="pad" style="padding:8px 28px 26px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" width="58%"><img src="${img('stamp.png')}" width="300" alt="DEAL DONE." style="display:block;border:0;width:100%;max-width:300px;height:auto;"></td>
        <td valign="bottom" align="center" width="42%" style="padding-left:10px;">
          <img src="${img('doge-witness.png')}" width="140" alt="Doge" style="display:block;border:0;width:140px;height:auto;margin:0 auto;">
          <div style="font-family:${MONO};font-size:10px;font-weight:bold;letter-spacing:1.5px;color:${PAPER};padding-top:6px;">WITNESS: DOGE</div>
        </td>
      </tr></table>
    </td></tr>

    <!-- perforation -->
    <tr><td style="padding:0;">
      <div style="border-top:3px dashed ${PAPER};font-family:${MONO};font-size:11px;font-weight:bold;letter-spacing:1.5px;color:${PAPER};padding:8px 28px;">&#9986; TEAR HERE <span style="font-weight:normal;color:#8a8a8a;">(nothing happens. it&rsquo;s just fun.)</span></div>
    </td></tr>

    <!-- stub (inverted) -->
    <tr><td bgcolor="${PAPER}" class="pad paper" style="${PAPER_BG}padding:26px 28px 18px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="col ink" valign="middle" style="font-family:${HEAD};font-weight:900;font-size:38px;line-height:0.92;letter-spacing:-2px;color:${BLACK};text-transform:uppercase;">ADMIT<br>ONE.</td>
        <td class="col" valign="middle" align="right">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td bgcolor="${BLACK}" style="background:${BLACK};">
              <a href="${base}/chat" class="ink-btn" style="display:block;padding:16px 26px;font-family:${HEAD};font-weight:900;font-size:16px;letter-spacing:-0.3px;color:${PAPER};text-decoration:none;text-transform:uppercase;">GO, MAKE A PROMPT &rarr;</a>
            </td>
          </tr></table>
        </td>
      </tr></table>
      <img src="${img('barcode.png')}" width="300" alt="" style="display:block;border:0;width:300px;max-width:100%;height:auto;margin-top:22px;">
      <div style="font-family:${MONO};font-size:10px;line-height:1.7;letter-spacing:1px;color:#333333;padding-top:12px;text-transform:uppercase;" class="ink">*Fine print: 3 free prompts a day. Yes, 3. The dev spent the rest of the budget on this email.</div>
      <div style="font-family:${MONO};font-size:10px;line-height:1.7;letter-spacing:1.5px;color:#555555;padding-top:8px;text-transform:uppercase;" class="ink">NO. 0001 &middot; PromptAI&reg; 2026 &middot; Designed + built by Dhaval<br>This is the only email. It won&rsquo;t come again. Promise.</div>
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;

  const text = [
    `DEAL DONE, ${raw}. (Namaste.)`,
    '',
    "YOU WRITE. WE'LL HANDLE IT.",
    '',
    '1. You write one line. Typos allowed.',
    '2. We turn it into a prompt. Role, task, style, output.',
    "3. No more copy-paste. Hit Open in ChatGPT. That's it.",
    '',
    '[x] I will write at least one line.',
    '[x] I will stop typing "make it better" as a prompt.',
    "[ ] I read the terms. (We know you didn't.)",
    '',
    `Signed: ${(fullName || raw).trim()} / PromptAI. Witness: Doge.`,
    '',
    `Go make a prompt: ${base}/chat`,
    '',
    '*Fine print: 3 free prompts a day. Yes, 3.',
  ].join('\n');

  return { subject, html, text };
}
