"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendTemplatedEmail = sendTemplatedEmail;
exports.appName = appName;
exports.apiOrigin = apiOrigin;
exports.webOrigin = webOrigin;
const nodemailer_1 = __importDefault(require("nodemailer"));
const emailTemplates_service_1 = require("./emailTemplates.service");
function requiredEnv(name) {
    const v = process.env[name];
    if (!v || !v.trim())
        throw new Error(`${name} is not configured`);
    return v.trim();
}
function parseBool(value, fallback) {
    if (value === undefined)
        return fallback;
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes')
        return true;
    if (v === 'false' || v === '0' || v === 'no')
        return false;
    return fallback;
}
function loadEmailConfig() {
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
function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function supportEmail() {
    const v = process.env.SUPPORT_EMAIL;
    if (v && v.trim())
        return v.trim();
    const from = process.env.EMAIL_FROM;
    if (from && from.trim())
        return from.trim();
    return '';
}
function emailLogoUrl() {
    const v = process.env.EMAIL_LOGO_URL;
    if (v && v.trim())
        return v.trim();
    const origin = webOrigin();
    if (!origin)
        return '';
    return `${origin}/hito-logo.png`;
}
function textToHtmlContent(bodyText) {
    const normalized = String(bodyText ?? '').replace(/\r\n/g, '\n');
    const paragraphs = normalized.split(/\n\n+/g);
    return paragraphs
        .map((p) => {
        const escaped = escapeHtml(p);
        const withBreaks = escaped.replace(/\n/g, '<br/>');
        // Linkify http(s) URLs.
        const linked = withBreaks.replace(/(https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+)/g, (url) => `<a href="${url}" style="color:#2563eb; text-decoration:underline;">${url}</a>`);
        return `<p style="margin:0 0 14px 0;">${linked}</p>`;
    })
        .join('');
}
function wrapBrandedEmailHtml(params) {
    const year = new Date().getFullYear();
    const logo = emailLogoUrl();
    const support = supportEmail();
    const brand = appName();
    const preheader = params.preheader ? escapeHtml(params.preheader) : '';
    return (`<!doctype html>`
        + `<html lang="en">`
        + `<head>`
        + `<meta charset="utf-8"/>`
        + `<meta name="viewport" content="width=device-width, initial-scale=1"/>`
        + `<meta name="x-apple-disable-message-reformatting"/>`
        + `<title>${escapeHtml(params.title)}</title>`
        + `</head>`
        + `<body style="margin:0; padding:0; background:#f6f7fb;">`
        + `<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${preheader}</div>`
        + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse; background:#f6f7fb;">`
        + `<tr><td align="center" style="padding:28px 12px;">`
        + `<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="border-collapse:collapse; max-width:600px; width:100%;">`
        + `<tr><td style="padding:0 0 14px 0;">`
        + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">`
        + `<tr>`
        + `<td style="vertical-align:middle;">`
        + (logo
            ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(brand)}" height="36" style="display:block; height:36px; width:auto;"/>`
            : `<div style="font-family:Arial, sans-serif; font-size:18px; font-weight:700; color:#0f172a;">${escapeHtml(brand)}</div>`)
        + `</td>`
        + `<td align="right" style="vertical-align:middle; font-family:Arial, sans-serif; font-size:12px; color:#475569;">${escapeHtml(brand)}</td>`
        + `</tr>`
        + `</table>`
        + `</td></tr>`
        + `<tr><td style="background:#ffffff; border-radius:14px; padding:22px 22px 18px 22px; border:1px solid #e6e8f0;">`
        + `<div style="font-family:Arial, sans-serif; font-size:18px; font-weight:700; color:#0f172a; margin:0 0 10px 0;">${escapeHtml(params.title)}</div>`
        + `<div style="font-family:Arial, sans-serif; font-size:14px; line-height:1.55; color:#0f172a;">${params.contentHtml}</div>`
        + `</td></tr>`
        + `<tr><td style="padding:14px 4px 0 4px; font-family:Arial, sans-serif; font-size:12px; line-height:1.4; color:#64748b;">`
        + `<div style="margin:0 0 6px 0;">This is an automated message from ${escapeHtml(brand)}.</div>`
        + (support ? `<div style="margin:0;">Need help? Contact <a href="mailto:${escapeHtml(support)}" style="color:#2563eb; text-decoration:underline;">${escapeHtml(support)}</a>.</div>` : '')
        + `<div style="margin:10px 0 0 0;">© ${year} ${escapeHtml(brand)}</div>`
        + `</td></tr>`
        + `</table>`
        + `</td></tr>`
        + `</table>`
        + `</body></html>`);
}
function renderTokens(input, data, opts) {
    let out = String(input ?? '');
    for (const [key, rawValue] of Object.entries(data)) {
        const token = `{{${key}}}`;
        if (opts?.html && key === 'activation_link') {
            const url = String(rawValue ?? '');
            const safe = escapeHtml(url);
            out = out.split(token).join(`<a href="${safe}">${safe}</a>`);
            continue;
        }
        if (opts?.html && key === 'otp_code') {
            const code = escapeHtml(String(rawValue ?? ''));
            out = out
                .split(token)
                .join(`<span style="display:inline-block; padding:6px 10px; border-radius:10px; background:#eef2ff; border:1px solid #e0e7ff; font-weight:700; letter-spacing:2px;">${code}</span>`);
            continue;
        }
        const value = opts?.html ? escapeHtml(String(rawValue ?? '')) : String(rawValue ?? '');
        out = out.split(token).join(value);
    }
    return out;
}
let cachedTransport = null;
function getTransport() {
    if (cachedTransport)
        return cachedTransport;
    const cfg = loadEmailConfig();
    cachedTransport = nodemailer_1.default.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.pass },
    });
    return cachedTransport;
}
async function sendEmail(params) {
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
async function sendTemplatedEmail(params) {
    const templates = await (0, emailTemplates_service_1.getEmailTemplates)();
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
function appName() {
    const v = process.env.APP_NAME;
    return v && v.trim() ? v.trim() : 'Human Resource System';
}
function apiOrigin() {
    const v = process.env.API_ORIGIN;
    if (v && v.trim())
        return v.trim().replace(/\/$/, '');
    const port = process.env.PORT?.trim() ? process.env.PORT.trim() : '4000';
    return `http://localhost:${port}`;
}
function webOrigin() {
    const v = process.env.WEB_ORIGIN;
    return v && v.trim() ? v.trim().replace(/\/$/, '') : '';
}
//# sourceMappingURL=emailSender.service.js.map