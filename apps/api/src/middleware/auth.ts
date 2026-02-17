import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

export type JwtPayload = {
  sub: string;
  email: string;
  name: string;
  roles: string[];
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.header("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: { message: "Missing bearer token" } });
  }

  const token = header.slice("bearer ".length);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: { message: "JWT_SECRET is not configured" } });
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ error: { message: "Invalid or expired token" } });
  }
};
