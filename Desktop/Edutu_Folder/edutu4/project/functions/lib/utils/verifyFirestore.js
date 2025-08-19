"use strict";
/**
 * Firestore Verification Utility for Production
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
exports.verifyFirestoreData = verifyFirestoreData;
const admin = __importStar(require("firebase-admin"));
async function verifyFirestoreData(data, context) {
    console.log('🔍 Starting Firestore data verification...');
    const results = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        collections: {},
        issues: [],
        summary: {
            totalScholarships: 0,
            totalUsers: 0,
            totalRoadmaps: 0,
            totalChatMessages: 0,
            totalActivity: 0
        }
    };
    try {
        const db = admin.firestore();
        // Check scholarships collection
        console.log('📚 Checking scholarships collection...');
        const scholarshipsSnapshot = await db.collection('scholarships')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        results.collections['scholarships'] = {
            total: scholarshipsSnapshot.size,
            sample: scholarshipsSnapshot.docs.slice(0, 3).map(doc => {
                var _a, _b;
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    provider: data.provider,
                    createdAt: (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) === null || _b === void 0 ? void 0 : _b.toISOString(),
                    hasRequiredFields: !!(data.title && data.summary && data.link)
                };
            }),
            status: scholarshipsSnapshot.size > 0 ? 'ok' : 'warning'
        };
        results.summary.totalScholarships = scholarshipsSnapshot.size;
        if (scholarshipsSnapshot.size === 0) {
            results.issues.push('No scholarships found in collection');
            results.status = 'warning';
        }
        // Check users collection
        console.log('👥 Checking users collection...');
        const usersSnapshot = await db.collection('users').limit(5).get();
        results.collections['users'] = {
            total: usersSnapshot.size,
            sample: usersSnapshot.docs.slice(0, 3).map(doc => {
                var _a, _b;
                const data = doc.data();
                return {
                    id: doc.id,
                    email: data.email ? '***@***.***' : 'missing', // Mask email for privacy
                    onboardingCompleted: data.onboardingCompleted,
                    createdAt: (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) === null || _b === void 0 ? void 0 : _b.toISOString(),
                    hasPreferences: !!(data.preferences)
                };
            }),
            status: usersSnapshot.size > 0 ? 'ok' : 'warning'
        };
        results.summary.totalUsers = usersSnapshot.size;
        // Check userRoadmaps collection
        console.log('🗺️ Checking userRoadmaps collection...');
        const roadmapsSnapshot = await db.collection('userRoadmaps').limit(5).get();
        results.collections['userRoadmaps'] = {
            total: roadmapsSnapshot.size,
            sample: roadmapsSnapshot.docs.slice(0, 3).map(doc => {
                var _a, _b;
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    userId: data.userId ? 'user_***' : 'missing', // Mask user ID for privacy
                    status: data.status,
                    progress: data.progress,
                    createdAt: (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate()) === null || _b === void 0 ? void 0 : _b.toISOString()
                };
            }),
            status: 'ok' // Roadmaps can be empty initially
        };
        results.summary.totalRoadmaps = roadmapsSnapshot.size;
        // Check chatMessages collection
        console.log('💬 Checking chatMessages collection...');
        const chatSnapshot = await db.collection('chatMessages').limit(5).get();
        results.collections['chatMessages'] = {
            total: chatSnapshot.size,
            status: 'ok' // Chat messages can be empty initially
        };
        results.summary.totalChatMessages = chatSnapshot.size;
        // Check userActivity collection
        console.log('📊 Checking userActivity collection...');
        const activitySnapshot = await db.collection('userActivity').limit(5).get();
        results.collections['userActivity'] = {
            total: activitySnapshot.size,
            status: 'ok' // Activity can be empty initially
        };
        results.summary.totalActivity = activitySnapshot.size;
        // Check scraperLogs collection
        console.log('🤖 Checking scraperLogs collection...');
        const scraperLogsSnapshot = await db.collection('scraperLogs')
            .orderBy('timestamp', 'desc')
            .limit(3)
            .get();
        results.collections['scraperLogs'] = {
            total: scraperLogsSnapshot.size,
            recentLogs: scraperLogsSnapshot.docs.map(doc => {
                var _a, _b;
                const data = doc.data();
                return {
                    timestamp: (_b = (_a = data.timestamp) === null || _a === void 0 ? void 0 : _a.toDate()) === null || _b === void 0 ? void 0 : _b.toISOString(),
                    status: data.status,
                    totalProcessed: data.totalProcessed,
                    totalErrors: data.totalErrors
                };
            }),
            status: 'ok'
        };
        // Overall health assessment
        const totalRecords = results.summary.totalScholarships + results.summary.totalUsers;
        if (totalRecords === 0) {
            results.status = 'unhealthy';
            results.issues.push('No data found in core collections');
        }
        else if (results.issues.length > 0) {
            results.status = 'warning';
        }
        else {
            results.status = 'healthy';
        }
        console.log('✅ Firestore verification completed successfully');
        console.log(`📊 Summary: ${totalRecords} total core records, ${results.issues.length} issues`);
        return results;
    }
    catch (error) {
        console.error('❌ Firestore verification failed:', error);
        results.status = 'error';
        results.issues.push(error instanceof Error ? error.message : 'Unknown error');
        return results;
    }
}
//# sourceMappingURL=verifyFirestore.js.map