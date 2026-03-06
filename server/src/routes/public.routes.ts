import { Router } from 'express';
import { query } from '../config/database';
import { getSystemSettings, updateSystemSettings } from '../services/systemSettings.service';

const router = Router();

function normalizePhone(rawValue: unknown): { value: string; digits: string } {
  const value = String(rawValue ?? '').trim();
  const digits = value.replace(/\D/g, '');
  return { value, digits };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sniffImageMime(data: Buffer): string | null {
  if (data.length >= 8) {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (data.subarray(0, 8).equals(pngSig)) return 'image/png';
  }

  if (data.length >= 3) {
    // JPEG: FF D8 FF
    if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  }

  if (data.length >= 6) {
    const head = data.subarray(0, 6).toString('ascii');
    if (head === 'GIF87a' || head === 'GIF89a') return 'image/gif';
  }

  if (data.length >= 12) {
    // WEBP: RIFF....WEBP
    const riff = data.subarray(0, 4).toString('ascii');
    const webp = data.subarray(8, 12).toString('ascii');
    if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  }

  return null;
}

router.get('/setup-status', async (_req, res) => {
  try {
    const settings = await getSystemSettings();
    const mainCompanyId = String(settings.main_company_id ?? '').trim() || null;

    if (!mainCompanyId) {
      return res.json({
        status: 'success',
        data: {
          setup_required: true,
          main_company_id: null,
        },
      });
    }

    const result = await query(
      `SELECT id
         FROM companies
        WHERE id = $1
        LIMIT 1`,
      [mainCompanyId],
    );

    const exists = result.rows.length > 0;

    return res.json({
      status: 'success',
      data: {
        setup_required: !exists,
        main_company_id: exists ? mainCompanyId : null,
      },
    });
  } catch {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to determine setup status',
    });
  }
});

router.post('/setup/main-company', async (req, res) => {
  try {
    const settings = await getSystemSettings();
    const configuredMainCompanyId = String(settings.main_company_id ?? '').trim();

    if (configuredMainCompanyId) {
      const existing = await query(
        `SELECT id
           FROM companies
          WHERE id = $1
          LIMIT 1`,
        [configuredMainCompanyId],
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'Main company is already configured',
        });
      }
    }

    const name = String(req.body?.name ?? '').trim();
    const industry = String(req.body?.industry ?? '').trim();
    const description = String(req.body?.description ?? '').trim();
    const website = String(req.body?.website ?? '').trim();
    const contactEmail = String(req.body?.contact_email ?? '').trim();
    const contactPhone = String(req.body?.contact_phone ?? '').trim();
    const addressLine1 = String(req.body?.address_line1 ?? '').trim();
    const addressLine2 = String(req.body?.address_line2 ?? '').trim();
    const city = String(req.body?.city ?? '').trim();
    const country = String(req.body?.country ?? '').trim();

    if (!name || !industry || !description || !contactEmail || !contactPhone || !addressLine1 || !addressLine2 || !city || !country) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required main company fields',
      });
    }

    if (!isValidEmail(contactEmail)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid contact email',
      });
    }

    if (website && !/^https?:\/\//i.test(website)) {
      return res.status(400).json({
        status: 'error',
        message: 'Website must start with http:// or https://',
      });
    }

    const phone = normalizePhone(contactPhone);
    if (phone.digits.length > 13) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number must not exceed 13 digits',
      });
    }

    if (!phone.digits.startsWith('264')) {
      return res.status(400).json({
        status: 'error',
        message: 'Phone number must start with +264',
      });
    }

    if (!/^\+?[\d\s]+$/.test(phone.value)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid phone format',
      });
    }

    const insertResult = await query(
      `INSERT INTO companies (
         name,
         industry,
         description,
         website,
         logo_url,
         contact_email,
         contact_phone,
         address_line1,
         address_line2,
         city,
         country,
         created_by,
         status
       ) VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, $10, NULL, 'active')
       RETURNING id`,
      [
        name,
        industry,
        description,
        website || null,
        contactEmail,
        contactPhone,
        addressLine1,
        addressLine2,
        city,
        country,
      ],
    );

    const companyId = String(insertResult.rows[0]?.id ?? '').trim();
    if (!companyId) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create main company',
      });
    }

    await updateSystemSettings({
      main_company_id: companyId,
      system_name: name,
    });

    return res.status(201).json({
      status: 'success',
      data: {
        main_company_id: companyId,
      },
    });
  } catch {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to set up main company',
    });
  }
});

router.get('/system-settings', async (_req, res) => {
  try {
    const settings = await getSystemSettings();
    res.json({ status: 'success', data: settings });
  } catch {
    res.status(500).json({ status: 'error', message: 'Failed to load system settings' });
  }
});

router.get('/jobs/:jobId/company', async (req, res) => {
  try {
    const jobId = String(req.params.jobId ?? '').trim();
    if (!jobId) {
      return res.status(400).json({ status: 'error', message: 'Missing job id' });
    }

    const { rows } = await query(
      `SELECT
         c.id,
         c.name,
         c.industry,
         c.description,
         c.website,
         c.logo_url,
         (c.logo_data IS NOT NULL) as has_logo,
         c.contact_email,
         c.contact_phone,
         c.address_line1,
         c.address_line2,
         c.city,
         c.country
       FROM jobs j
       JOIN companies c ON c.id = j.company_id
       WHERE j.id = $1
       LIMIT 1`,
      [jobId],
    );

    if (!rows.length) {
      return res.status(404).json({ status: 'error', message: 'Company not found for this job' });
    }

    return res.json({ status: 'success', data: rows[0] });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to load company information' });
  }
});

router.get('/companies/:companyId', async (req, res) => {
  try {
    const companyId = String(req.params.companyId ?? '').trim();
    if (!companyId) {
      return res.status(400).json({ status: 'error', message: 'Missing company id' });
    }

    const { rows } = await query(
      `SELECT
         id,
         name,
         industry,
         description,
         website,
         logo_url,
         (logo_data IS NOT NULL) as has_logo,
         contact_email,
         contact_phone,
         address_line1,
         address_line2,
         city,
         country
       FROM companies
       WHERE id = $1
       LIMIT 1`,
      [companyId],
    );

    if (!rows.length) {
      return res.status(404).json({ status: 'error', message: 'Company not found' });
    }

    return res.json({ status: 'success', data: rows[0] });
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to load company information' });
  }
});

router.get('/companies/:companyId/logo', async (req, res) => {
  try {
    const companyId = String(req.params.companyId ?? '').trim();
    if (!companyId) {
      return res.status(400).json({ status: 'error', message: 'Missing company id' });
    }

    const { rows } = await query(
      `SELECT logo_data, logo_mime
         FROM companies
        WHERE id = $1
        LIMIT 1`,
      [companyId],
    );

    const row = rows[0];

    const raw = (row as any)?.logo_data as unknown;
    let data: Buffer | null = null;
    if (raw instanceof Buffer) {
      data = raw;
    } else if (raw instanceof Uint8Array) {
      data = Buffer.from(raw);
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim();
      // pg can return BYTEA as a hex string like "\\x89504e47..."
      if (trimmed.startsWith('\\x') && trimmed.length > 2) {
        data = Buffer.from(trimmed.slice(2), 'hex');
      }
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Logo not found' });
    }

    const mimeRaw = typeof row?.logo_mime === 'string' ? row.logo_mime.trim() : '';
    const mimeFromData = sniffImageMime(data);
    const mime = mimeRaw && mimeRaw.startsWith('image/') ? mimeRaw : (mimeFromData ?? 'application/octet-stream');

    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(data);
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to load logo' });
  }
});

export default router;
