import fs from 'fs/promises';
import path from 'path';

export type EmailTemplate = {
  key: string;
  title: string;
  description: string;
  subject: string;
  body_text: string;
  body_html: string;
  placeholders: string[];
  updated_at?: string;
};

type StoredTemplate = {
  title?: string;
  description?: string;
  subject: string;
  body_text: string;
  placeholders?: string[];
  updated_at: string;
};

type StoredFile = {
  version: 2;
  templates: Record<string, StoredTemplate>;
};

const DEFAULT_TEMPLATES: Record<string, Omit<EmailTemplate, 'updated_at'>> = {
  registration_activation: {
    key: 'registration_activation',
    title: 'Registration & Activation',
    description: 'Sent after a new user registers. Includes an activation link.',
    subject: 'Activate your {{app_name}} account',
    body_text:
      'Dear {{user_full_name}},\n\n'
      + 'Welcome to {{app_name}}.\n\n'
      + 'Please activate your account by clicking the link below:\n'
      + '{{activation_link}}\n\n'
      + 'If you did not create this account, you can ignore this email.\n\n'
      + 'Regards,\n'
      + '{{app_name}} Team',
    body_html: '',
    placeholders: ['app_name', 'user_full_name', 'activation_link'],
  },
  auth_code: {
    key: 'auth_code',
    title: 'Authentication Code (2FA)',
    description: 'Sent during login to deliver a one-time authentication code (OTP).',
    subject: 'Your {{app_name}} authentication code',
    body_text:
      'Dear {{user_full_name}},\n\n'
      + 'Use the following authentication code to complete your login:\n'
      + '{{otp_code}}\n\n'
      + 'This code expires in {{otp_expires_minutes}} minutes.\n\n'
      + 'If you did not try to sign in, please reset your password or contact support at {{support_email}}.\n\n'
      + 'Regards,\n'
      + '{{app_name}} Team',
    body_html: '',
    placeholders: ['app_name', 'user_full_name', 'otp_code', 'otp_expires_minutes', 'support_email'],
  },
  application_success: {
    key: 'application_success',
    title: 'Successful Application',
    description: 'Sent when a job seeker successfully applies for a job.',
    subject: 'Application received: {{job_title}} at {{company_name}}',
    body_text:
      'Dear {{user_full_name}},\n\n'
      + 'We have received your application for {{job_title}} at {{company_name}}.\n\n'
      + 'You can review the job details using the View Job button below.\n'
      + 'Job link: {{job_link}}\n\n'
      + 'Thank you for using {{app_name}}.\n\n'
      + 'Regards,\n'
      + '{{app_name}} Team',
    body_html: '',
    placeholders: ['app_name', 'user_full_name', 'job_title', 'company_name', 'job_link'],
  },
  application_received: {
    key: 'application_received',
    title: 'Application Received (Employer/Admin)',
    description: 'Sent to employer/admin when a job seeker submits an application.',
    subject: 'New application for {{job_title}}',
    body_text:
      'Dear {{user_full_name}},\n\n'
      + '{{applicant_name}} has applied for {{job_title}}.\n\n'
      + 'Open applications using the View Job button below.\n'
      + 'Job link: {{job_link}}\n\n'
      + 'Regards,\n'
      + '{{app_name}} Team',
    body_html: '',
    placeholders: ['app_name', 'user_full_name', 'applicant_name', 'job_title', 'job_link'],
  },
  interview_invitation: {
    key: 'interview_invitation',
    title: 'Interview Invitation',
    description: 'Sent to invite a job seeker to an interview.',
    subject: 'Interview invitation: {{job_title}} at {{company_name}}',
    body_text:
      'Dear {{user_full_name}},\n\n'
      + 'You are invited to an interview for {{job_title}} at {{company_name}}.\n\n'
      + 'Date: {{interview_date}}\n'
      + 'Time: {{interview_time}}\n'
      + 'Location: {{interview_location}}\n'
      + 'Online Link: {{interview_online_link}}\n\n'
      + 'If you need to reschedule, please contact us at {{support_email}}.\n\n'
      + 'Regards,\n'
      + '{{company_name}} Recruitment Team',
    body_html: '',
    placeholders: [
      'user_full_name',
      'job_title',
      'company_name',
      'interview_date',
      'interview_time',
      'interview_location',
      'interview_online_link',
      'support_email',
    ],
  },
  application_rejected: {
    key: 'application_rejected',
    title: 'Application Rejected',
    description: 'Sent when an application is not successful.',
    subject: 'Update on your application: {{job_title}}',
    body_text:
      'Dear {{user_full_name}},\n\n'
      + 'Thank you for your interest in {{job_title}} at {{company_name}}.\n\n'
      + 'After careful consideration, we will not be moving forward with your application at this time.\n\n'
      + 'We encourage you to apply for other opportunities on {{app_name}}.\n\n'
      + 'Regards,\n'
      + '{{company_name}} Recruitment Team',
    body_html: '',
    placeholders: ['app_name', 'user_full_name', 'job_title', 'company_name'],
  },
  job_alert: {
    key: 'job_alert',
    title: 'Job Alert',
    description: 'Sent when a new job matches a user\'s alert preferences.',
    subject: 'New job alert: {{job_title}}',
    body_text:
      'Hi {{user_full_name}},\n\n'
      + 'A new job was posted that may match your preferences:\n'
      + '{{job_title}} at {{company_name}}\n\n'
      + 'Use the View Job button below to open this opportunity.\n'
      + 'Job link: {{job_link}}\n\n'
      + '{{unsubscribe_link}}\n\n'
      + 'Regards,\n'
      + '{{app_name}} Team',
    body_html: '',
    placeholders: ['app_name', 'user_full_name', 'job_title', 'company_name', 'job_link', 'unsubscribe_link'],
  },
  login_notification: {
    key: 'login_notification',
    title: 'Login Notification',
    description: 'Sent to a user after a successful login to notify them of new account access.',
    subject: 'New sign-in to your {{app_name}} account',
    body_text:
      'Dear {{user_full_name}},\n\n'
      + 'A new sign-in to your {{app_name}} account was detected.\n\n'
      + '{{login_info_block}}\n\n'
      + 'If this was you, no action is required.\n\n'
      + 'If you did not sign in, please change your password immediately and contact support at {{support_email}}.\n\n'
      + 'Regards,\n'
      + '{{app_name}} Team',
    body_html: '',
    placeholders: [
      'app_name',
      'user_full_name',
      'login_info_block',
      'login_date_time',
      'login_ip',
      'login_location',
      'login_device',
      'support_email',
    ],
  },
  account_activated: {
    key: 'account_activated',
    title: 'Account Activated',
    description: 'Sent when a user successfully activates their account via email activation link.',
    subject: 'Your {{app_name}} account is now active',
    body_text:
      'Dear {{user_full_name}},\n\n'
      + 'Your account has been activated successfully. You can now sign in using the link below:\n'
      + '{{login_link}}\n\n'
      + 'If you did not activate this account, please contact support at {{support_email}}.\n\n'
      + 'Regards,\n'
      + '{{app_name}} Team',
    body_html: '',
    placeholders: ['app_name', 'user_full_name', 'login_link', 'support_email'],
  },
  password_reset: {
    key: 'password_reset',
    title: 'Password Reset',
    description: 'Sent when a user requests a password reset link.',
    subject: 'Reset your {{app_name}} password',
    body_text:
      'Dear {{user_full_name}},\n\n'
      + 'A request was received to reset your {{app_name}} password.\n\n'
      + 'Use the link below to create a new password:\n'
      + '{{reset_link}}\n\n'
      + 'This link expires in {{reset_expires_minutes}} minutes.\n\n'
      + 'If you did not request this reset, you can safely ignore this email or contact support at {{support_email}}.\n\n'
      + 'Regards,\n'
      + '{{app_name}} Team',
    body_html: '',
    placeholders: ['app_name', 'user_full_name', 'reset_link', 'reset_expires_minutes', 'support_email'],
  },
  admin_user_welcome: {
    key: 'admin_user_welcome',
    title: 'Admin User Welcome',
    description: 'Sent when an admin creates a new non-job-seeker user account.',
    subject: 'Your {{app_name}} account is ready',
    body_text:
      'Dear {{user_full_name}},\n\n'
      + 'An account has been created for you on {{app_name}}.\n\n'
      + 'Sign-in email: {{user_email}}\n'
      + 'Assigned role: {{role_name}}\n'
      + 'To activate your account and set your password, click the link below:\n'
      + '{{activation_link}}\n\n'
      + 'If you were not expecting this account, contact support at {{support_email}}.\n\n'
      + 'Regards,\n'
      + '{{app_name}} Team',
    body_html: '',
    placeholders: [
      'app_name',
      'user_full_name',
      'user_email',
      'role_name',
      'activation_link',
      'support_email',
    ],
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToHtml(bodyText: string): string {
  const normalized = String(bodyText ?? '').replace(/\r\n/g, '\n');
  const paragraphs = normalized.split(/\n\n+/g);

  const htmlParts = paragraphs
    .map((p) => {
      const escaped = escapeHtml(p);
      const withBreaks = escaped.replace(/\n/g, '<br/>');
      return `<p>${withBreaks}</p>`;
    })
    .join('\n');

  return `<!doctype html><html><body>${htmlParts}</body></html>`;
}

function htmlToText(bodyHtml: string): string {
  const raw = String(bodyHtml ?? '');
  // Very lightweight conversion for our simple templates.
  let t = raw;
  t = t.replace(/\r\n/g, '\n');
  t = t.replace(/<\s*br\s*\/?\s*>/gi, '\n');
  t = t.replace(/<\s*\/p\s*>/gi, '\n\n');
  t = t.replace(/<\s*p\s*>/gi, '');
  t = t.replace(/<[^>]+>/g, '');

  // Basic entity decode.
  t = t
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

  // Normalize trailing whitespace.
  return t.replace(/\s+$/g, '').trim();
}

function storageFilePath(): string {
  // Prefer env override (useful in container/prod).
  if (process.env.EMAIL_TEMPLATES_PATH) {
    return path.resolve(process.env.EMAIL_TEMPLATES_PATH);
  }

  // Default to a file inside the API project folder: apps/api/data/email-templates.json
  // When compiled, __dirname is .../apps/api/dist/services.
  return path.resolve(__dirname, '..', '..', 'data', 'email-templates.json');
}

async function readStoredFile(): Promise<StoredFile | null> {
  try {
    const raw = await fs.readFile(storageFilePath(), 'utf8');
    const parsed = JSON.parse(raw) as any;
    if (!parsed || typeof parsed !== 'object') return null;

    // v2 format
    if (parsed.version === 2 && typeof parsed.templates === 'object' && parsed.templates) {
      return {
        version: 2,
        templates: parsed.templates as Record<string, StoredTemplate>,
      };
    }

    // v1 migration: { version: 1, templates: { key: { subject, body_html, updated_at } } }
    if (parsed.version === 1 && typeof parsed.templates === 'object' && parsed.templates) {
      const migrated: StoredFile = { version: 2, templates: {} };
      for (const [key, value] of Object.entries(parsed.templates as Record<string, any>)) {
        const subject = typeof value?.subject === 'string' ? value.subject : '';
        const bodyHtml = typeof value?.body_html === 'string' ? value.body_html : '';
        const updated_at = typeof value?.updated_at === 'string' ? value.updated_at : new Date().toISOString();
        migrated.templates[key] = {
          subject,
          body_text: htmlToText(bodyHtml),
          updated_at,
        };
      }
      return migrated;
    }

    return null;
  } catch {
    return null;
  }
}

async function writeStoredFile(file: StoredFile): Promise<void> {
  const filePath = storageFilePath();
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(file, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

export function getDefaultEmailTemplates(): EmailTemplate[] {
  return Object.keys(DEFAULT_TEMPLATES).map((key) => ({
    ...DEFAULT_TEMPLATES[key],
    body_html: textToHtml(DEFAULT_TEMPLATES[key].body_text),
  }));
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const stored = await readStoredFile();

  const out: EmailTemplate[] = [];

  // Defaults (with optional overrides)
  for (const key of Object.keys(DEFAULT_TEMPLATES)) {
    const base = DEFAULT_TEMPLATES[key];
    const override = stored?.templates?.[key];
    const subject = typeof override?.subject === 'string' && override.subject.trim()
      ? override.subject
      : base.subject;
    const body_text = typeof override?.body_text === 'string'
      ? override.body_text
      : base.body_text;
    const placeholders = Array.isArray(override?.placeholders)
      ? override.placeholders.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim())
      : base.placeholders;

    out.push({
      ...base,
      subject,
      body_text,
      body_html: textToHtml(body_text),
      placeholders,
      updated_at: typeof override?.updated_at === 'string' ? override.updated_at : undefined,
    });
  }

  // Custom templates stored in file but not in defaults
  if (stored?.templates) {
    for (const [key, value] of Object.entries(stored.templates)) {
      if (DEFAULT_TEMPLATES[key]) continue;
      const title = typeof value?.title === 'string' && value.title.trim() ? value.title : key;
      const description = typeof value?.description === 'string' ? value.description : '';
      const subject = typeof value?.subject === 'string' ? value.subject : '';
      const body_text = typeof value?.body_text === 'string' ? value.body_text : '';
      const placeholders = Array.isArray(value?.placeholders)
        ? value.placeholders.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim())
        : [];
      out.push({
        key,
        title,
        description,
        subject,
        body_text,
        body_html: textToHtml(body_text),
        placeholders,
        updated_at: typeof value?.updated_at === 'string' ? value.updated_at : undefined,
      });
    }
  }

  return out;
}

export async function updateEmailTemplate(
  key: string,
  updates: {
    title?: string;
    description?: string;
    subject: string;
    body_text: string;
    placeholders?: string[];
  },
): Promise<EmailTemplate> {
  const now = new Date().toISOString();

  const stored = (await readStoredFile()) ?? { version: 2 as const, templates: {} };
  const base = DEFAULT_TEMPLATES[key];
  const existing = stored.templates[key];

  stored.templates[key] = {
    title:
      typeof updates.title === 'string' && updates.title.trim()
        ? updates.title.trim()
        : typeof existing?.title === 'string'
          ? existing.title
          : base?.title,
    description:
      typeof updates.description === 'string'
        ? updates.description
        : typeof existing?.description === 'string'
          ? existing.description
          : base?.description,
    subject: updates.subject,
    body_text: updates.body_text,
    placeholders: Array.isArray(updates.placeholders)
      ? updates.placeholders.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim())
      : existing?.placeholders,
    updated_at: now,
  };

  await writeStoredFile(stored);

  const mergedTitle = stored.templates[key].title ?? base?.title ?? key;
  const mergedDesc = stored.templates[key].description ?? base?.description ?? '';
  const mergedPlaceholders = Array.isArray(stored.templates[key].placeholders)
    ? (stored.templates[key].placeholders as string[])
    : base?.placeholders ?? [];

  return {
    key,
    title: mergedTitle,
    description: mergedDesc,
    subject: updates.subject,
    body_text: updates.body_text,
    body_html: textToHtml(updates.body_text),
    placeholders: mergedPlaceholders,
    updated_at: now,
  };
}

export function isEmailTemplateKey(v: string): boolean {
  return typeof v === 'string' && /^[a-z0-9][a-z0-9_-]{2,63}$/.test(v);
}

export function isDefaultEmailTemplateKey(key: string): boolean {
  return Boolean(DEFAULT_TEMPLATES[key]);
}

export function parsePlaceholdersList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((v) => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}
