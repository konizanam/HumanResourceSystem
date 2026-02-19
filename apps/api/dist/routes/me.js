"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth"); // Use your existing auth middleware
const database_1 = require("../config/database");
exports.meRouter = (0, express_1.Router)();
// Use your existing authenticate middleware
exports.meRouter.get("/me", auth_1.authenticate, async (req, res, next) => {
    try {
        // Get user from database using the userId from the token
        const userId = req.user?.userId; // This comes from your JWT payload
        if (!userId) {
            return res.status(401).json({ error: { message: "User not found in token" } });
        }
        const result = await (0, database_1.query)(`SELECT id, first_name, last_name, email, is_active, created_at
       FROM users WHERE id = $1`, [userId]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ error: { message: "User not found" } });
        }
        // Get user roles
        const rolesResult = await (0, database_1.query)(`SELECT r.name FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`, [userId]);
        const roles = rolesResult.rows.map(row => row.name);
        // Get user permissions
        const permissionsResult = await (0, database_1.query)(`SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`, [userId]);
        const permissions = permissionsResult.rows.map(row => row.name);
        return res.json({
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                is_active: user.is_active,
                created_at: user.created_at,
                roles,
                permissions
            }
        });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=me.js.map