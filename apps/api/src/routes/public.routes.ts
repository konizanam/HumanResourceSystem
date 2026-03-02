import { Router } from 'express';
import { query } from '../config/database';
import { getSystemSettings } from '../services/systemSettings.service';

const router = Router();

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
    const data = row?.logo_data as Buffer | null | undefined;
    if (!data || !(data instanceof Buffer) || data.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Logo not found' });
    }

    const mimeRaw = typeof row?.logo_mime === 'string' ? row.logo_mime.trim() : '';
    const mime = mimeRaw || 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(data);
  } catch {
    return res.status(500).json({ status: 'error', message: 'Failed to load logo' });
  }
});

export default router;
