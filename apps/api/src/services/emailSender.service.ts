import nodemailer from 'nodemailer';
import { getEmailTemplates, type EmailTemplate } from './emailTemplates.service';

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

function emailLogoUrl(): string {
  const v = process.env.EMAIL_LOGO_URL;
  if (v && v.trim()) return v.trim();

  const origin = webOrigin();
  if (!origin) return '';
  return `${origin}/hito-logo.png`;
}

function textToHtmlContent(bodyText: string): string {
  const normalized = String(bodyText ?? '').replace(/\r\n/g, '\n');
  const paragraphs = normalized.split(/\n\n+/g);

  return paragraphs
    .map((p) => {
      const escaped = escapeHtml(p);
      const withBreaks = escaped.replace(/\n/g, '<br/>');
      // Linkify http(s) URLs.
      const linked = withBreaks.replace(
        /(https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+)/g,
        (url) => `<a href="${url}" style="color:#1d4ed8; text-decoration:underline; font-weight:600;">${url}</a>`
      );
      return `<p style="margin:0 0 14px 0; font-size:14px; line-height:1.65; color:#1e293b;">${linked}</p>`;
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

function wrapBrandedEmailHtml(params: {
  title: string;
  preheader?: string;
  contentHtml: string;
}): string {
  const year = new Date().getFullYear();
  const logo = emailLogoUrl();
  const support = supportEmail();
  const brand = appName();
  const preheader = params.preheader ? escapeHtml(params.preheader) : '';
  const nowText = toDisplayDate();

  return (
    `<!doctype html>`
    + `<html lang="en">`
    + `<head>`
    + `<meta charset="utf-8"/>`
    + `<meta name="viewport" content="width=device-width, initial-scale=1"/>`
    + `<meta name="x-apple-disable-message-reformatting"/>`
    + `<title>${escapeHtml(params.title)}</title>`
    + `</head>`
    + `<body style="margin:0; padding:0; background:#f2f5fb;">`
    + `<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${preheader}</div>`
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse; background:#f2f5fb;">`
    + `<tr><td align="center" style="padding:30px 12px;">`
    + `<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse; max-width:600px; width:100%;">`
    + `<tr><td style="padding:0 0 12px 0;">`
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">`
    + `<tr>`
    + `<td style="vertical-align:middle;">`
    + (logo
      ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(brand)}" height="36" style="display:block; height:36px; width:auto;"/>`
      : `<div style="font-family:Arial, sans-serif; font-size:18px; font-weight:700; color:#0f172a;">${escapeHtml(brand)}</div>`)
    + `</td>`
    + `<td align="right" style="vertical-align:middle; font-family:Arial, sans-serif; font-size:12px; color:#64748b;">${escapeHtml(nowText)}</td>`
    + `</tr>`
    + `</table>`
    + `</td></tr>`
    + `<tr><td style="background:#ffffff; border-radius:16px; border:1px solid #e6e8f0; box-shadow:0 10px 30px rgba(15,23,42,0.06); overflow:hidden;">`
    + `<div style="height:6px; background:linear-gradient(90deg, #6366f1 0%, #4338ca 100%);"></div>`
    + `<div style="padding:22px 22px 10px 22px;">`
    + `<div style="display:inline-block; margin:0 0 10px 0; font-family:Arial, sans-serif; font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#4338ca; background:#eef2ff; border:1px solid #e0e7ff; border-radius:999px; padding:5px 10px;">Notification</div>`
    + `<div style="font-family:Arial, sans-serif; font-size:20px; font-weight:800; color:#0f172a; margin:0 0 12px 0; line-height:1.25;">${escapeHtml(params.title)}</div>`
    + `<div style="font-family:Arial, sans-serif; font-size:14px; line-height:1.65; color:#1e293b;">${params.contentHtml}</div>`
    + `</div>`
    + `</td></tr>`
    + `<tr><td style="padding:14px 6px 0 6px;">`
    + `<div style="font-family:Arial, sans-serif; font-size:12px; line-height:1.55; color:#64748b; background:#ffffff; border:1px solid #e6e8f0; border-radius:12px; padding:12px 14px;">`
    + `<div style="margin:0 0 6px 0;">This is an automated message from <strong style="color:#334155;">${escapeHtml(brand)}</strong>.</div>`
    + (support ? `<div style="margin:0;">Need help? Contact <a href="mailto:${escapeHtml(support)}" style="color:#1d4ed8; text-decoration:underline; font-weight:600;">${escapeHtml(support)}</a>.</div>` : '')
    + `<div style="margin:8px 0 0 0;">© ${year} ${escapeHtml(brand)}</div>`
    + `</div>`
    + `</td></tr>`
    + `</table>`
    + `</td></tr>`
    + `</table>`
    + `</body></html>`
  );
}

function renderTokens(input: string, data: Record<string, string>, opts?: { html?: boolean }) {
  let out = String(input ?? '');

  for (const [key, rawValue] of Object.entries(data)) {
    const token = `{{${key}}}`;

    if (opts?.html && key === 'activation_link') {
      const url = String(rawValue ?? '');
      const safe = escapeHtml(url);
      const activationHtml = url
        ? `<div style="margin:8px 0 12px 0;">`
          + `<a href="${safe}" style="display:inline-block; background:#4338ca; color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; line-height:1; padding:12px 18px; border-radius:10px;">Activate Account</a>`
          + `</div>`
          + `<div style="font-size:12px; color:#64748b; word-break:break-all;">${safe}</div>`
        : '';
      out = out.split(token).join(activationHtml);
      continue;
    }

    if (opts?.html && key === 'otp_code') {
      const code = escapeHtml(String(rawValue ?? ''));
      out = out
        .split(token)
        .join(`<span style="display:inline-block; padding:6px 10px; border-radius:10px; background:#eef2ff; border:1px solid #e0e7ff; font-weight:700; letter-spacing:2px;">${code}</span>`);
      continue;
    }

    if (opts?.html && key === 'job_link') {
      const url = String(rawValue ?? '').trim();
      const safe = escapeHtml(url);
      const buttonHtml = url
        ? `<div style="margin:8px 0 12px 0;">`
          + `<a href="${safe}" style="display:inline-block; background:#4338ca; color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; line-height:1; padding:12px 18px; border-radius:10px;">View Job</a>`
          + `</div>`
          + `<div style="font-size:12px; color:#64748b; word-break:break-all;">${safe}</div>`
        : '';
      out = out.split(token).join(buttonHtml);
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
}): Promise<void> {
  const templates = await getEmailTemplates();
  const tpl = templates.find((t) => t.key === params.templateKey);
  if (!tpl) {
    throw new Error(`Email template not found: ${params.templateKey}`);
  }

  // Render from body_text so admins can edit without HTML.
  const contentHtml = renderTokens(textToHtmlContent(tpl.body_text), params.data, { html: true });
  const subject = renderTokens(tpl.subject, params.data);
  const text = renderTokens(tpl.body_text, params.data);
  const html = wrapBrandedEmailHtml({
    title: tpl.title || subject,
    preheader: subject,
    contentHtml,
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
  return v && v.trim() ? v.trim() : 'Human Resource System';
}

export function apiOrigin(): string {
  const v = process.env.API_ORIGIN;
  if (v && v.trim()) return v.trim().replace(/\/$/, '');
  const port = process.env.PORT?.trim() ? process.env.PORT.trim() : '4000';
  return `http://localhost:${port}`;
}

export function webOrigin(): string {
  const v = process.env.WEB_ORIGIN;
  return v && v.trim() ? v.trim().replace(/\/$/, '') : '';
}
