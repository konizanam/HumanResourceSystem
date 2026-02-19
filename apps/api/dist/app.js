"use strict";
/**
 * Express application configuration
 * This file sets up middleware, routes, and error handling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./swagger");
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
// Create Express application
const app = (0, express_1.default)();
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// =====================
// Middleware
// =====================
// Security middleware
app.use((0, helmet_1.default)());
// CORS configuration
const corsOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';
app.use((0, cors_1.default)({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});
// =====================
// Health Check Endpoints
// =====================
// Root health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});
// API v1 health check
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'API v1 is running',
        timestamp: new Date().toISOString()
    });
});
// =====================
// Routes
// =====================
// Import routes (uncomment as you add them)
const index_1 = __importDefault(require("./routes/index"));
// Use routes
app.use('/api/v1', index_1.default);
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup((0, swagger_1.createOpenApiSpec)()));
// =====================
// 404 Handler
// =====================
app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Cannot find ${req.method} ${req.originalUrl} on this server`
    });
});
app.use((err, req, res, next) => {
    const { NODE_ENV } = process.env;
    // Log error
    console.error('❌ Error:', {
        message: err.message,
        stack: NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    // Operational errors (known errors we created)
    if (err.isOperational) {
        return res.status(err.statusCode || 400).json({
            status: 'error',
            message: err.message
        });
    }
    // Programming or unknown errors
    res.status(500).json({
        status: 'error',
        message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map