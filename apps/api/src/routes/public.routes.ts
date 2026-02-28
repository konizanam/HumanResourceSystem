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

export default router;
