"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanyApprovalMode = getCompanyApprovalMode;
exports.setCompanyApprovalMode = setCompanyApprovalMode;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const DEFAULT_SETTINGS = {
    version: 1,
    company_approval_mode: "auto_approved",
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
        return {
            version: 1,
            company_approval_mode: mode,
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
//# sourceMappingURL=systemSettings.service.js.map