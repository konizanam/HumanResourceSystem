import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { query } from '../config/database';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Support both legacy tokens (`userId`) and standard JWT subject (`sub`).
    const userId: string | undefined =
      typeof decoded?.userId === 'string'
        ? decoded.userId
        : typeof decoded?.sub === 'string'
          ? decoded.sub
          : undefined;

    if (!userId) {
      throw new UnauthorizedError('Invalid token');
    }

    const roles: string[] = Array.isArray(decoded?.roles)
      ? decoded.roles
      : [];

    // Check if user still exists and is active
    const result = await query(
      'SELECT id, email, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Get user permissions
    const permissionsResult = await query(
      `SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );

    const permissions = permissionsResult.rows.map(row => row.name);

    // Add permissions to the user object
    req.user = {
      userId,
      email: typeof decoded?.email === 'string' ? decoded.email : '',
      roles,
      permissions
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (!hasRole) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

// New middleware for permission-based authorization
export const authorizePermission = (...allowedPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Admin always has all permissions
    if (req.user.roles.includes('ADMIN')) {
      return next();
    }

    const hasPermission = req.user.permissions?.some(permission => 
      allowedPermissions.includes(permission)
    );

    if (!hasPermission) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

export const isJobSeeker = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user has JOB_SEEKER role
    if (!req.user.roles.includes('JOB_SEEKER')) {
      throw new ForbiddenError('This endpoint is for job seekers only');
    }

    next();
  } catch (error) {
    next(error);
  }
};