import { Request, Response, NextFunction } from 'express';
import { query as dbQuery } from '../config/database';

export const logAdminAction = (action: string, targetType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to capture response
    res.json = function(body) {
      // Log after response is sent
      setImmediate(async () => {
        try {
          if (!req.user) return;
          if (res.statusCode >= 400) return;

          const targetId =
            body?.id ??
            body?.data?.id ??
            body?.job?.id ??
            body?.user?.id ??
            body?.role_id ??
            body?.application_id ??
            req.params?.id ??
            req.params?.roleId ??
            req.params?.userId ??
            null;

          if (targetId) {
            await dbQuery(
              `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address, user_agent, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
              [
                req.user.userId,
                action,
                targetType,
                String(targetId),
                JSON.stringify({ params: req.params, body: req.body, response: body }),
                req.ip,
                req.get('user-agent')
              ]
            );
          }
        } catch (error) {
          console.error('Error logging admin action:', error);
        }
      });
      
      // Call original json method
      return originalJson.call(this, body);
    };
    
    next();
  };
};