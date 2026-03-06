import { NextFunction, Request, Response } from 'express';
import { logAudit } from '../helpers/auditLogger';
import { query } from '../config/database';

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
  if (segments.includes('subcategories')) return 'subcategory';
  if (segments.includes('categories')) return 'category';
  if (segments.includes('roles')) return 'role';
  if (segments.includes('permissions')) return 'permission';
  if (segments.includes('applications')) return 'application';
  if (segments.includes('jobs')) return 'job';
  if (segments.includes('companies')) return 'company';
  if (segments.includes('users')) return 'user';
  if (segments.includes('templates')) return 'email_template';
  if (segments.includes('auth')) return 'auth';
  const firstSegment = segments[0];
  return firstSegment || 'system';
}

function inferTargetId(req: Request, normalizedPath: string): string | undefined {
  const preferredParamKeys = ['applicationId', 'permissionId', 'roleId', 'templateId', 'id', 'jobId', 'companyId', 'userId'];
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

function resolveTableName(targetType: string): string | null {
  if (targetType === 'job') return 'jobs';
  if (targetType === 'company') return 'companies';
  if (targetType === 'application') return 'applications';
  if (targetType === 'applicant' || targetType === 'user') return 'users';
  if (targetType === 'role') return 'roles';
  if (targetType === 'permission') return 'permissions';
  if (targetType === 'category') return 'job_categories';
  if (targetType === 'subcategory') return 'job_subcategories';
  if (targetType === 'email_template') return 'email_templates';
  return null;
}

async function fetchSnapshot(targetType: string, targetId?: string): Promise<Record<string, unknown> | null> {
  if (!targetId) return null;
  const tableName = resolveTableName(targetType);
  if (!tableName) return null;

  try {
    const result = await query(`SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1`, [targetId]);
    return result.rows[0] ? (result.rows[0] as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function crudAuditMiddleware(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const defaultAction = METHOD_ACTION[method];

  if (!defaultAction) {
    return next();
  }

  const normalizedPath = normalizePath(req.originalUrl || req.url || '');
  const initialTargetType = inferTargetType(normalizedPath);
  const initialTargetId = inferTargetId(req, normalizedPath);
  const beforeSnapshot = defaultAction === 'UPDATE'
    ? await fetchSnapshot(initialTargetType, initialTargetId)
    : null;

  res.on('finish', () => {
    void (async () => {
      if (res.statusCode >= 400) {
        return;
      }

      const userId =
        (req.user?.userId as string | undefined) ||
        (res.locals?.auditUserId as string | undefined);

      if (!userId) {
        return;
      }

      const finalNormalizedPath = normalizePath(req.originalUrl || req.url || '');
      const targetType = (res.locals?.auditTargetType as string | undefined) || inferTargetType(finalNormalizedPath);
      const targetId = (res.locals?.auditTargetId as string | undefined) || inferTargetId(req, finalNormalizedPath);
      const action = (res.locals?.auditAction as string | undefined) || `${targetType.toUpperCase()}_${defaultAction}`;

      const afterSnapshot = defaultAction === 'UPDATE'
        ? await fetchSnapshot(targetType, targetId)
        : null;

      const details: Record<string, unknown> = {
        method,
        path: `/${finalNormalizedPath}`,
        statusCode: res.statusCode,
        ip: req.ip,
      };

      if (defaultAction === 'UPDATE') {
        details.before = beforeSnapshot;
        details.after = afterSnapshot ?? req.body ?? null;
      }

      await logAudit({
        userId,
        action,
        targetType,
        targetId,
        details,
      });
    })();
  });

  return next();
}
