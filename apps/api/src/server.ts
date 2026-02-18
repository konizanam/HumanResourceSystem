import cors from "cors";
import express from "express";
import helmet from "helmet";

import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { jobSeekerRouter } from "./routes/job-seeker";
import { createOpenApiSpec } from "./swagger";
import swaggerUi from "swagger-ui-express";
import { notFoundHandler, errorHandler } from "./errors";

export function createApp() {
  const app = express();

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

  app.use("/api/auth", authRouter);
  app.use("/api", meRouter);
  app.use("/api/job-seeker", jobSeekerRouter);

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(createOpenApiSpec()));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
