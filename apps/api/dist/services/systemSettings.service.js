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
const path_1 = __importDefault(require("path"));
const DEFAULT_SETTINGS = {
    version: 1,
    company_approval_mode: "auto_approved",
    system_name: "Human Resource System",
    branding_logo_url: "",
};
function settingsFilePath() {
    // When compiled, __dirname is .../apps/api/dist/services.
    return path_1.default.resolve(__dirname, "..", "..", "data", "system-settings.json");
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
        return {
            version: 1,
            company_approval_mode: mode,
            system_name: systemNameRaw || DEFAULT_SETTINGS.system_name,
            branding_logo_url: brandingLogoRaw,
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
    await writeSettings(settings);
    return settings;
}
//# sourceMappingURL=systemSettings.service.js.map