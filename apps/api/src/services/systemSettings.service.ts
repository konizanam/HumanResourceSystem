import fs from "fs/promises";
import path from "path";

export type CompanyApprovalMode = "auto_approved" | "pending";

export type SystemSettings = {
  version: 1;
  company_approval_mode: CompanyApprovalMode;
  system_name: string;
  branding_logo_url: string;
};

const DEFAULT_SETTINGS: SystemSettings = {
  version: 1,
  company_approval_mode: "auto_approved",
  system_name: "Human Resource System",
  branding_logo_url: "",
};

function settingsFilePath() {
  // When compiled, __dirname is .../apps/api/dist/services.
  return path.resolve(__dirname, "..", "..", "data", "system-settings.json");
}

async function readSettings(): Promise<SystemSettings> {
  try {
    const raw = await fs.readFile(settingsFilePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredSettings> | null;
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

    return {
      version: 1,
      company_approval_mode: mode,
      system_name: systemNameRaw || DEFAULT_SETTINGS.system_name,
      branding_logo_url: brandingLogoRaw,
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
  changes: Partial<Pick<SystemSettings, "system_name" | "branding_logo_url">>,
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

  await writeSettings(settings);
  return settings;
}
