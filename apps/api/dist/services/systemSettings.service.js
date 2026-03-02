"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanyApprovalMode = getCompanyApprovalMode;
exports.setCompanyApprovalMode = setCompanyApprovalMode;
exports.getSystemSettings = getSystemSettings;
exports.updateSystemSettings = updateSystemSettings;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DEFAULT_SETTINGS = {
    version: 1,
    company_approval_mode: "auto_approved",
    system_name: "Human Resource System",
    branding_logo_url: "",
    app_color: "#6366f1",
};
function normalizeHexColor(input) {
    if (typeof input !== "string")
        return null;
    const raw = input.trim();
    if (!raw)
        return null;
    const withHash = raw.startsWith("#") ? raw : `#${raw}`;
    const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(withHash);
    if (!match)
        return null;
    const hex = match[1].length === 3
        ? match[1].split("").map((c) => c + c).join("")
        : match[1];
    return `#${hex.toLowerCase()}`;
}
const RESOLVED_SETTINGS_FILE_PATH = resolveSettingsFilePath();
function resolveSettingsFilePath() {
    // Allow overrides for deployments.
    const override = String(process.env.SYSTEM_SETTINGS_PATH ?? "").trim();
    if (override)
        return path_1.default.resolve(override);
    // Prefer stable project locations so dev (src) and prod (dist)
    // read/write the same file.
    const candidates = [
        // When running from the apps/api package directory.
        path_1.default.resolve(process.cwd(), "data", "system-settings.json"),
        // When running from the monorepo root.
        path_1.default.resolve(process.cwd(), "apps", "api", "data", "system-settings.json"),
        // Backwards-compatible fallback (older behavior).
        path_1.default.resolve(__dirname, "..", "..", "data", "system-settings.json"),
    ];
    for (const candidate of candidates) {
        try {
            if (fs_1.default.existsSync(candidate))
                return candidate;
        }
        catch {
            // ignore
        }
    }
    // If nothing exists yet, default to the first candidate so writes create it.
    return candidates[0];
}
function settingsFilePath() {
    return RESOLVED_SETTINGS_FILE_PATH;
}
async function readSettings() {
    try {
        const raw = await promises_1.default.readFile(settingsFilePath(), "utf8");
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object")
            return DEFAULT_SETTINGS;
        const mode = parsed.company_approval_mode === "pending" || parsed.company_approval_mode === "auto_approved"
            ? parsed.company_approval_mode
            : DEFAULT_SETTINGS.company_approval_mode;
        const systemNameRaw = typeof parsed.system_name === "string" ? parsed.system_name.trim() : "";
        const brandingLogoRaw = typeof parsed.branding_logo_url === "string"
            ? parsed.branding_logo_url.trim()
            : "";
        const appColor = normalizeHexColor(parsed.app_color) ?? DEFAULT_SETTINGS.app_color;
        return {
            version: 1,
            company_approval_mode: mode,
            system_name: systemNameRaw || DEFAULT_SETTINGS.system_name,
            branding_logo_url: brandingLogoRaw,
            app_color: appColor,
        };
    }
    catch {
        return DEFAULT_SETTINGS;
    }
}
async function writeSettings(settings) {
    const filePath = settingsFilePath();
    const dir = path_1.default.dirname(filePath);
    await promises_1.default.mkdir(dir, { recursive: true });
    const tmp = `${filePath}.tmp`;
    await promises_1.default.writeFile(tmp, JSON.stringify(settings, null, 2), "utf8");
    await promises_1.default.rename(tmp, filePath);
}
async function getCompanyApprovalMode() {
    const settings = await readSettings();
    return settings.company_approval_mode;
}
async function setCompanyApprovalMode(mode) {
    const settings = await readSettings();
    settings.company_approval_mode = mode;
    await writeSettings(settings);
    return settings.company_approval_mode;
}
async function getSystemSettings() {
    return readSettings();
}
async function updateSystemSettings(changes) {
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
    await writeSettings(settings);
    return settings;
}
//# sourceMappingURL=systemSettings.service.js.map