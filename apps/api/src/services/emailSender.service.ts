import nodemailer from 'nodemailer';
import { getEmailTemplates, type EmailTemplate } from './emailTemplates.service';
import { getBrandingInfo } from './systemSettings.service';

type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`${name} is not configured`);
  return v.trim();
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const v = value.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  if (v === 'false' || v === '0' || v === 'no') return false;
  return fallback;
}

function loadEmailConfig(): EmailConfig {
  const host = requiredEnv('EMAIL_HOST');
  const port = Number(requiredEnv('EMAIL_PORT'));
  const secure = parseBool(process.env.EMAIL_SECURE, port === 465);
  const user = requiredEnv('EMAIL_USER');
  const pass = requiredEnv('EMAIL_PASSWORD');
  const from = (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim()) ? process.env.EMAIL_FROM.trim() : user;

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('EMAIL_PORT must be a valid number');
  }

  return { host, port, secure, user, pass, from };
}

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function supportEmail(): string {
  const v = process.env.SUPPORT_EMAIL;
  if (v && v.trim()) return v.trim();
  const from = process.env.EMAIL_FROM;
  if (from && from.trim()) return from.trim();
  return '';
}

async function emailLogoUrl(): Promise<string> {
  const v = process.env.EMAIL_LOGO_URL;
  if (v && v.trim()) return v.trim();

  const branding = await getBrandingInfo();
  const raw = String(branding.logoUrl ?? '').trim();
  if (!raw) return '';

  // Convert relative API paths to absolute URLs for email clients.
  if (raw.startsWith('/')) {
    return `${apiOrigin()}${raw}`;
  }
  return raw;
}

function textToHtmlContent(bodyText: string): string {
  const normalized = String(bodyText ?? '').replace(/\r\n/g, '\n');
  const paragraphs = normalized.split(/\n\n+/g);

  return paragraphs
    .map((p) => {
      const escaped = escapeHtml(p);
      const withBreaks = escaped.replace(/\n/g, '<br/>');
      const linked = withBreaks.replace(
        /(https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+)/g,
        (url) => `<a href="${url}" style="color:#4f46e5; text-decoration:underline; font-weight:600; word-break:break-all;">${url}</a>`
      );
      return `<p style="margin:0 0 16px 0; font-size:15px; line-height:1.7; color:#334155;">${linked}</p>`;
    })
    .join('');
}

function toDisplayDate(): string {
  try {
    return new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Accent colours for different notification types */
type EmailAccent = 'default' | 'security' | 'success' | 'warning';

const ACCENTS: Record<EmailAccent, { top: string; badge: string; badgeText: string; badgeBorder: string; label: string }> = {
  default:  { top: 'linear-gradient(90deg,#4f46e5 0%,#6366f1 100%)', badge: '#eef2ff', badgeText: '#4338ca', badgeBorder: '#c7d2fe', label: 'Notification' },
  security: { top: 'linear-gradient(90deg,#d97706 0%,#f59e0b 100%)', badge: '#fffbeb', badgeText: '#92400e', badgeBorder: '#fde68a', label: 'Security Alert' },
  success:  { top: 'linear-gradient(90deg,#16a34a 0%,#22c55e 100%)', badge: '#f0fdf4', badgeText: '#15803d', badgeBorder: '#bbf7d0', label: 'Success' },
  warning:  { top: 'linear-gradient(90deg,#ea580c 0%,#f97316 100%)', badge: '#fff7ed', badgeText: '#9a3412', badgeBorder: '#fed7aa', label: 'Notice' },
};

async function wrapBrandedEmailHtml(params: {
  title: string;
  preheader?: string;
  contentHtml: string;
  accent?: EmailAccent;
}): Promise<string> {
  const year = new Date().getFullYear();
  const logo = await emailLogoUrl();
  const support = supportEmail();
  const brand = (await getBrandingInfo()).name;
  const preheader = params.preheader ? escapeHtml(params.preheader) : '';
  const nowText = toDisplayDate();
  const acc = ACCENTS[params.accent ?? 'default'];

  return (
    `<!doctype html>`
    + `<html lang="en">`
    + `<head>`
    + `<meta charset="utf-8"/>`
    + `<meta name="viewport" content="width=device-width,initial-scale=1"/>`
    + `<meta name="x-apple-disable-message-reformatting"/>`
    + `<title>${escapeHtml(params.title)}</title>`
    + `</head>`
    + `<body style="margin:0;padding:0;background:#eef2ff;font-family:Arial,Helvetica,sans-serif;">`

    // Preheader (hidden)
    + (preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>` : '')

    // Outer table
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#eef2ff;">`
    + `<tr><td align="center" style="padding:36px 16px;">`

    // Inner 600-wide wrapper
    + `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:600px;width:100%;">`

    // ── Top branding row ──────────────────────────────────────
    + `<tr><td style="padding:0 0 18px 0;">`
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">`
    + `<tr>`
    + `<td style="vertical-align:middle;">`
    + (logo
      ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(brand)}" height="38" style="display:block;height:38px;width:auto;"/>`
      : `<span style="font-size:18px;font-weight:800;color:#1e293b;letter-spacing:-0.02em;">${escapeHtml(brand)}</span>`)
    + `</td>`
    + `<td align="right" style="vertical-align:middle;font-size:12px;color:#94a3b8;">${escapeHtml(nowText)}</td>`
    + `</tr>`
    + `</table>`
    + `</td></tr>`

    // ── Main card ─────────────────────────────────────────────
    + `<tr><td style="background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.08);">`

    // Coloured top stripe
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">`
    + `<tr><td style="background:${acc.top};height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>`
    + `</table>`

    // Card header
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">`
    + `<tr><td style="padding:28px 30px 20px;">`
    + `<div style="display:inline-block;background:${acc.badge};border:1px solid ${acc.badgeBorder};border-radius:999px;padding:4px 14px;font-size:11px;font-weight:800;color:${acc.badgeText};letter-spacing:0.07em;text-transform:uppercase;margin-bottom:14px;">${acc.label}</div>`
    + `<div style="font-size:22px;font-weight:800;color:#0f172a;line-height:1.2;letter-spacing:-0.01em;">${escapeHtml(params.title)}</div>`
    + `</td></tr>`
    + `</table>`

    // Divider
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">`
    + `<tr><td style="padding:0 30px;"><div style="height:1px;background:#f1f5f9;"></div></td></tr>`
    + `</table>`

    // Content body
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">`
    + `<tr><td style="padding:26px 30px 30px;">`
    + `${params.contentHtml}`
    + `</td></tr>`
    + `</table>`

    + `</td></tr>`

    // ── Footer ────────────────────────────────────────────────
    + `<tr><td style="padding:22px 0 0;">`
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">`
    + `<tr><td align="center" style="padding:18px 20px;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;">`
    + `<p style="margin:0 0 6px;font-size:12px;color:#94a3b8;line-height:1.5;">This is an automated message, please do not reply directly to this message.</p>`
    + (support ? `<p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">Need help? <a href="mailto:${escapeHtml(support)}" style="color:#4f46e5;text-decoration:none;font-weight:600;">${escapeHtml(support)}</a></p>` : '')
    + `<p style="margin:0;font-size:12px;color:#cbd5e1;">© ${year} <strong style="color:#94a3b8;">${escapeHtml(brand)}</strong>. All rights reserved.</p>`
    + `</td></tr>`
    + `</table>`
    + `</td></tr>`

    + `</table>`
    + `</td></tr></table>`
    + `</body></html>`
  );
}

/** Build a styled login-details info block */
function loginInfoBlockHtml(data: Record<string, string>): string {
  const rows: { label: string; key: string }[] = [
    { label: 'Date / Time',     key: 'login_date_time' },
    { label: 'IP Address',      key: 'login_ip' },
    { label: 'Location',        key: 'login_location' },
    { label: 'Device / Browser', key: 'login_device' },
  ];

  const rowsHtml = rows
    .map(({ label, key }) => {
      const val = escapeHtml(String(data[key] ?? ''));
      if (!val) return '';
      return (
        `<tr>`
        + `<td style="padding:7px 0;font-size:13px;color:#64748b;white-space:nowrap;vertical-align:top;padding-right:16px;min-width:110px;">${label}</td>`
        + `<td style="padding:7px 0;font-size:13px;color:#0f172a;font-weight:600;word-break:break-word;">${val}</td>`
        + `</tr>`
      );
    })
    .join('');

  return (
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e0e7ff;border-radius:12px;overflow:hidden;margin:16px 0;">`
    + `<tr>`
    + `<td style="background:#4f46e5;width:5px;min-width:5px;padding:0;font-size:0;">&nbsp;</td>`
    + `<td style="padding:16px 20px;">`
    + `<div style="font-weight:800;font-size:13px;color:#0f172a;margin-bottom:10px;letter-spacing:0.01em;">Login Details</div>`
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rowsHtml}</table>`
    + `</td>`
    + `</tr>`
    + `</table>`
  );
}

/** Build a styled CTA button block */
function buttonBlockHtml(label: string, url: string, linkUrl?: string): string {
  const safe = escapeHtml(url);
  return (
    `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:4px 0 16px;">`
    + `<tr><td style="border-radius:10px;background:#4f46e5;">`
    + `<a href="${safe}" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;line-height:1;">${label}</a>`
    + `</td></tr>`
    + `</table>`
    + `<p style="margin:0 0 16px;font-size:12px;color:#94a3b8;word-break:break-all;">Or copy this link: <a href="${safe}" style="color:#4f46e5;text-decoration:underline;">${escapeHtml(linkUrl ?? url)}</a></p>`
  );
}

/** Build a styled OTP code block */
function otpCodeHtml(code: string): string {
  return (
    `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:4px 0 16px;">`
    + `<tr><td style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:14px 28px;text-align:center;">`
    + `<span style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:800;color:#3730a3;letter-spacing:8px;">${escapeHtml(code)}</span>`
    + `</td></tr>`
    + `</table>`
  );
}

function renderTokens(input: string, data: Record<string, string>, opts?: { html?: boolean }) {
  let out = String(input ?? '');

  for (const [key, rawValue] of Object.entries(data)) {
    const token = `{{${key}}}`;

    if (opts?.html && key === 'activation_link') {
      const url = String(rawValue ?? '').trim();
      const block = url ? buttonBlockHtml('Activate Account', url) : '';
      out = out.split(token).join(block);
      continue;
    }

    if (opts?.html && key === 'otp_code') {
      out = out.split(token).join(otpCodeHtml(String(rawValue ?? '')));
      continue;
    }

    if (opts?.html && key === 'job_link') {
      const url = String(rawValue ?? '').trim();
      const block = url ? buttonBlockHtml('View Job', url) : '';
      out = out.split(token).join(block);
      continue;
    }

    if (opts?.html && key === 'login_info_block') {
      out = out.split(token).join(loginInfoBlockHtml(data));
      continue;
    }

    if (opts?.html && key === 'unsubscribe_link') {
      const url = String(rawValue ?? '').trim();
      const link = url
        ? `<p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">If you no longer want to receive these alerts, you can <a href="${escapeHtml(url)}" style="color:#64748b;text-decoration:underline;">unsubscribe here</a>.</p>`
        : '';
      out = out.split(token).join(link);
      continue;
    }

    const value = opts?.html ? escapeHtml(String(rawValue ?? '')) : String(rawValue ?? '');
    out = out.split(token).join(value);
  }

  return out;
}

let cachedTransport: nodemailer.Transporter | null = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;
  const cfg = loadEmailConfig();
  cachedTransport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  return cachedTransport;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const cfg = loadEmailConfig();
  const transport = getTransport();

  await transport.sendMail({
    from: cfg.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}

export async function sendTemplatedEmail(params: {
  templateKey: string;
  to: string;
  data: Record<string, string>;
  accent?: EmailAccent;
}): Promise<void> {
  const templates = await getEmailTemplates();
  const tpl = templates.find((t) => t.key === params.templateKey);
  if (!tpl) {
    throw new Error(`Email template not found: ${params.templateKey}`);
  }

  const branding = await getBrandingInfo();
  const data: Record<string, string> = {
    ...params.data,
    // Ensure any template token using {{app_name}} reflects Global Settings main company name.
    app_name: branding.name,
  };

  const contentHtml = renderTokens(textToHtmlContent(tpl.body_text), data, { html: true });
  const subject = renderTokens(tpl.subject, data);
  const text = renderTokens(tpl.body_text, data);
  const html = await wrapBrandedEmailHtml({
    title: tpl.title || subject,
    preheader: subject,
    contentHtml,
    accent: params.accent,
  });

  await sendEmail({
    to: params.to,
    subject,
    html,
    text,
  });
}

export function appName(): string {
  const v = process.env.APP_NAME;
  return v && v.trim() ? v.trim() : "";
}

export function apiOrigin(): string {
  const v = process.env.API_ORIGIN;
  if (v && v.trim()) return v.trim().replace(/\/$/, '');
  const port = process.env.PORT?.trim() ? process.env.PORT.trim() : '4000';
  return `http://localhost:${port}`;
}

export function webOrigin(): string {
  const v = process.env.WEB_ORIGIN;
  const trimmed = v && v.trim() ? v.trim() : '';
  return (trimmed || 'http://localhost:5173').replace(/\/$/, '');
}

/** Format a Date as "DD/MM/YYYY HH:MM" (local server time) */
export function formatLoginDateTime(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Best-effort human-readable location from an IP address */
export function describeIpLocation(ip: string | null | undefined): string {
  const raw = String(ip ?? '').trim();
  if (!raw) return 'Unknown';
  if (raw === '::1' || raw === '127.0.0.1') return 'Localhost';
  if (/^::ffff:127\./.test(raw)) return 'Localhost';
  if (/^10\./.test(raw) || /^192\.168\./.test(raw) || /^172\.(1[6-9]|2\d|3[01])\./.test(raw)) return 'Private Network';
  return 'Unknown';
}
