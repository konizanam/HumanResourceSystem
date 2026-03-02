import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

export type CompanyApprovalMode = "auto_approved" | "pending";

export type SystemSettings = {
  version: 1;
  company_approval_mode: CompanyApprovalMode;
  system_name: string;
  branding_logo_url: string;
  app_color: string;
  main_company_id: string | null;
};

const DEFAULT_SETTINGS: SystemSettings = {
  version: 1,
  company_approval_mode: "auto_approved",
  system_name: "Human Resource System",
  branding_logo_url: "",
  app_color: "#6366f1",
  main_company_id: null,
};

function normalizeHexColor(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(withHash);
  if (!match) return null;

  const hex = match[1].length === 3
    ? match[1].split("").map((c) => c + c).join("")
    : match[1];

  return `#${hex.toLowerCase()}`;
}

const RESOLVED_SETTINGS_FILE_PATH = resolveSettingsFilePath();

function resolveSettingsFilePath(): string {
  // Allow overrides for deployments.
  const override = String(process.env.SYSTEM_SETTINGS_PATH ?? "").trim();
  if (override) return path.resolve(override);

  // Prefer stable project locations so dev (src) and prod (dist)
  // read/write the same file.
  const candidates = [
    // When running from the apps/api package directory.
    path.resolve(process.cwd(), "data", "system-settings.json"),
    // When running from the monorepo root.
    path.resolve(process.cwd(), "apps", "api", "data", "system-settings.json"),
    // Backwards-compatible fallback (older behavior).
    path.resolve(__dirname, "..", "..", "data", "system-settings.json"),
  ];

  for (const candidate of candidates) {
    try {
      if (fsSync.existsSync(candidate)) return candidate;
    } catch {
      // ignore
    }
  }

  // If nothing exists yet, default to the first candidate so writes create it.
  return candidates[0];
}

function settingsFilePath() {
  return RESOLVED_SETTINGS_FILE_PATH;
}

async function readSettings(): Promise<SystemSettings> {
  try {
    const raw = await fs.readFile(settingsFilePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<SystemSettings> | null;
    if (!parsed || typeof parsed !== "object") return DEFAULT_SETTINGS;

    const mode =
      parsed.company_approval_mode === "pending" || parsed.company_approval_mode === "auto_approved"
        ? parsed.company_approval_mode
        : DEFAULT_SETTINGS.company_approval_mode;

    const systemNameRaw =
      typeof parsed.system_name === "string" ? parsed.system_name.trim() : "";
    const brandingLogoRaw =
      typeof parsed.branding_logo_url === "string"
        ? parsed.branding_logo_url.trim()
        : "";
    const appColor = normalizeHexColor((parsed as any).app_color) ?? DEFAULT_SETTINGS.app_color;
    const mainCompanyIdRaw =
      typeof (parsed as any).main_company_id === "string" ? String((parsed as any).main_company_id).trim() : "";
    const mainCompanyId = mainCompanyIdRaw || null;

    return {
      version: 1,
      company_approval_mode: mode,
      system_name: systemNameRaw || DEFAULT_SETTINGS.system_name,
      branding_logo_url: brandingLogoRaw,
      app_color: appColor,
      main_company_id: mainCompanyId,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function writeSettings(settings: SystemSettings): Promise<void> {
  const filePath = settingsFilePath();
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(settings, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

export async function getCompanyApprovalMode(): Promise<CompanyApprovalMode> {
  const settings = await readSettings();
  return settings.company_approval_mode;
}

export async function setCompanyApprovalMode(mode: CompanyApprovalMode): Promise<CompanyApprovalMode> {
  const settings = await readSettings();
  settings.company_approval_mode = mode;
  await writeSettings(settings);
  return settings.company_approval_mode;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  return readSettings();
}

export async function updateSystemSettings(
  changes: Partial<Pick<SystemSettings, "system_name" | "branding_logo_url" | "app_color" | "main_company_id">>,
): Promise<SystemSettings> {
  const settings = await readSettings();

  if (typeof changes.system_name === "string") {
    const nextName = changes.system_name.trim();
    if (nextName) {
      settings.system_name = nextName;
    }
  }

  if (typeof changes.branding_logo_url === "string") {
    settings.branding_logo_url = changes.branding_logo_url.trim();
  }

  if (typeof changes.app_color === "string") {
    settings.app_color = normalizeHexColor(changes.app_color) ?? settings.app_color;
  }

  if (changes.main_company_id !== undefined) {
    if (typeof changes.main_company_id === "string") {
      const next = changes.main_company_id.trim();
      settings.main_company_id = next || null;
    } else if (changes.main_company_id === null) {
      settings.main_company_id = null;
    }
  }

  await writeSettings(settings);
  return settings;
}
