/**
 * Firestore Verification Utility for Production
 */

import * as admin from 'firebase-admin';

export async function verifyFirestoreData(data: any, context: any): Promise<any> {
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
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          provider: data.provider,
          createdAt: data.createdAt?.toDate()?.toISOString(),
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
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email ? '***@***.***' : 'missing', // Mask email for privacy
          onboardingCompleted: data.onboardingCompleted,
          createdAt: data.createdAt?.toDate()?.toISOString(),
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
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          userId: data.userId ? 'user_***' : 'missing', // Mask user ID for privacy
          status: data.status,
          progress: data.progress,
          createdAt: data.createdAt?.toDate()?.toISOString()
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
        const data = doc.data();
        return {
          timestamp: data.timestamp?.toDate()?.toISOString(),
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
    } else if (results.issues.length > 0) {
      results.status = 'warning';
    } else {
      results.status = 'healthy';
    }

    console.log('✅ Firestore verification completed successfully');
    console.log(`📊 Summary: ${totalRecords} total core records, ${results.issues.length} issues`);

    return results;

  } catch (error) {
    console.error('❌ Firestore verification failed:', error);
    
    results.status = 'error';
    results.issues.push(error instanceof Error ? error.message : 'Unknown error');
    
    return results;
  }
}