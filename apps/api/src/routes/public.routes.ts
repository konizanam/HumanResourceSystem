import { Router } from 'express';
import { query } from '../config/database';
import { getSystemSettings } from '../services/systemSettings.service';

const router = Router();

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
