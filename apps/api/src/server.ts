import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";

import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { jobSeekerRouter } from "./routes/job-seeker";
import { settingsRouter } from "./routes/settings";
import { companiesRouter } from "./routes/companies";
import { uploadRouter } from "./routes/upload";
import { createOpenApiSpec } from "./swagger";
import swaggerUi from "swagger-ui-express";
import { notFoundHandler, errorHandler } from "./errors";

export function createApp() {
  const app = express();

  // ── Serve uploaded files (BEFORE helmet so security headers don't block viewing) ──
  app.use(
    "/uploads",
    cors({ origin: "*" }), // allow any origin to view uploaded files
    express.static(path.join(__dirname, "..", "uploads"), {
      setHeaders(res, filePath) {
        // Let the browser display files inline rather than forcing download
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap: Record<string, string> = {
          ".pdf": "application/pdf",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".doc": "application/msword",
          ".docx":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
        if (mimeMap[ext]) {
          res.setHeader("Content-Type", mimeMap[ext]);
        }
        res.setHeader("Content-Disposition", "inline");
        // Allow cross-origin embedding/fetching
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      },
    })
  );

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // ── Routes ──────────────────────────────────────────
  app.use("/api/auth", authRouter);
  app.use("/api", meRouter);
  app.use("/api/job-seeker", jobSeekerRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/companies", companiesRouter);
  app.use("/api/upload", uploadRouter);

  // ── Docs ────────────────────────────────────────────
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(createOpenApiSpec()));

  // ── Error handling ──────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
