"use strict";
/**
 * Health Check Routes - Firebase Functions Version
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHealthRouter = createHealthRouter;
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
function createHealthRouter() {
    const router = (0, express_1.Router)();
    /**
     * Basic health check
     * GET /health
     */
    router.get('/', async (req, res) => {
        try {
            const timestamp = new Date().toISOString();
            // Test Firebase connection
            let firebaseStatus = 'connected';
            try {
                await admin.firestore().collection('health').limit(1).get();
            }
            catch (error) {
                firebaseStatus = 'error';
                console.error('Firebase health check failed:', error);
            }
            res.status(200).json({
                status: 'healthy',
                timestamp,
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'production',
                services: {
                    firebase: firebaseStatus,
                },
                uptime: process.uptime()
            });
        }
        catch (error) {
            console.error('Health check failed:', error);
            res.status(500).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    });
    /**
     * Detailed health check
     * GET /health/detailed
     */
    router.get('/detailed', async (req, res) => {
        try {
            const timestamp = new Date().toISOString();
            const checks = {};
            // Firebase Firestore check
            checks.firestore = await checkFirestore();
            // Memory usage check
            checks.memory = {
                used: process.memoryUsage(),
                status: 'ok'
            };
            const allHealthy = Object.values(checks).every((check) => check.status === 'ok');
            res.status(allHealthy ? 200 : 503).json({
                status: allHealthy ? 'healthy' : 'degraded',
                timestamp,
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'production',
                checks,
                uptime: process.uptime()
            });
        }
        catch (error) {
            console.error('Detailed health check failed:', error);
            res.status(500).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    });
    return router;
}
/**
 * Check Firestore connectivity and basic operations
 */
async function checkFirestore() {
    const startTime = Date.now();
    try {
        // Try to read from scholarships collection
        const snapshot = await admin.firestore()
            .collection('scholarships')
            .limit(1)
            .get();
        const responseTime = Date.now() - startTime;
        return {
            status: 'ok',
            responseTime,
        };
    }
    catch (error) {
        const responseTime = Date.now() - startTime;
        console.error('Firestore health check failed:', error);
        return {
            status: 'error',
            responseTime,
            error: error.message
        };
    }
}
//# sourceMappingURL=health.js.map