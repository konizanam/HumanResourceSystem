import { Router, type Request } from 'express';
import geoip from 'geoip-lite';

export const geoRouter = Router();

function extractClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  const raw =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    req.ip;

  if (!raw) return null;
  return raw.replace(/^::ffff:/, '');
}

geoRouter.get('/ip', (req, res) => {
  const ip = extractClientIp(req);
  const lookup = ip ? geoip.lookup(ip) : null;
  const countryCode = lookup?.country ?? null;

  res.json({
    ip,
    countryCode,
    countryName: countryCode === 'NA' ? 'Namibia' : null,
    region: lookup?.region ?? null,
    city: lookup?.city ?? null,
  });
});
