/**
 * Scheduled Functions for Goals System
 * Automated tasks for maintaining and optimizing the goals system
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateDailyAnalytics } from '../utils/goalsFirebase';
import { GoalsService } from '../services/goalsService';

const db = admin.firestore();
const goalsService = new GoalsService();

/**
 * Daily Analytics Generation
 * Runs every day at 1 AM UTC to generate system analytics
 */
export const dailyAnalyticsGeneration = async (context: functions.EventContext) => {
  console.log('Starting daily analytics generation...');
  
  try {
    await generateDailyAnalytics();
    console.log('Daily analytics generated successfully');
    
    // Log the completion
    await db.collection('systemLogs').add({
      type: 'scheduled_task',
      task: 'daily_analytics',
      status: 'completed',
      timestamp: new Date(),
      executionTime: Date.now() - (new Date(context.timestamp).getTime())
    });
    
    return { success: true, message: 'Daily analytics generated' };
  } catch (error) {
    console.error('Error generating daily analytics:', error);
    
    // Log the error
    await db.collection('systemLogs').add({
      type: 'scheduled_task',
      task: 'daily_analytics',
      status: 'failed',
      error: (error as Error).message,
      timestamp: new Date(),
      executionTime: Date.now() - (new Date(context.timestamp).getTime())
    });
    
    throw error;
  }
};

/**
 * Weekly Goal Reminders
 * Runs every Monday at 9 AM UTC to send goal reminders to users
 */
export const weeklyGoalReminders = async (context: functions.EventContext) => {
  console.log('Starting weekly goal reminders...');
  
  try {
    // Get all users with active goals and reminder settings enabled
    const usersWithGoals = await db.collection('userGoals')
      .where('status', '==', 'active')
      .where('settings.reminders.enabled', '==', true)
      .where('settings.reminders.frequency', '==', 'weekly')
      .get();

    const reminderPromises = [];
    const processedUsers = new Set();

    for (const doc of usersWithGoals.docs) {
      const goal = doc.data();
      const userId = goal.userId;
      
      // Avoid sending multiple reminders to the same user
      if (processedUsers.has(userId)) continue;
      processedUsers.add(userId);

      // Create reminder notification
      const reminderPromise = createGoalReminder(userId, goal);
      reminderPromises.push(reminderPromise);
    }

    await Promise.all(reminderPromises);
    
    console.log(`Weekly reminders sent to ${processedUsers.size} users`);
    
    // Log the completion
    await db.collection('systemLogs').add({
      type: 'scheduled_task',
      task: 'weekly_reminders',
      status: 'completed',
      usersNotified: processedUsers.size,
      timestamp: new Date(),
      executionTime: Date.now() - (new Date(context.timestamp).getTime())
    });
    
    return { success: true, usersNotified: processedUsers.size };
  } catch (error) {
    console.error('Error sending weekly reminders:', error);
    
    await db.collection('systemLogs').add({
      type: 'scheduled_task',
      task: 'weekly_reminders',
      status: 'failed',
      error: (error as Error).message,
      timestamp: new Date(),
      executionTime: Date.now() - (new Date(context.timestamp).getTime())
    });
    
    throw error;
  }
};

/**
 * Monthly Goal Analytics
 * Runs on the 1st of each month to generate detailed goal analytics
 */
export const monthlyGoalAnalytics = async (context: functions.EventContext) => {
  console.log('Starting monthly goal analytics...');
  
  try {
    // Calculate monthly metrics
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    
    // Aggregate data for the past month
    const [
      goalsCreated,
      goalsCompleted,
      activeUsers,
      marketplaceSubmissions
    ] = await Promise.all([
      db.collection('userGoals')
        .where('createdAt', '>=', lastMonthStart)
        .where('createdAt', '<', monthStart)
        .count().get(),
      db.collection('userGoals')
        .where('status', '==', 'completed')
        .where('completedAt', '>=', lastMonthStart)
        .where('completedAt', '<', monthStart)
        .count().get(),
      db.collection('userGoals')
        .where('updatedAt', '>=', lastMonthStart)
        .where('updatedAt', '<', monthStart)
        .get(),
      db.collection('marketplaceGoals')
        .where('createdAt', '>=', lastMonthStart)
        .where('createdAt', '<', monthStart)
        .count().get()
    ]);

    // Calculate unique active users
    const uniqueUsers = new Set();
    activeUsers.docs.forEach(doc => uniqueUsers.add(doc.data().userId));

    // Generate category breakdown
    const categoryBreakdown: { [key: string]: number } = {};
    const goalsSnapshot = await db.collection('userGoals')
      .where('createdAt', '>=', lastMonthStart)
      .where('createdAt', '<', monthStart)
      .get();
    
    goalsSnapshot.docs.forEach(doc => {
      const category = doc.data().category;
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    });

    const monthlyReport = {
      id: `monthly_${lastMonthStart.getFullYear()}_${lastMonthStart.getMonth() + 1}`,
      period: {
        start: lastMonthStart,
        end: monthStart
      },
      metrics: {
        goalsCreated: goalsCreated.data().count,
        goalsCompleted: goalsCompleted.data().count,
        activeUsers: uniqueUsers.size,
        marketplaceSubmissions: marketplaceSubmissions.data().count,
        completionRate: goalsCreated.data().count > 0 
          ? (goalsCompleted.data().count / goalsCreated.data().count) * 100 
          : 0,
        categoryBreakdown
      },
      generatedAt: new Date()
    };

    // Save monthly report
    await db.collection('monthlyReports').doc(monthlyReport.id).set(monthlyReport);
    
    console.log('Monthly analytics generated successfully');
    
    return { success: true, report: monthlyReport };
  } catch (error) {
    console.error('Error generating monthly analytics:', error);
    throw error;
  }
};

/**
 * Goal Progress Stall Detection
 * Runs daily at 6 PM UTC to identify users with stalled progress
 */
export const progressStallDetection = async (context: functions.EventContext) => {
  console.log('Starting progress stall detection...');
  
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Find goals that haven't been updated in 7 days and are less than 75% complete
    const stalledGoals = await db.collection('userGoals')
      .where('status', '==', 'active')
      .where('progress', '<', 75)
      .where('updatedAt', '<', sevenDaysAgo)
      .get();

    const encouragementPromises = [];
    
    for (const doc of stalledGoals.docs) {
      const goal = doc.data();
      
      // Send encouragement notification
      const encouragementPromise = sendEncouragementNotification(goal.userId, goal);
      encouragementPromises.push(encouragementPromise);
    }

    await Promise.all(encouragementPromises);
    
    console.log(`Encouragement sent to ${stalledGoals.docs.length} users with stalled goals`);
    
    return { success: true, usersEncouraged: stalledGoals.docs.length };
  } catch (error) {
    console.error('Error in progress stall detection:', error);
    throw error;
  }
};

/**
 * Marketplace Content Moderation
 * Runs every 4 hours to auto-moderate simple cases
 */
export const autoModerationCheck = async (context: functions.EventContext) => {
  console.log('Starting auto-moderation check...');
  
  try {
    // Get pending marketplace goals
    const pendingGoals = await db.collection('marketplaceGoals')
      .where('status', '==', 'pending')
      .where('createdAt', '<', new Date(Date.now() - 2 * 60 * 60 * 1000)) // Older than 2 hours
      .limit(50)
      .get();

    let autoApproved = 0;
    let autoRejected = 0;

    for (const doc of pendingGoals.docs) {
      const goal = doc.data();
      
      // Simple auto-moderation rules
      const shouldAutoApprove = await shouldAutoApproveGoal(goal);
      const shouldAutoReject = await shouldAutoRejectGoal(goal);
      
      if (shouldAutoApprove && !shouldAutoReject) {
        await doc.ref.update({
          status: 'approved',
          'moderationInfo.moderatedBy': 'system',
          'moderationInfo.moderatedAt': new Date(),
          'moderationInfo.moderationNotes': 'Auto-approved by system',
          updatedAt: new Date()
        });
        autoApproved++;
      } else if (shouldAutoReject) {
        await doc.ref.update({
          status: 'rejected',
          'moderationInfo.moderatedBy': 'system',
          'moderationInfo.moderatedAt': new Date(),
          'moderationInfo.rejectionReason': 'Auto-rejected by system for policy violation',
          updatedAt: new Date()
        });
        autoRejected++;
      }
    }
    
    console.log(`Auto-moderation completed: ${autoApproved} approved, ${autoRejected} rejected`);
    
    return { success: true, autoApproved, autoRejected };
  } catch (error) {
    console.error('Error in auto-moderation:', error);
    throw error;
  }
};

/**
 * Cleanup Old Data
 * Runs weekly to clean up old sessions and logs
 */
export const weeklyDataCleanup = async (context: functions.EventContext) => {
  console.log('Starting weekly data cleanup...');
  
  try {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const batch = db.batch();
    
    // Clean up old goal sessions (keep only last 60 days)
    const oldSessions = await db.collection('goalSessions')
      .where('startTime', '<', sixtyDaysAgo)
      .limit(1000)
      .get();
    
    oldSessions.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Clean up old system logs (keep only last 60 days)
    const oldLogs = await db.collection('systemLogs')
      .where('timestamp', '<', sixtyDaysAgo)
      .limit(1000)
      .get();
    
    oldLogs.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`Cleanup completed: ${oldSessions.docs.length} sessions, ${oldLogs.docs.length} logs deleted`);
    
    return { 
      success: true, 
      sessionsDeleted: oldSessions.docs.length,
      logsDeleted: oldLogs.docs.length 
    };
  } catch (error) {
    console.error('Error in data cleanup:', error);
    throw error;
  }
};

// Helper Functions

async function createGoalReminder(userId: string, goal: any): Promise<void> {
  try {
    const notificationId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.collection('notifications').doc(notificationId).set({
      id: notificationId,
      userId,
      type: 'goal_reminder',
      title: `Don't forget about your goal: ${goal.title}`,
      message: `You're ${goal.progress}% complete! Keep going to achieve your goal.`,
      data: {
        goalId: goal.id,
        goalTitle: goal.title,
        progress: goal.progress
      },
      isRead: false,
      createdAt: new Date()
    });
  } catch (error) {
    console.error(`Error creating reminder for user ${userId}:`, error);
  }
}

async function sendEncouragementNotification(userId: string, goal: any): Promise<void> {
  try {
    const notificationId = `encouragement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await db.collection('notifications').doc(notificationId).set({
      id: notificationId,
      userId,
      type: 'encouragement',
      title: `You've got this! 💪`,
      message: `Your goal "${goal.title}" is waiting for you. Small steps lead to big achievements!`,
      data: {
        goalId: goal.id,
        goalTitle: goal.title,
        progress: goal.progress,
        daysSinceUpdate: Math.floor((Date.now() - goal.updatedAt.toDate().getTime()) / (24 * 60 * 60 * 1000))
      },
      isRead: false,
      createdAt: new Date()
    });
  } catch (error) {
    console.error(`Error sending encouragement to user ${userId}:`, error);
  }
}

async function shouldAutoApproveGoal(goal: any): Promise<boolean> {
  // Simple rules for auto-approval
  const hasValidStructure = goal.title && goal.description && goal.roadmap && goal.roadmap.length > 0;
  const hasReasonableLength = goal.title.length >= 5 && goal.description.length >= 20;
  const hasValidCategory = ['personal', 'career', 'education', 'health', 'skill', 'business'].includes(goal.category);
  
  return hasValidStructure && hasReasonableLength && hasValidCategory;
}

async function shouldAutoRejectGoal(goal: any): Promise<boolean> {
  // Simple rules for auto-rejection
  const forbiddenWords = ['spam', 'fake', 'scam', 'illegal'];
  const contentToCheck = `${goal.title} ${goal.description}`.toLowerCase();
  
  const containsForbiddenWords = forbiddenWords.some(word => contentToCheck.includes(word));
  const isTooShort = goal.title.length < 3 || goal.description.length < 10;
  const hasNoRoadmap = !goal.roadmap || goal.roadmap.length === 0;
  
  return containsForbiddenWords || isTooShort || hasNoRoadmap;
}