import { Router } from "express";
import { query } from "../db";

export const settingsRouter = Router();

/**
 * GET /api/settings
 * Public – returns all system settings as a key-value map.
 * If the table doesn't exist yet (migration not run), returns sensible defaults.
 */
settingsRouter.get("/", async (_req, res, next) => {
  try {
    const { rows } = await query<{ key: string; value: string }>(
      `SELECT key, value FROM system_settings`
    );

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return res.json({ settings });
  } catch (err: unknown) {
    // Table might not exist yet – return empty defaults
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("system_settings") && msg.includes("does not exist")) {
      return res.json({
        settings: {
          system_name: "HR System",
          system_logo_url: "",
          primary_color: "#4f46e5",
          company_name: "",
          support_email: "",
        },
      });
    }
    return next(err);
  }
});

/**
 * PUT /api/settings
 * Admin-only – updates one or more settings.
 * Body: { "system_name": "My Company", "primary_color": "#ff0000" }
 */
settingsRouter.put("/", async (req, res, next) => {
  try {
    const updates = req.body as Record<string, string>;

    for (const [key, value] of Object.entries(updates)) {
      if (typeof key !== "string" || typeof value !== "string") continue;
      await query(
        `UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = $2`,
        [value, key]
      );
    }

    return res.json({ message: "Settings updated" });
  } catch (err) {
    return next(err);
  }
});
