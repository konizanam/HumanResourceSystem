import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { query } from '../config/database';

function normalizeIp(ip: string): string {
  if (!ip) return '';
  if (ip.startsWith('::ffff:')) {
    return ip.replace('::ffff:', '');
  }
  return ip;
}

function getVisitorIdentity(req: Request): { visitorHash: string; userId: string | null; ipAddress: string; userAgent: string } {
  const userId = req.user?.userId ?? null;
  const ipAddress = normalizeIp(req.ip || '');
  const userAgent = String(req.headers['user-agent'] || 'unknown');

  const rawIdentity = userId ? `user:${userId}` : `anon:${ipAddress}:${userAgent}`;
  const visitorHash = crypto.createHash('sha256').update(rawIdentity).digest('hex');

  return {
    visitorHash,
    userId,
    ipAddress,
    userAgent,
  };
}

function shouldTrack(req: Request, res: Response): boolean {
  if (res.statusCode >= 500) return false;
  if (!req.originalUrl.startsWith('/api/v1')) return false;

  const path = req.path || '';
  if (path.startsWith('/health')) return false;
  if (path.startsWith('/docs')) return false;

  return true;
}

export function visitorTrackingMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on('finish', () => {
    void (async () => {
      if (!shouldTrack(req, res)) return;

      const { visitorHash, userId, ipAddress, userAgent } = getVisitorIdentity(req);

      try {
        await query(
          `INSERT INTO daily_unique_visitors (
             visit_date,
             visitor_hash,
             user_id,
             ip_address,
             user_agent,
             first_path,
             first_seen_at,
             last_seen_at,
             request_count,
             created_at,
             updated_at
           ) VALUES (
             CURRENT_DATE,
             $1,
             $2,
             NULLIF($3, '')::inet,
             $4,
             $5,
             NOW(),
             NOW(),
             1,
             NOW(),
             NOW()
           )
           ON CONFLICT (visit_date, visitor_hash)
           DO UPDATE SET
             user_id = COALESCE(daily_unique_visitors.user_id, EXCLUDED.user_id),
             ip_address = COALESCE(daily_unique_visitors.ip_address, EXCLUDED.ip_address),
             user_agent = COALESCE(daily_unique_visitors.user_agent, EXCLUDED.user_agent),
             last_seen_at = NOW(),
             request_count = daily_unique_visitors.request_count + 1,
             updated_at = NOW()`,
          [visitorHash, userId, ipAddress, userAgent, req.originalUrl || req.path]
        );
      } catch (error) {
        console.error('Visitor tracking error:', error);
      }
    })();
  });

  next();
}
