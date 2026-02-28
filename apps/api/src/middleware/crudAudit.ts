import { NextFunction, Request, Response } from 'express';
import { logAudit } from '../helpers/auditLogger';

const METHOD_ACTION: Record<string, string> = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

function normalizePath(originalUrl: string): string {
  const path = originalUrl.split('?')[0] || '';
  return path.replace(/^\/api\/v1\/?/, '');
}

function inferTargetType(normalizedPath: string): string {
  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments.includes('applications')) return 'application';
  if (segments.includes('jobs')) return 'job';
  if (segments.includes('companies')) return 'company';
  if (segments.includes('users')) return 'user';
  if (segments.includes('auth')) return 'auth';
  const firstSegment = segments[0];
  return firstSegment || 'system';
}

function inferTargetId(req: Request, normalizedPath: string): string | undefined {
  const preferredParamKeys = ['applicationId', 'id', 'jobId', 'companyId', 'userId'];
  for (const key of preferredParamKeys) {
    const value = req.params?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const segment = segments[i];
    if (/^[0-9a-fA-F-]{32,36}$/.test(segment) || /^\d+$/.test(segment)) {
      return segment;
    }
  }

  return undefined;
}

export function crudAuditMiddleware(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const defaultAction = METHOD_ACTION[method];

  if (!defaultAction) {
    return next();
  }

  res.on('finish', () => {
    if (res.statusCode >= 400) {
      return;
    }

    const userId =
      (req.user?.userId as string | undefined) ||
      (res.locals?.auditUserId as string | undefined);

    if (!userId) {
      return;
    }

    const normalizedPath = normalizePath(req.originalUrl || req.url || '');
    const targetType = (res.locals?.auditTargetType as string | undefined) || inferTargetType(normalizedPath);
    const targetId = (res.locals?.auditTargetId as string | undefined) || inferTargetId(req, normalizedPath);
    const action = (res.locals?.auditAction as string | undefined) || `${targetType.toUpperCase()}_${defaultAction}`;

    void logAudit({
      userId,
      action,
      targetType,
      targetId,
      details: {
        method,
        path: `/${normalizedPath}`,
        statusCode: res.statusCode,
        ip: req.ip,
      },
    });
  });

  return next();
}
