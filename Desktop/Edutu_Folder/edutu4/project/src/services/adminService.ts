import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  AdminUser, 
  ModerationItem, 
  AdminStats, 
  SystemHealth,
  PaginatedResponse 
} from '../types/common';
import { UserGoal } from '../types/goals';
import { isValidUID, logSecurityEvent } from '../utils/security';

export class AdminService {
  
  // Admin Authentication and Authorization
  async checkAdminAccess(userId: string): Promise<boolean> {
    if (!isValidUID(userId)) {
      logSecurityEvent('invalid_uid_admin_check', { userId });
      return false;
    }

    try {
      const adminRef = doc(db, 'admins', userId);
      const adminSnap = await getDoc(adminRef);
      
      if (!adminSnap.exists()) {
        return false;
      }

      const adminData = adminSnap.data();
      return adminData.isActive && (adminData.role === 'admin' || adminData.role === 'moderator');
    } catch (error) {
      console.error('Error checking admin access:', error);
      logSecurityEvent('admin_access_check_error', { userId, error: (error as Error).message });
      return false;
    }
  }

  async getAdminUser(userId: string): Promise<AdminUser | null> {
    if (!isValidUID(userId)) return null;

    try {
      const adminRef = doc(db, 'admins', userId);
      const adminSnap = await getDoc(adminRef);
      
      if (!adminSnap.exists()) return null;

      return {
        uid: adminSnap.id,
        ...adminSnap.data()
      } as AdminUser;
    } catch (error) {
      console.error('Error getting admin user:', error);
      return null;
    }
  }

  // Moderation Queue Management
  async getModerationQueue(
    adminId: string,
    page: number = 1,
    limit: number = 20,
    status?: ModerationItem['status'],
    type?: ModerationItem['type']
  ): Promise<PaginatedResponse<ModerationItem>> {
    if (!await this.checkAdminAccess(adminId)) {
      throw new Error('Access denied');
    }

    try {
      let q = query(
        collection(db, 'moderation_queue'),
        orderBy('submittedAt', 'desc')
      );

      // Apply filters
      if (status) {
        q = query(q, where('status', '==', status));
      }
      if (type) {
        q = query(q, where('type', '==', type));
      }

      // Apply pagination
      if (page > 1) {
        const offset = (page - 1) * limit;
        const offsetQuery = query(q, limit(offset));
        const offsetSnapshot = await getDocs(offsetQuery);
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        
        if (lastDoc) {
          q = query(q, startAfter(lastDoc), limit(limit));
        }
      } else {
        q = query(q, limit(limit));
      }

      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ModerationItem));

      // Get total count (simplified - in production you'd cache this)
      const totalQuery = query(collection(db, 'moderation_queue'));
      const totalSnapshot = await getDocs(totalQuery);
      const total = totalSnapshot.size;

      return {
        items,
        total,
        page,
        limit,
        hasMore: items.length === limit && (page * limit) < total
      };
    } catch (error) {
      console.error('Error getting moderation queue:', error);
      throw error;
    }
  }

  async submitForModeration(
    goalId: string,
    userId: string,
    type: ModerationItem['type'] = 'goal'
  ): Promise<string> {
    try {
      // Get the goal data
      const goalRef = doc(db, 'goals', goalId);
      const goalSnap = await getDoc(goalRef);
      
      if (!goalSnap.exists() || goalSnap.data()?.userId !== userId) {
        throw new Error('Goal not found or access denied');
      }

      const goalData = goalSnap.data() as UserGoal;

      // Create moderation item
      const moderationData: Omit<ModerationItem, 'id'> = {
        type,
        title: goalData.title,
        description: goalData.description,
        submittedBy: userId,
        submittedAt: new Date(),
        status: 'pending',
        content: goalData,
        priority: goalData.priority as ModerationItem['priority'],
        category: goalData.category
      };

      const moderationRef = await addDoc(collection(db, 'moderation_queue'), {
        ...moderationData,
        submittedAt: serverTimestamp()
      });

      logSecurityEvent('moderation_submitted', { 
        moderationId: moderationRef.id, 
        goalId, 
        userId, 
        type 
      });

      return moderationRef.id;
    } catch (error) {
      console.error('Error submitting for moderation:', error);
      throw error;
    }
  }

  async moderateItem(
    moderationId: string,
    adminId: string,
    decision: 'approved' | 'rejected',
    reason?: string
  ): Promise<boolean> {
    if (!await this.checkAdminAccess(adminId)) {
      throw new Error('Access denied');
    }

    try {
      const moderationRef = doc(db, 'moderation_queue', moderationId);
      const moderationSnap = await getDoc(moderationRef);
      
      if (!moderationSnap.exists()) {
        throw new Error('Moderation item not found');
      }

      const moderationData = moderationSnap.data() as ModerationItem;

      // Update moderation status
      await updateDoc(moderationRef, {
        status: decision,
        moderatedBy: adminId,
        moderatedAt: serverTimestamp(),
        moderationReason: reason || ''
      });

      // If approved and it's a goal, update the goal status
      if (decision === 'approved' && moderationData.type === 'goal') {
        const goalRef = doc(db, 'goals', moderationData.content.id);
        await updateDoc(goalRef, {
          isPublic: true,
          approvedAt: serverTimestamp(),
          approvedBy: adminId
        });
      }

      logSecurityEvent('moderation_completed', {
        moderationId,
        adminId,
        decision,
        reason
      });

      return true;
    } catch (error) {
      console.error('Error moderating item:', error);
      return false;
    }
  }

  // User Management
  async getUsers(
    adminId: string,
    page: number = 1,
    limit: number = 50,
    searchTerm?: string
  ): Promise<PaginatedResponse<any>> {
    if (!await this.checkAdminAccess(adminId)) {
      throw new Error('Access denied');
    }

    try {
      let q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );

      if (searchTerm) {
        // Basic search - in production, you'd use a search service
        q = query(q, where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'));
      }

      if (page > 1) {
        const offset = (page - 1) * limit;
        const offsetQuery = query(q, limit(offset));
        const offsetSnapshot = await getDocs(offsetQuery);
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        
        if (lastDoc) {
          q = query(q, startAfter(lastDoc), limit(limit));
        }
      } else {
        q = query(q, limit(limit));
      }

      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get total count
      const totalQuery = query(collection(db, 'users'));
      const totalSnapshot = await getDocs(totalQuery);
      const total = totalSnapshot.size;

      return {
        items: users,
        total,
        page,
        limit,
        hasMore: users.length === limit && (page * limit) < total
      };
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  async updateUserStatus(
    adminId: string, 
    userId: string, 
    isActive: boolean,
    reason?: string
  ): Promise<boolean> {
    if (!await this.checkAdminAccess(adminId)) {
      throw new Error('Access denied');
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isActive,
        ...(reason && { suspensionReason: reason }),
        lastModifiedBy: adminId,
        lastModifiedAt: serverTimestamp()
      });

      logSecurityEvent('user_status_updated', {
        adminId,
        userId,
        isActive,
        reason
      });

      return true;
    } catch (error) {
      console.error('Error updating user status:', error);
      return false;
    }
  }

  // Analytics and Statistics
  async getAdminStats(adminId: string): Promise<AdminStats> {
    if (!await this.checkAdminAccess(adminId)) {
      throw new Error('Access denied');
    }

    try {
      // Get user stats
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const totalUsers = usersSnapshot.size;

      const activeUsersQuery = query(
        collection(db, 'users'),
        where('isActive', '==', true)
      );
      const activeUsersSnapshot = await getDocs(activeUsersQuery);
      const activeUsers = activeUsersSnapshot.size;

      // Get goal stats
      const goalsQuery = query(collection(db, 'goals'));
      const goalsSnapshot = await getDocs(goalsQuery);
      const totalGoals = goalsSnapshot.size;

      const completedGoalsQuery = query(
        collection(db, 'goals'),
        where('status', '==', 'completed')
      );
      const completedGoalsSnapshot = await getDocs(completedGoalsQuery);
      const completedGoals = completedGoalsSnapshot.size;

      // Get pending moderations
      const pendingModerationQuery = query(
        collection(db, 'moderation_queue'),
        where('status', '==', 'pending')
      );
      const pendingModerationSnapshot = await getDocs(pendingModerationQuery);
      const pendingModerations = pendingModerationSnapshot.size;

      // Calculate rates (simplified - in production you'd have more sophisticated analytics)
      const userGrowthRate = 5.2; // Placeholder
      const goalCompletionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
      const dailyActiveUsers = Math.floor(activeUsers * 0.3); // Placeholder
      const monthlyActiveUsers = activeUsers;

      return {
        totalUsers,
        activeUsers,
        totalGoals,
        pendingModerations,
        completedGoals,
        userGrowthRate,
        goalCompletionRate,
        dailyActiveUsers,
        monthlyActiveUsers
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      throw error;
    }
  }

  async getSystemHealth(adminId: string): Promise<SystemHealth> {
    if (!await this.checkAdminAccess(adminId)) {
      throw new Error('Access denied');
    }

    try {
      // In production, these would be real system metrics
      const startTime = Date.now();
      
      // Test database connection
      const testQuery = query(collection(db, 'users'), limit(1));
      await getDocs(testQuery);
      
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'warning' : 'critical',
        uptime: Date.now() - 1704067200000, // Placeholder: since Jan 1, 2024
        responseTime,
        errorRate: 0.02, // 2% error rate placeholder
        activeConnections: 150, // Placeholder
        databaseStatus: responseTime < 2000 ? 'connected' : 'slow',
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        status: 'critical',
        uptime: 0,
        responseTime: 0,
        errorRate: 100,
        activeConnections: 0,
        databaseStatus: 'disconnected',
        lastUpdated: new Date()
      };
    }
  }

  // Goal Management
  async getGoalsForModeration(
    adminId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<UserGoal>> {
    if (!await this.checkAdminAccess(adminId)) {
      throw new Error('Access denied');
    }

    try {
      let q = query(
        collection(db, 'goals'),
        where('category', '==', 'roadmap'), // Only roadmap goals need moderation
        orderBy('createdAt', 'desc')
      );

      if (page > 1) {
        const offset = (page - 1) * limit;
        const offsetQuery = query(q, limit(offset));
        const offsetSnapshot = await getDocs(offsetQuery);
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        
        if (lastDoc) {
          q = query(q, startAfter(lastDoc), limit(limit));
        }
      } else {
        q = query(q, limit(limit));
      }

      const querySnapshot = await getDocs(q);
      const goals = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserGoal));

      // Get total count
      const totalQuery = query(
        collection(db, 'goals'),
        where('category', '==', 'roadmap')
      );
      const totalSnapshot = await getDocs(totalQuery);
      const total = totalSnapshot.size;

      return {
        items: goals,
        total,
        page,
        limit,
        hasMore: goals.length === limit && (page * limit) < total
      };
    } catch (error) {
      console.error('Error getting goals for moderation:', error);
      throw error;
    }
  }

  async deleteGoal(adminId: string, goalId: string, reason: string): Promise<boolean> {
    if (!await this.checkAdminAccess(adminId)) {
      throw new Error('Access denied');
    }

    try {
      const goalRef = doc(db, 'goals', goalId);
      const goalSnap = await getDoc(goalRef);
      
      if (!goalSnap.exists()) {
        throw new Error('Goal not found');
      }

      // Archive instead of delete
      await updateDoc(goalRef, {
        isDeleted: true,
        deletedBy: adminId,
        deletedAt: serverTimestamp(),
        deletionReason: reason
      });

      logSecurityEvent('admin_goal_deleted', {
        adminId,
        goalId,
        reason
      });

      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      return false;
    }
  }

  // Real-time updates for admin dashboard
  subscribeToModerationQueue(
    adminId: string,
    callback: (items: ModerationItem[]) => void
  ): () => void {
    if (!isValidUID(adminId)) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'moderation_queue'),
      where('status', '==', 'pending'),
      orderBy('submittedAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ModerationItem));
      callback(items);
    });
  }

  subscribeToSystemStats(
    adminId: string,
    callback: (stats: AdminStats) => void
  ): () => void {
    if (!isValidUID(adminId)) {
      callback({
        totalUsers: 0,
        activeUsers: 0,
        totalGoals: 0,
        pendingModerations: 0,
        completedGoals: 0,
        userGrowthRate: 0,
        goalCompletionRate: 0,
        dailyActiveUsers: 0,
        monthlyActiveUsers: 0
      });
      return () => {};
    }

    // Update stats every 30 seconds
    const interval = setInterval(async () => {
      try {
        const stats = await this.getAdminStats(adminId);
        callback(stats);
      } catch (error) {
        console.error('Error updating system stats:', error);
      }
    }, 30000);

    // Initial load
    this.getAdminStats(adminId).then(callback).catch(console.error);

    return () => clearInterval(interval);
  }
}

export const adminService = new AdminService();