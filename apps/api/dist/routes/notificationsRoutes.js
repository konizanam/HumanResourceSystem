"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const emailSender_service_1 = require("../services/emailSender.service");
const router = express_1.default.Router();
// Validation middleware
const validateNotificationId = [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid notification ID')
];
const validatePreferences = [
    (0, express_validator_1.body)('email_notifications').optional().isBoolean().toBoolean(),
    (0, express_validator_1.body)('push_notifications').optional().isBoolean().toBoolean(),
    (0, express_validator_1.body)('in_app_notifications').optional().isBoolean().toBoolean(),
    (0, express_validator_1.body)('application_updates').optional().isBoolean().toBoolean(),
    (0, express_validator_1.body)('job_alerts').optional().isBoolean().toBoolean(),
    (0, express_validator_1.body)('message_notifications').optional().isBoolean().toBoolean(),
    (0, express_validator_1.body)('marketing_emails').optional().isBoolean().toBoolean()
];
/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         type:
 *           type: string
 *           enum: [application_received, application_status_changed, job_posted, job_closed, interview_scheduled, message_received, profile_viewed, system_alert]
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         data:
 *           type: object
 *         is_read:
 *           type: boolean
 *         read_at:
 *           type: string
 *           format: date-time
 *         action_url:
 *           type: string
 *         priority:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     NotificationPreferences:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           format: uuid
 *         email_notifications:
 *           type: boolean
 *         push_notifications:
 *           type: boolean
 *         in_app_notifications:
 *           type: boolean
 *         application_updates:
 *           type: boolean
 *         job_alerts:
 *           type: boolean
 *         message_notifications:
 *           type: boolean
 *         marketing_emails:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     UnreadCount:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *         by_priority:
 *           type: object
 *           properties:
 *             low:
 *               type: integer
 *             normal:
 *               type: integer
 *             high:
 *               type: integer
 *             urgent:
 *               type: integer
 */
/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management endpoints
 */
// ============================================================================
// GET /api/notifications - Get user notifications
// ============================================================================
/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: is_read
 *         schema:
 *           type: boolean
 *         description: Filter by read/unread status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [application_received, application_status_changed, job_posted, job_closed, interview_scheduled, message_received, profile_viewed, system_alert]
 *         description: Filter by notification type
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *         description: Filter by priority
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Get notifications from this date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Get notifications up to this date
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 unread_count:
 *                   $ref: '#/components/schemas/UnreadCount'
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth_1.authenticate, [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('is_read').optional().isBoolean().toBoolean(),
    (0, express_validator_1.query)('type').optional().isIn([
        'application_received', 'application_status_changed', 'job_posted',
        'job_closed', 'interview_scheduled', 'message_received',
        'profile_viewed', 'system_alert'
    ]),
    (0, express_validator_1.query)('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
    (0, express_validator_1.query)('from_date').optional().isISO8601().toDate(),
    (0, express_validator_1.query)('to_date').optional().isISO8601().toDate(),
    (0, express_validator_1.query)('sort').optional().isIn(['newest', 'oldest'])
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const userId = req.user.userId;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const offset = (page - 1) * limit;
        const { is_read, type, priority, from_date, to_date, sort = 'newest' } = req.query;
        // Build WHERE clause
        let whereConditions = ['user_id = $1'];
        const queryParams = [userId];
        let paramIndex = 2;
        if (is_read !== undefined) {
            whereConditions.push(`is_read = $${paramIndex}`);
            queryParams.push(is_read);
            paramIndex++;
        }
        if (type) {
            whereConditions.push(`type = $${paramIndex}`);
            queryParams.push(type);
            paramIndex++;
        }
        if (priority) {
            whereConditions.push(`priority = $${paramIndex}`);
            queryParams.push(priority);
            paramIndex++;
        }
        if (from_date) {
            whereConditions.push(`created_at >= $${paramIndex}`);
            queryParams.push(from_date);
            paramIndex++;
        }
        if (to_date) {
            whereConditions.push(`created_at <= $${paramIndex}`);
            queryParams.push(to_date);
            paramIndex++;
        }
        const whereClause = 'WHERE ' + whereConditions.join(' AND ');
        // Get total count
        const countResult = await (0, database_1.query)(`SELECT COUNT(*) FROM notifications ${whereClause}`, queryParams);
        const total = parseInt(countResult.rows[0].count);
        // Get notifications
        const orderBy = sort === 'oldest' ? 'created_at ASC' : 'created_at DESC';
        const notificationsResult = await (0, database_1.query)(`SELECT * FROM notifications 
         ${whereClause}
         ORDER BY ${orderBy}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...queryParams, limit, offset]);
        // Get unread counts
        const unreadResult = await (0, database_1.query)(`SELECT 
          COUNT(*) as total_unread,
          COUNT(CASE WHEN priority = 'low' THEN 1 END) as low,
          COUNT(CASE WHEN priority = 'normal' THEN 1 END) as normal,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high,
          COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent
         FROM notifications 
         WHERE user_id = $1 AND is_read = FALSE`, [userId]);
        res.json({
            notifications: notificationsResult.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            unread_count: {
                total: parseInt(unreadResult.rows[0].total_unread),
                by_priority: {
                    low: parseInt(unreadResult.rows[0].low),
                    normal: parseInt(unreadResult.rows[0].normal),
                    high: parseInt(unreadResult.rows[0].high),
                    urgent: parseInt(unreadResult.rows[0].urgent)
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// GET /api/notifications/unread-count - Get unread notification count
// ============================================================================
/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification counts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnreadCount'
 *       401:
 *         description: Unauthorized
 */
router.get('/unread-count', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await (0, database_1.query)(`SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN priority = 'low' THEN 1 END) as low,
          COUNT(CASE WHEN priority = 'normal' THEN 1 END) as normal,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high,
          COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent
         FROM notifications 
         WHERE user_id = $1 AND is_read = FALSE`, [userId]);
        res.json({
            total: parseInt(result.rows[0].total),
            by_priority: {
                low: parseInt(result.rows[0].low),
                normal: parseInt(result.rows[0].normal),
                high: parseInt(result.rows[0].high),
                urgent: parseInt(result.rows[0].urgent)
            }
        });
    }
    catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// GET /api/notifications/:id - Get single notification
// ============================================================================
/**
 * @swagger
 * /notifications/{id}:
 *   get:
 *     summary: Get a single notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your notification
 *       404:
 *         description: Notification not found
 */
router.get('/:id([0-9a-fA-F-]{36})', auth_1.authenticate, validateNotificationId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const notificationId = req.params.id;
        const userId = req.user.userId;
        const result = await (0, database_1.query)('SELECT * FROM notifications WHERE id = $1', [notificationId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        const notification = result.rows[0];
        // Check if notification belongs to user
        if (notification.user_id !== userId) {
            return res.status(403).json({ error: 'You do not have permission to view this notification' });
        }
        res.json(notification);
    }
    catch (error) {
        console.error('Error fetching notification:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// PUT /api/notifications/:id/read - Mark notification as read
// ============================================================================
/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your notification
 *       404:
 *         description: Notification not found
 */
router.put('/:id([0-9a-fA-F-]{36})/read', auth_1.authenticate, validateNotificationId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const notificationId = req.params.id;
        const userId = req.user.userId;
        // Check if notification exists and belongs to user
        const checkResult = await (0, database_1.query)('SELECT id FROM notifications WHERE id = $1 AND user_id = $2', [notificationId, userId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        // Mark as read
        const result = await (0, database_1.query)(`UPDATE notifications 
         SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`, [notificationId, userId]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// PUT /api/notifications/read-all - Mark all notifications as read
// ============================================================================
/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [application_received, application_status_changed, job_posted, job_closed, interview_scheduled, message_received, profile_viewed, system_alert]
 *         description: Mark only notifications of this type as read
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *         description: Mark only notifications with this priority as read
 *     responses:
 *       200:
 *         description: Notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.put('/read-all', auth_1.authenticate, [
    (0, express_validator_1.query)('type').optional().isIn([
        'application_received', 'application_status_changed', 'job_posted',
        'job_closed', 'interview_scheduled', 'message_received',
        'profile_viewed', 'system_alert'
    ]),
    (0, express_validator_1.query)('priority').optional().isIn(['low', 'normal', 'high', 'urgent'])
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const userId = req.user.userId;
        const { type, priority } = req.query;
        // Build WHERE clause
        let whereConditions = ['user_id = $1 AND is_read = FALSE'];
        const queryParams = [userId];
        let paramIndex = 2;
        if (type) {
            whereConditions.push(`type = $${paramIndex}`);
            queryParams.push(type);
            paramIndex++;
        }
        if (priority) {
            whereConditions.push(`priority = $${paramIndex}`);
            queryParams.push(priority);
            paramIndex++;
        }
        const whereClause = 'WHERE ' + whereConditions.join(' AND ');
        // Mark all as read
        const result = await (0, database_1.query)(`UPDATE notifications 
         SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
         ${whereClause}
         RETURNING id`, queryParams);
        res.json({
            message: 'All notifications marked as read',
            count: result.rows.length
        });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// DELETE /api/notifications/:id - Delete a notification
// ============================================================================
/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your notification
 *       404:
 *         description: Notification not found
 */
router.delete('/:id([0-9a-fA-F-]{36})', auth_1.authenticate, validateNotificationId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const notificationId = req.params.id;
        const userId = req.user.userId;
        // Check if notification exists and belongs to user
        const checkResult = await (0, database_1.query)('SELECT id FROM notifications WHERE id = $1 AND user_id = $2', [notificationId, userId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        // Delete notification
        await (0, database_1.query)('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [notificationId, userId]);
        res.json({ message: 'Notification deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// DELETE /api/notifications - Delete all notifications
// ============================================================================
/**
 * @swagger
 * /notifications:
 *   delete:
 *     summary: Delete all notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: only_read
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Delete only read notifications
 *       - in: query
 *         name: older_than
 *         schema:
 *           type: string
 *           format: date
 *         description: Delete notifications older than this date
 *     responses:
 *       200:
 *         description: Notifications deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.delete('/', auth_1.authenticate, [
    (0, express_validator_1.query)('only_read').optional().isBoolean().toBoolean(),
    (0, express_validator_1.query)('older_than').optional().isISO8601().toDate()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const userId = req.user.userId;
        const { only_read = true, older_than } = req.query;
        // Build WHERE clause
        let whereConditions = ['user_id = $1'];
        const queryParams = [userId];
        let paramIndex = 2;
        if (only_read) {
            whereConditions.push('is_read = TRUE');
        }
        if (older_than) {
            whereConditions.push(`created_at < $${paramIndex}`);
            queryParams.push(older_than);
            paramIndex++;
        }
        const whereClause = 'WHERE ' + whereConditions.join(' AND ');
        // Delete notifications
        const result = await (0, database_1.query)(`DELETE FROM notifications ${whereClause} RETURNING id`, queryParams);
        res.json({
            message: 'Notifications deleted successfully',
            count: result.rows.length
        });
    }
    catch (error) {
        console.error('Error deleting notifications:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// GET /api/notifications/preferences - Get notification preferences
// ============================================================================
/**
 * @swagger
 * /notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationPreferences'
 *       401:
 *         description: Unauthorized
 */
router.get('/preferences', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await (0, database_1.query)('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) {
            // Create preferences if they don't exist
            const newPrefs = await (0, database_1.query)(`INSERT INTO notification_preferences (user_id) 
           VALUES ($1) RETURNING *`, [userId]);
            return res.json(newPrefs.rows[0]);
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching notification preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// PUT /api/notifications/preferences - Update notification preferences
// ============================================================================
/**
 * @swagger
 * /notifications/preferences:
 *   put:
 *     summary: Update notification preferences
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email_notifications:
 *                 type: boolean
 *               push_notifications:
 *                 type: boolean
 *               in_app_notifications:
 *                 type: boolean
 *               application_updates:
 *                 type: boolean
 *               job_alerts:
 *                 type: boolean
 *               message_notifications:
 *                 type: boolean
 *               marketing_emails:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationPreferences'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/preferences', auth_1.authenticate, validatePreferences, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const userId = req.user.userId;
        const { email_notifications, push_notifications, in_app_notifications, application_updates, job_alerts, message_notifications, marketing_emails } = req.body;
        // Build update query dynamically
        const updateFields = [];
        const values = [];
        let paramIndex = 1;
        if (email_notifications !== undefined) {
            updateFields.push(`email_notifications = $${paramIndex++}`);
            values.push(email_notifications);
        }
        if (push_notifications !== undefined) {
            updateFields.push(`push_notifications = $${paramIndex++}`);
            values.push(push_notifications);
        }
        if (in_app_notifications !== undefined) {
            updateFields.push(`in_app_notifications = $${paramIndex++}`);
            values.push(in_app_notifications);
        }
        if (application_updates !== undefined) {
            updateFields.push(`application_updates = $${paramIndex++}`);
            values.push(application_updates);
        }
        if (job_alerts !== undefined) {
            updateFields.push(`job_alerts = $${paramIndex++}`);
            values.push(job_alerts);
        }
        if (message_notifications !== undefined) {
            updateFields.push(`message_notifications = $${paramIndex++}`);
            values.push(message_notifications);
        }
        if (marketing_emails !== undefined) {
            updateFields.push(`marketing_emails = $${paramIndex++}`);
            values.push(marketing_emails);
        }
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        updateFields.push('updated_at = NOW()');
        values.push(userId);
        const result = await (0, database_1.query)(`UPDATE notification_preferences 
         SET ${updateFields.join(', ')}
         WHERE user_id = $${paramIndex}
         RETURNING *`, values);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Helper function to create a notification (for internal use)
async function createNotification(userId, type, title, message, data = {}, action_url, priority = 'normal') {
    try {
        // DB currently constrains notification types; map new semantic types to a stored type.
        const dbType = type === 'application_success' || type === 'application_update'
            ? 'application_status_changed'
            : type;
        // Check user's notification preferences
        const prefsResult = await (0, database_1.query)('SELECT in_app_notifications, email_notifications FROM notification_preferences WHERE user_id = $1', [userId]);
        const preferences = prefsResult.rows[0] || {
            in_app_notifications: true,
            email_notifications: true,
        };
        // Only create notification if in-app notifications are enabled
        if (!preferences.in_app_notifications) {
            return null;
        }
        const result = await (0, database_1.query)(`INSERT INTO notifications (
        user_id, type, title, message, data, action_url, priority, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *`, [userId, dbType, title, message, JSON.stringify(data), action_url, priority]);
        // Best-effort email notification using configured templates.
        if (preferences.email_notifications) {
            const userResult = await (0, database_1.query)(`SELECT email, first_name, last_name
         FROM users
         WHERE id = $1
         LIMIT 1`, [userId]);
            const userRow = userResult.rows[0];
            const toEmail = typeof userRow?.email === 'string' ? userRow.email.trim() : '';
            if (toEmail) {
                const statusRaw = String(data?.status ?? '').toLowerCase();
                const templateKey = type === 'interview_scheduled'
                    ? 'interview_invitation'
                    : type === 'job_posted'
                        ? 'job_alert'
                        : type === 'application_received'
                            ? 'application_received'
                            : type === 'application_success'
                                ? 'application_success'
                                : type === 'application_update'
                                    ? (statusRaw.includes('interview')
                                        ? 'interview_invitation'
                                        : statusRaw.includes('reject')
                                            ? 'application_rejected'
                                            : 'application_success')
                                    : type === 'application_status_changed'
                                        ? (statusRaw.includes('reject') ? 'application_rejected' : 'application_success')
                                        : null;
                if (templateKey) {
                    const fullName = `${String(userRow?.first_name ?? '').trim()} ${String(userRow?.last_name ?? '').trim()}`.trim() || 'User';
                    const link = String(action_url ?? ((0, emailSender_service_1.webOrigin)() ? `${(0, emailSender_service_1.webOrigin)()}/app/notifications` : ''));
                    await (0, emailSender_service_1.sendTemplatedEmail)({
                        templateKey,
                        to: toEmail,
                        data: {
                            app_name: (0, emailSender_service_1.appName)(),
                            user_full_name: fullName,
                            company_name: String(data?.company_name ?? data?.company ?? 'Human Resource System'),
                            applicant_name: String(data?.applicant_name ?? ''),
                            job_title: String(data?.job_title ?? title ?? 'Job update'),
                            job_link: link,
                            activation_link: link,
                            interview_date: String(data?.interview_date ?? data?.date ?? ''),
                            interview_time: String(data?.interview_time ?? data?.time ?? ''),
                            interview_location: String(data?.interview_location ?? data?.location ?? ''),
                            unsubscribe_link: (0, emailSender_service_1.webOrigin)() ? `${(0, emailSender_service_1.webOrigin)()}/app/notifications` : '',
                            support_email: process.env.SUPPORT_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() || '',
                        },
                    });
                }
            }
        }
        return result.rows[0];
    }
    catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}
exports.default = router;
//# sourceMappingURL=notificationsRoutes.js.map