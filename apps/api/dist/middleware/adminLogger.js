"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAdminAction = void 0;
const database_1 = require("../config/database");
const logAdminAction = (action, targetType) => {
    return async (req, res, next) => {
        // Store original json method
        const originalJson = res.json;
        // Override json method to capture response
        res.json = function (body) {
            // Log after response is sent
            setImmediate(async () => {
                try {
                    if (req.user && body && body.id) {
                        await (0, database_1.query)(`INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address, user_agent, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, [
                            req.user.userId,
                            action,
                            targetType,
                            body.id,
                            JSON.stringify({ ...req.params, ...req.body }),
                            req.ip,
                            req.get('user-agent')
                        ]);
                    }
                }
                catch (error) {
                    console.error('Error logging admin action:', error);
                }
            });
            // Call original json method
            return originalJson.call(this, body);
        };
        next();
    };
};
exports.logAdminAction = logAdminAction;
//# sourceMappingURL=adminLogger.js.map