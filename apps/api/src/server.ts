import express from "express";

export function createApp() {
  const app = express();

  app.get("/", (req, res) => {
    res.json({ message: "API running" });
  });

  return app;
}
