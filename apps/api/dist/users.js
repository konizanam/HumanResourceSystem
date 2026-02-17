"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
exports.publicUser = publicUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const users = [
    {
        id: "u_admin",
        email: "admin@example.com",
        name: "Admin",
        passwordHash: bcryptjs_1.default.hashSync("Admin@1234", 10),
        roles: ["Admin"],
    },
];
function findUserByEmail(email) {
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}
function publicUser(user) {
    return { id: user.id, email: user.email, name: user.name, roles: user.roles };
}
//# sourceMappingURL=users.js.map