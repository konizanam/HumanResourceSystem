import fs from "fs/promises";
import path from "path";

export type CompanyApprovalMode = "auto_approved" | "pending";

type StoredSettings = {
  version: 1;
  company_approval_mode: CompanyApprovalMode;
};

const DEFAULT_SETTINGS: StoredSettings = {
  version: 1,
  company_approval_mode: "auto_approved",
};

function settingsFilePath() {
  // When compiled, __dirname is .../apps/api/dist/services.
  return path.resolve(__dirname, "..", "..", "data", "system-settings.json");
}

async function readSettings(): Promise<StoredSettings> {
  try {
    const raw = await fs.readFile(settingsFilePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredSettings> | null;
    if (!parsed || typeof parsed !== "object") return DEFAULT_SETTINGS;

    const mode =
      parsed.company_approval_mode === "pending" || parsed.company_approval_mode === "auto_approved"
        ? parsed.company_approval_mode
        : DEFAULT_SETTINGS.company_approval_mode;

    return {
      version: 1,
      company_approval_mode: mode,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function writeSettings(settings: StoredSettings): Promise<void> {
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
