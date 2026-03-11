"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.publicUser = publicUser;
const db_1 = require("./db");
/** Find a user by email (case-insensitive). */
async function findUserByEmail(email) {
    const { rows } = await (0, db_1.query)(`SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.is_active,
            COALESCE(
              array_agg(r.name) FILTER (WHERE r.name IS NOT NULL),
              '{}'
            ) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE LOWER(u.email) = LOWER($1)
     GROUP BY u.id`, [email]);
    return rows[0] ?? null;
}
/** Find a user by id. */
async function findUserById(id) {
    const { rows } = await (0, db_1.query)(`SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.is_active,
            COALESCE(
              array_agg(r.name) FILTER (WHERE r.name IS NOT NULL),
              '{}'
            ) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = $1
     GROUP BY u.id`, [id]);
    return rows[0] ?? null;
}
/** Convert a user row to a public-safe shape. */
function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim(),
        roles: user.roles,
    };
}
//# sourceMappingURL=users.js.map