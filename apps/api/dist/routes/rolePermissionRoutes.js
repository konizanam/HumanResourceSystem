"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Validation middleware
const validateRole = [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Role name is required').trim(),
    (0, express_validator_1.body)('description').optional().isString().trim()
];
const validatePermission = [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Permission name is required').trim(),
    (0, express_validator_1.body)('description').optional().isString().trim(),
    (0, express_validator_1.body)('module_name').notEmpty().withMessage('Module name is required').trim(),
    (0, express_validator_1.body)('action_type').notEmpty().withMessage('Action type is required').trim()
];
const validateRoleId = [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid role ID')
];
const validatePermissionId = [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid permission ID')
];
const validateUserId = [
    (0, express_validator_1.param)('userId').isUUID().withMessage('Invalid user ID')
];
/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     Permission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         module_name:
 *           type: string
 *         action_type:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     UserRole:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           format: uuid
 *         role_id:
 *           type: string
 *           format: uuid
 *         role_name:
 *           type: string
 *         assigned_at:
 *           type: string
 *           format: date-time
 *     RolePermission:
 *       type: object
 *       properties:
 *         role_id:
 *           type: string
 *           format: uuid
 *         permission_id:
 *           type: string
 *           format: uuid
 *         permission_name:
 *           type: string
 *         module_name:
 *           type: string
 */
/**
 * @swagger
 * tags:
 *   name: Role Management
 *   description: Role and Permission management endpoints (Admin only)
 */
// ============================================================================
// ROLE ENDPOINTS
// ============================================================================
/**
 * @swagger
 * /admin/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/admin/roles', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('search').optional().isString().trim()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const offset = (page - 1) * limit;
        const search = req.query.search;
        // Build query
        let queryText = 'SELECT * FROM roles';
        const queryParams = [];
        let paramIndex = 1;
        if (search) {
            queryText += ` WHERE name ILIKE $${paramIndex} OR description ILIKE $${paramIndex}`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        queryText += ' ORDER BY name ASC';
        // Get total count
        const countResult = await (0, database_1.query)(`SELECT COUNT(*) FROM roles ${search ? 'WHERE name ILIKE $1 OR description ILIKE $1' : ''}`, search ? [`%${search}%`] : []);
        const total = parseInt(countResult.rows[0].count);
        // Get roles with pagination
        const result = await (0, database_1.query)(queryText + ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...queryParams, limit, offset]);
        // Get user count for each role
        const rolesWithStats = await Promise.all(result.rows.map(async (role) => {
            const userCount = await (0, database_1.query)('SELECT COUNT(*) FROM user_roles WHERE role_id = $1', [role.id]);
            const permissionCount = await (0, database_1.query)('SELECT COUNT(*) FROM role_permissions WHERE role_id = $1', [role.id]);
            return {
                ...role,
                user_count: parseInt(userCount.rows[0].count),
                permission_count: parseInt(permissionCount.rows[0].count)
            };
        }));
        res.json({
            roles: rolesWithStats,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * @swagger
 * /admin/roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */
router.get('/admin/roles/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), validateRoleId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const roleId = req.params.id;
        const result = await (0, database_1.query)('SELECT * FROM roles WHERE id = $1', [roleId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }
        // Get permissions for this role
        const permissions = await (0, database_1.query)(`SELECT p.* 
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1
         ORDER BY p.module_name, p.name`, [roleId]);
        // Get users with this role
        const users = await (0, database_1.query)(`SELECT u.id, u.email, u.first_name, u.last_name
         FROM users u
         JOIN user_roles ur ON u.id = ur.user_id
         WHERE ur.role_id = $1
         ORDER BY u.email`, [roleId]);
        res.json({
            ...result.rows[0],
            permissions: permissions.rows,
            users: users.rows
        });
    }
    catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * @swagger
 * /admin/roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Role already exists
 */
router.post('/admin/roles', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), validateRole, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { name, description } = req.body;
        // Check if role already exists
        const existing = await (0, database_1.query)('SELECT id FROM roles WHERE name = $1', [name]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Role already exists' });
        }
        // Create role
        const result = await (0, database_1.query)(`INSERT INTO roles (name, description)
         VALUES ($1, $2)
         RETURNING *`, [name, description]);
        // Log the action
        await (0, database_1.query)(`INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, 'CREATE_ROLE', 'role', $2, $3, NOW())`, [req.user.userId, result.rows[0].id, JSON.stringify({ name, description })]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * @swagger
 * /admin/roles/{id}:
 *   put:
 *     summary: Update a role
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */
router.put('/admin/roles/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), validateRoleId, validateRole, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const roleId = req.params.id;
        const { name, description } = req.body;
        // Check if role exists
        const checkResult = await (0, database_1.query)('SELECT id FROM roles WHERE id = $1', [roleId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }
        // Check if new name conflicts with existing role
        if (name) {
            const nameCheck = await (0, database_1.query)('SELECT id FROM roles WHERE name = $1 AND id != $2', [name, roleId]);
            if (nameCheck.rows.length > 0) {
                return res.status(409).json({ error: 'Role name already exists' });
            }
        }
        // Update role
        const result = await (0, database_1.query)(`UPDATE roles 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description)
         WHERE id = $3
         RETURNING *`, [name, description, roleId]);
        // Log the action
        await (0, database_1.query)(`INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, 'UPDATE_ROLE', 'role', $2, $3, NOW())`, [req.user.userId, roleId, JSON.stringify({ name, description })]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * @swagger
 * /admin/roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       400:
 *         description: Cannot delete system role
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */
router.delete('/admin/roles/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), validateRoleId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const roleId = req.params.id;
        // Check if role exists
        const roleCheck = await (0, database_1.query)('SELECT name FROM roles WHERE id = $1', [roleId]);
        if (roleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }
        const roleName = roleCheck.rows[0].name;
        // Prevent deletion of system roles
        const systemRoles = ['ADMIN', 'HR_MANAGER', 'RECRUITER', 'APPROVER', 'JOB_SEEKER'];
        if (systemRoles.includes(roleName)) {
            return res.status(400).json({ error: 'Cannot delete system roles' });
        }
        // Check if role has users
        const userCount = await (0, database_1.query)('SELECT COUNT(*) FROM user_roles WHERE role_id = $1', [roleId]);
        if (parseInt(userCount.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Cannot delete role that has users assigned',
                user_count: parseInt(userCount.rows[0].count)
            });
        }
        // Delete role (cascade will handle role_permissions)
        await (0, database_1.query)('DELETE FROM roles WHERE id = $1', [roleId]);
        // Log the action
        await (0, database_1.query)(`INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, 'DELETE_ROLE', 'role', $2, $3, NOW())`, [req.user.userId, roleId, JSON.stringify({ name: roleName })]);
        res.json({
            message: 'Role deleted successfully',
            deleted_role: roleName
        });
    }
    catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// PERMISSION ENDPOINTS
// ============================================================================
/**
 * @swagger
 * /admin/permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: module
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of permissions grouped by module
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 permissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *                 grouped:
 *                   type: object
 *                   additionalProperties:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/Permission'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/admin/permissions', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), [
    (0, express_validator_1.query)('module').optional().isString(),
    (0, express_validator_1.query)('search').optional().isString().trim()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { module, search } = req.query;
        // Build query
        let queryText = 'SELECT * FROM permissions';
        const queryParams = [];
        let paramIndex = 1;
        const conditions = [];
        if (module) {
            conditions.push(`module_name = $${paramIndex++}`);
            queryParams.push(module);
        }
        if (search) {
            conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        if (conditions.length > 0) {
            queryText += ' WHERE ' + conditions.join(' AND ');
        }
        queryText += ' ORDER BY module_name, name';
        const result = await (0, database_1.query)(queryText, queryParams);
        // Group by module
        const grouped = result.rows.reduce((acc, permission) => {
            if (!acc[permission.module_name]) {
                acc[permission.module_name] = [];
            }
            acc[permission.module_name].push(permission);
            return acc;
        }, {});
        res.json({
            permissions: result.rows,
            grouped,
            total: result.rows.length
        });
    }
    catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * @swagger
 * /admin/permissions:
 *   post:
 *     summary: Create a new permission
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - module_name
 *               - action_type
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               module_name:
 *                 type: string
 *               action_type:
 *                 type: string
 *     responses:
 *       201:
 *         description: Permission created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Permission'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Permission already exists
 */
router.post('/admin/permissions', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), validatePermission, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { name, description, module_name, action_type } = req.body;
        // Check if permission already exists
        const existing = await (0, database_1.query)('SELECT id FROM permissions WHERE name = $1', [name]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Permission already exists' });
        }
        // Create permission
        const result = await (0, database_1.query)(`INSERT INTO permissions (name, description, module_name, action_type)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [name, description, module_name, action_type]);
        // Log the action
        await (0, database_1.query)(`INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, 'CREATE_PERMISSION', 'permission', $2, $3, NOW())`, [req.user.userId, result.rows[0].id, JSON.stringify({ name, module_name, action_type })]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating permission:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * @swagger
 * /admin/permissions/{id}:
 *   delete:
 *     summary: Delete a permission
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Permission deleted successfully
 *       400:
 *         description: Permission is assigned to roles
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Permission not found
 */
router.delete('/admin/permissions/:id', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), validatePermissionId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const permissionId = req.params.id;
        // Check if permission exists
        const permCheck = await (0, database_1.query)('SELECT name FROM permissions WHERE id = $1', [permissionId]);
        if (permCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Permission not found' });
        }
        // Check if permission is assigned to any roles
        const roleCount = await (0, database_1.query)('SELECT COUNT(*) FROM role_permissions WHERE permission_id = $1', [permissionId]);
        if (parseInt(roleCount.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'Cannot delete permission that is assigned to roles',
                role_count: parseInt(roleCount.rows[0].count)
            });
        }
        // Delete permission
        await (0, database_1.query)('DELETE FROM permissions WHERE id = $1', [permissionId]);
        // Log the action
        await (0, database_1.query)(`INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, 'DELETE_PERMISSION', 'permission', $2, $3, NOW())`, [req.user.userId, permissionId, JSON.stringify({ name: permCheck.rows[0].name })]);
        res.json({
            message: 'Permission deleted successfully',
            deleted_permission: permCheck.rows[0].name
        });
    }
    catch (error) {
        console.error('Error deleting permission:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// ROLE-PERMISSION ASSIGNMENT ENDPOINTS
// ============================================================================
/**
 * @swagger
 * /admin/roles/{roleId}/permissions:
 *   get:
 *     summary: Get permissions for a role
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of permissions for the role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role_id:
 *                   type: string
 *                 role_name:
 *                   type: string
 *                 permissions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */
router.get('/admin/roles/:roleId/permissions', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), validateRoleId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const roleId = req.params.roleId;
        // Check if role exists
        const roleCheck = await (0, database_1.query)('SELECT name FROM roles WHERE id = $1', [roleId]);
        if (roleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }
        // Get permissions for role
        const permissions = await (0, database_1.query)(`SELECT p.* 
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1
         ORDER BY p.module_name, p.name`, [roleId]);
        // Get all available permissions (for UI checkboxes)
        const allPermissions = await (0, database_1.query)('SELECT * FROM permissions ORDER BY module_name, name');
        res.json({
            role_id: roleId,
            role_name: roleCheck.rows[0].name,
            permissions: permissions.rows,
            all_permissions: allPermissions.rows
        });
    }
    catch (error) {
        console.error('Error fetching role permissions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * @swagger
 * /admin/roles/{roleId}/permissions:
 *   put:
 *     summary: Assign permissions to a role
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permission_ids
 *             properties:
 *               permission_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Permissions assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 role_id:
 *                   type: string
 *                 assigned_count:
 *                   type: integer
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */
router.put('/admin/roles/:roleId/permissions', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), validateRoleId, [
    (0, express_validator_1.body)('permission_ids').isArray().withMessage('Permission IDs must be an array'),
    (0, express_validator_1.body)('permission_ids.*').isUUID().withMessage('Invalid permission ID format')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const roleId = req.params.roleId;
        const { permission_ids } = req.body;
        // Check if role exists
        const roleCheck = await (0, database_1.query)('SELECT name FROM roles WHERE id = $1', [roleId]);
        if (roleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }
        // Start transaction
        await (0, database_1.query)('BEGIN');
        try {
            // Get current permissions for logging
            const oldPermissions = await (0, database_1.query)('SELECT permission_id FROM role_permissions WHERE role_id = $1', [roleId]);
            // Delete existing permissions
            await (0, database_1.query)('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
            // Insert new permissions
            if (permission_ids.length > 0) {
                const values = permission_ids.map((permId) => `('${roleId}', '${permId}')`).join(',');
                await (0, database_1.query)(`INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`);
            }
            await (0, database_1.query)('COMMIT');
            // Log the action
            await (0, database_1.query)(`INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, created_at)
           VALUES ($1, 'ASSIGN_PERMISSIONS', 'role', $2, $3, NOW())`, [req.user.userId, roleId, JSON.stringify({
                    old_count: oldPermissions.rows.length,
                    new_count: permission_ids.length,
                    role_name: roleCheck.rows[0].name
                })]);
            res.json({
                message: 'Permissions assigned successfully',
                role_id: roleId,
                assigned_count: permission_ids.length
            });
        }
        catch (error) {
            await (0, database_1.query)('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('Error assigning permissions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// USER-ROLE ASSIGNMENT ENDPOINTS
// ============================================================================
/**
 * @swagger
 * /admin/users/{userId}/roles:
 *   get:
 *     summary: Get roles for a user
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of roles for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: string
 *                 user_email:
 *                   type: string
 *                 roles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get('/admin/users/:userId/roles', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), validateUserId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const userId = req.params.userId;
        // Check if user exists
        const userCheck = await (0, database_1.query)('SELECT email FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Get roles for user
        const roles = await (0, database_1.query)(`SELECT r.* 
         FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1
         ORDER BY r.name`, [userId]);
        // Get all available roles
        const allRoles = await (0, database_1.query)('SELECT * FROM roles ORDER BY name');
        res.json({
            user_id: userId,
            user_email: userCheck.rows[0].email,
            roles: roles.rows,
            all_roles: allRoles.rows
        });
    }
    catch (error) {
        console.error('Error fetching user roles:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * @swagger
 * /admin/users/{userId}/roles:
 *   put:
 *     summary: Assign roles to a user
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role_ids
 *             properties:
 *               role_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Roles assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user_id:
 *                   type: string
 *                 assigned_count:
 *                   type: integer
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.put('/admin/users/:userId/roles', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), validateUserId, [
    (0, express_validator_1.body)('role_ids').isArray().withMessage('Role IDs must be an array'),
    (0, express_validator_1.body)('role_ids.*').isUUID().withMessage('Invalid role ID format')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const userId = req.params.userId;
        const { role_ids } = req.body;
        // Check if user exists
        const userCheck = await (0, database_1.query)('SELECT email FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Start transaction
        await (0, database_1.query)('BEGIN');
        try {
            // Get current roles for logging
            const oldRoles = await (0, database_1.query)('SELECT role_id FROM user_roles WHERE user_id = $1', [userId]);
            // Delete existing roles
            await (0, database_1.query)('DELETE FROM user_roles WHERE user_id = $1', [userId]);
            // Insert new roles
            if (role_ids.length > 0) {
                const values = role_ids.map((roleId) => `('${userId}', '${roleId}')`).join(',');
                await (0, database_1.query)(`INSERT INTO user_roles (user_id, role_id) VALUES ${values}`);
            }
            await (0, database_1.query)('COMMIT');
            // Log the action
            await (0, database_1.query)(`INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, created_at)
           VALUES ($1, 'ASSIGN_ROLES', 'user', $2, $3, NOW())`, [req.user.userId, userId, JSON.stringify({
                    old_count: oldRoles.rows.length,
                    new_count: role_ids.length,
                    user_email: userCheck.rows[0].email
                })]);
            res.json({
                message: 'Roles assigned successfully',
                user_id: userId,
                assigned_count: role_ids.length
            });
        }
        catch (error) {
            await (0, database_1.query)('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('Error assigning roles:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * @swagger
 * /admin/users/{userId}/permissions:
 *   get:
 *     summary: Get effective permissions for a user
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Effective permissions for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: string
 *                 user_email:
 *                   type: string
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                 grouped:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get('/admin/users/:userId/permissions', auth_1.authenticate, (0, auth_1.authorize)('ADMIN'), validateUserId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const userId = req.params.userId;
        // Check if user exists
        const userCheck = await (0, database_1.query)('SELECT email FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Get user roles
        const roles = await (0, database_1.query)(`SELECT r.name 
         FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1
         ORDER BY r.name`, [userId]);
        // Get effective permissions (distinct)
        const permissions = await (0, database_1.query)(`SELECT DISTINCT p.*
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1
         ORDER BY p.module_name, p.name`, [userId]);
        // Group permissions by module
        const grouped = permissions.rows.reduce((acc, permission) => {
            if (!acc[permission.module_name]) {
                acc[permission.module_name] = [];
            }
            acc[permission.module_name].push(permission);
            return acc;
        }, {});
        res.json({
            user_id: userId,
            user_email: userCheck.rows[0].email,
            roles: roles.rows.map(r => r.name),
            permissions: permissions.rows,
            grouped,
            total_permissions: permissions.rows.length
        });
    }
    catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=rolePermissionRoutes.js.map