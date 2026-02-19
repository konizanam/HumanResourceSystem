"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geoRouter = void 0;
const express_1 = require("express");
const geoip_lite_1 = __importDefault(require("geoip-lite"));
exports.geoRouter = (0, express_1.Router)();
function extractClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const raw = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        req.ip;
    if (!raw)
        return null;
    return raw.replace(/^::ffff:/, '');
}
exports.geoRouter.get('/ip', (req, res) => {
    const ip = extractClientIp(req);
    const lookup = ip ? geoip_lite_1.default.lookup(ip) : null;
    const countryCode = lookup?.country ?? null;
    res.json({
        ip,
        countryCode,
        countryName: countryCode === 'NA' ? 'Namibia' : null,
        region: lookup?.region ?? null,
        city: lookup?.city ?? null,
    });
});
//# sourceMappingURL=geo.routes.js.map