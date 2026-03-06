import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { message: "Not found" } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: "Validation error",
        issues: err.issues,
      },
    });
  }

  const status = typeof err?.status === "number" ? err.status : 500;
  const message = typeof err?.message === "string" ? err.message : "Server error";
  return res.status(status).json({ error: { message } });
};
