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
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  UserGoal, 
  CreateGoalData, 
  UpdateGoalData, 
  GoalMilestone, 
  UserActivity, 
  UserStreak, 
  ActivityType,
  GoalStats,
  GoalFilters,
  GoalSortOptions
} from '../types/goals';
import { isValidUID, sanitizeInput, logSecurityEvent } from '../utils/security';

export class GoalsService {
  
  
  // Helper method to remove undefined fields (Firestore doesn't accept undefined)
  private removeUndefinedFields(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedFields(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedFields(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  // Helper method to safely convert date to Firebase Timestamp
  private convertToFirebaseTimestamp(date: any): Timestamp | null {
    try {
      if (!date) return null;
      
      // If it's already a Timestamp, return it
      if (date instanceof Timestamp) {
        return date;
      }
      
      // If it's a Date object
      if (date instanceof Date) {
        // Check if the date is valid
        if (isNaN(date.getTime())) {
          console.warn('Invalid Date object provided:', date);
          return null;
        }
        return Timestamp.fromDate(date);
      }
      
      // If it's a string, try to parse it
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          console.warn('Invalid date string provided:', date);
          return null;
        }
        return Timestamp.fromDate(parsedDate);
      }
      
      // If it's a number (timestamp), convert it
      if (typeof date === 'number') {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
          console.warn('Invalid timestamp number provided:', date);
          return null;
        }
        return Timestamp.fromDate(dateObj);
      }
      
      console.warn('Unsupported date format:', typeof date, date);
      return null;
    } catch (error) {
      console.error('Error converting date to Timestamp:', error, date);
      return null;
    }
  }

  // Helper method to get goal reference with migration support
  private async getGoalRef(goalId: string, userId?: string): Promise<{ goalRef: any; goalData: any }> {
    // First try user subcollection if userId provided
    if (userId) {
      const userGoalRef = doc(db, 'users', userId, 'goals', goalId);
      const userGoalSnap = await getDoc(userGoalRef);
      if (userGoalSnap.exists()) {
        return { goalRef: userGoalRef, goalData: userGoalSnap.data() };
      }
    }
    
    // Try old flat structure for backward compatibility
    const oldGoalRef = doc(db, 'goals', goalId);
    const oldGoalSnap = await getDoc(oldGoalRef);
    
    if (oldGoalSnap.exists()) {
      const goalData = oldGoalSnap.data();
      const goalUserId = goalData.userId;
      
      // Migrate to new structure
      const newGoalRef = doc(db, 'users', goalUserId, 'goals', goalId);
      await setDoc(newGoalRef, goalData);
      await deleteDoc(oldGoalRef);
      
      return { goalRef: newGoalRef, goalData };
    }
    
    throw new Error('Goal not found');
  }
  
  // Create a new goal
  async createGoal(userId: string, goalData: CreateGoalData): Promise<string> {
    if (!isValidUID(userId)) {
      logSecurityEvent('invalid_uid_create_goal', { userId });
      throw new Error('Invalid user ID');
    }

    // Check for duplicate goals by title (case-insensitive)
    const existingGoals = await this.getUserGoals(userId);
    const normalizeTitle = (title: string) => title.toLowerCase().trim();
    const normalizedNewTitle = normalizeTitle(goalData.title);
    
    const duplicateGoal = existingGoals.find(goal => 
      normalizeTitle(goal.title) === normalizedNewTitle
    );
    
    if (duplicateGoal) {
      throw new Error(`A goal with the title "${goalData.title}" already exists. Please choose a different title.`);
    }

    // Sanitize inputs
    const sanitizedData: CreateGoalData = {
      ...goalData,
      title: sanitizeInput(goalData.title),
      description: sanitizeInput(goalData.description),
      tags: goalData.tags?.map(tag => sanitizeInput(tag)) || [],
      milestones: goalData.milestones?.map(milestone => ({
        ...milestone,
        title: sanitizeInput(milestone.title),
        description: milestone.description ? sanitizeInput(milestone.description) : ''
      })) || []
    };

    // Clean the data to remove undefined values (Firestore doesn't accept undefined)
    const cleanData = this.removeUndefinedFields({
      userId,
      ...sanitizedData,
      type: sanitizedData.type || 'medium_term',
      difficulty: sanitizedData.difficulty || 'medium',
      status: 'active',
      progress: 0,
      checkInCount: 0,
      streakDays: 0,
      milestones: sanitizedData.milestones?.map((milestone, index) => ({
        id: `milestone_${Date.now()}_${index}`,
        ...milestone,
        completed: false,
        order: index
      })) || [],
      // Store roadmap-specific data
      tasks: sanitizedData.tasks || [],
      monthlyRoadmap: sanitizedData.monthlyRoadmap || [], // Add support for monthlyRoadmap
      totalTasks: sanitizedData.totalTasks || 0,
      estimatedTime: sanitizedData.estimatedTime || '',
      skills: sanitizedData.skills || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      targetDate: goalData.targetDate ? this.convertToFirebaseTimestamp(goalData.targetDate) : null
    });

    console.log('🧹 Cleaned data for Firestore:', {
      hasUndefined: Object.values(cleanData).some(v => v === undefined),
      keys: Object.keys(cleanData),
      problematicFields: Object.entries(cleanData).filter(([_, v]) => v === undefined).map(([k]) => k)
    });

    // Use users/{userId}/goals/{goalId} structure for better organization and security
    const goalRef = await addDoc(collection(db, 'users', userId, 'goals'), cleanData);

    // Log activity
    await this.logActivity(userId, 'goal_created', [goalRef.id]);

    logSecurityEvent('goal_created', { userId, goalId: goalRef.id, title: sanitizedData.title });
    
    return goalRef.id;
  }

  // Get all goals for a user
  async getUserGoals(
    userId: string, 
    filters?: GoalFilters, 
    sort?: GoalSortOptions
  ): Promise<UserGoal[]> {
    if (!isValidUID(userId)) {
      logSecurityEvent('invalid_uid_get_goals', { userId });
      return [];
    }

    // Query user's goals subcollection directly (no need for userId filter)
    let q = query(
      collection(db, 'users', userId, 'goals')
    );

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      q = query(q, where('status', 'in', filters.status));
    }
    if (filters?.category && filters.category.length > 0) {
      q = query(q, where('category', 'in', filters.category));
    }

    // Temporarily remove sorting to avoid index requirement
    // TODO: Re-enable after creating composite index for userId + createdAt
    // if (sort) {
    //   q = query(q, orderBy(sort.field, sort.direction));
    // } else {
    //   q = query(q, orderBy('createdAt', 'desc'));
    // }

    const querySnapshot = await getDocs(q);
    const goals = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        targetDate: data.targetDate?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || new Date()
      } as UserGoal;
    });

    // Sort in JavaScript as temporary workaround
    return goals.sort((a, b) => {
      const aDate = a.createdAt || new Date(0);
      const bDate = b.createdAt || new Date(0);
      return bDate.getTime() - aDate.getTime(); // Descending order
    });
  }


  // Get single goal by ID
  async getGoalById(goalId: string, userId?: string): Promise<UserGoal | null> {
    if (!isValidUID(userId)) {
      logSecurityEvent('invalid_uid_get_goal', { userId, goalId });
      return null;
    }

    try {
      // Try new structure first
      const newRef = doc(db, 'users', userId, 'goals', goalId);
      const newSnap = await getDoc(newRef);
      
      if (newSnap.exists()) {
        const data = newSnap.data();
        return {
          id: newSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          targetDate: data.targetDate?.toDate?.() || null,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date()
        } as UserGoal;
      }

      // Fallback to old structure
      const oldRef = doc(db, 'goals', goalId);
      const oldSnap = await getDoc(oldRef);
      
      if (oldSnap.exists() && oldSnap.data().userId === userId) {
        const data = oldSnap.data();
        return {
          id: oldSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          targetDate: data.targetDate?.toDate?.() || null,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date()
        } as UserGoal;
      }

      return null;
    } catch (error) {
      console.error('Error fetching goal:', error);
      return null;
    }
  }

  // Get active goals count
  async getActiveGoalsCount(userId: string): Promise<number> {
    if (!isValidUID(userId)) return 0;

    const q = query(
      collection(db, 'users', userId, 'goals'),
      where('status', '==', 'active')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  }

  // Update goal
  async updateGoal(goalId: string, updates: UpdateGoalData, userId?: string): Promise<boolean> {
    try {
      const { goalRef, goalData } = await this.getGoalRef(goalId, userId);
      const goalUserId = goalData.userId;
      
      if (!isValidUID(goalUserId)) {
        logSecurityEvent('invalid_uid_update_goal', { userId: goalUserId, goalId });
        throw new Error('Invalid user ID');
      }

      // Sanitize updates
      const sanitizedUpdates: any = { ...updates };
      if (updates.title) sanitizedUpdates.title = sanitizeInput(updates.title);
      if (updates.description) sanitizedUpdates.description = sanitizeInput(updates.description);
      if (updates.tags) sanitizedUpdates.tags = updates.tags.map(tag => sanitizeInput(tag));
      if (updates.targetDate) sanitizedUpdates.targetDate = Timestamp.fromDate(updates.targetDate);

      sanitizedUpdates.updatedAt = serverTimestamp();

      await updateDoc(goalRef, sanitizedUpdates);

      // Log activity
      await this.logActivity(goalUserId, 'goal_updated', [goalId]);

      logSecurityEvent('goal_updated', { userId: goalUserId, goalId, updates: Object.keys(updates) });
      return true;
    } catch (error) {
      console.error('Error updating goal:', error);
      return false;
    }
  }

  // Complete a goal
  async completeGoal(goalId: string, userId?: string): Promise<boolean> {
    const success = await this.updateGoal(goalId, {
      status: 'completed',
      progress: 100
    }, userId);

    if (success) {
      // Add completed timestamp
      const { goalRef, goalData } = await this.getGoalRef(goalId, userId);
      const goalUserId = goalData?.userId;
      
      await updateDoc(goalRef, {
        completedAt: serverTimestamp()
      });

      // Log activity
      if (goalUserId) {
        await this.logActivity(goalUserId, 'goal_completed', [goalId]);
        logSecurityEvent('goal_completed', { userId: goalUserId, goalId });
      }
    }
    
    return success;
  }

  // Update goal progress
  async updateGoalProgress(goalId: string, progress: number, userId?: string): Promise<boolean> {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    const success = await this.updateGoal(goalId, { progress }, userId);
    
    if (success) {
      // Check in for streak
      const { goalRef, goalData } = await this.getGoalRef(goalId, userId);
      const goalUserId = goalData?.userId;
      if (goalUserId) {
        await this.checkInGoal(goalId, goalUserId);
      }
    }
    
    return success;
  }

  // Update task completion and recalculate progress
  async updateTaskCompletion(goalId: string, taskId: string, completed: boolean, userId?: string): Promise<boolean> {
    try {
      const { goalRef, goalData } = await this.getGoalRef(goalId, userId);
      
      if (!goalData) {
        throw new Error('Goal not found');
      }
      const goalUserId = goalData.userId;
      
      let updateData: any = {};
      let newProgress = 0;
      
      // Handle monthlyRoadmap structure (preferred)
      if (goalData.monthlyRoadmap && goalData.monthlyRoadmap.length > 0) {
        const updatedRoadmap = goalData.monthlyRoadmap.map((month: any) => ({
          ...month,
          tasks: month.tasks?.map((task: any) => 
            task.id === taskId ? { ...task, completed, completedAt: completed ? Timestamp.now() : null } : task
          ) || []
        }));
        
        // Calculate progress based on monthlyRoadmap tasks
        const totalTasks = updatedRoadmap.reduce((total: number, month: any) => 
          total + (month.tasks?.length || 0), 0
        );
        const completedTasks = updatedRoadmap.reduce((total: number, month: any) => 
          total + (month.tasks?.filter((task: any) => task.completed).length || 0), 0
        );
        newProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        updateData = {
          monthlyRoadmap: updatedRoadmap,
          progress: newProgress,
          updatedAt: serverTimestamp()
        };
      } 
      // Handle flat tasks structure (fallback)
      else if (goalData.tasks && goalData.tasks.length > 0) {
        const updatedTasks = goalData.tasks.map((task: any) => 
          task.id === taskId ? { ...task, completed, completedAt: completed ? Timestamp.now() : null } : task
        );
        
        const completedCount = updatedTasks.filter((task: any) => task.completed).length;
        const totalTasks = updatedTasks.length;
        newProgress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
        
        updateData = {
          tasks: updatedTasks,
          progress: newProgress,
          updatedAt: serverTimestamp()
        };
      }
      // Handle milestones structure (fallback)
      else if (goalData.milestones && goalData.milestones.length > 0) {
        const updatedMilestones = goalData.milestones.map((milestone: any) => 
          milestone.id === taskId ? { ...milestone, completed, completedAt: completed ? Timestamp.now() : null } : milestone
        );
        
        const completedCount = updatedMilestones.filter((milestone: any) => milestone.completed).length;
        const totalMilestones = updatedMilestones.length;
        newProgress = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;
        
        updateData = {
          milestones: updatedMilestones,
          progress: newProgress,
          updatedAt: serverTimestamp()
        };
      }
      
      // Update the goal
      if (Object.keys(updateData).length > 0) {
        await updateDoc(goalRef, updateData);
        
        // Log activity and check in for streak
        if (goalUserId) {
          await this.logActivity(goalUserId, completed ? 'goal_updated' : 'goal_updated', [goalId]);
          await this.checkInGoal(goalId, goalUserId);
        }
        
        logSecurityEvent('task_completion_updated', { userId: goalUserId, goalId, taskId, completed, newProgress });
      }

      return true;
    } catch (error) {
      console.error('Error updating task completion:', error);
      return false;
    }
  }

  // Check in on a goal (for streak tracking)
  async checkInGoal(goalId: string, userId: string): Promise<void> {
    const { goalRef, goalData } = await this.getGoalRef(goalId, userId);
    
    if (!goalData || goalData.userId !== userId) {
      throw new Error('Goal not found or access denied');
    }
    const today = new Date().toISOString().split('T')[0];
    const lastChecked = goalData.lastCheckedAt?.toDate().toISOString().split('T')[0];

    // Only count one check-in per day
    if (lastChecked !== today) {
      await updateDoc(goalRef, {
        lastCheckedAt: serverTimestamp(),
        checkInCount: (goalData.checkInCount || 0) + 1
      });

      // Update user activity and streak
      await this.updateUserStreak(userId, [goalId]);
    }
  }

  // Complete a milestone
  async completeMilestone(goalId: string, milestoneId: string, userId: string): Promise<void> {
    const { goalRef, goalData } = await this.getGoalRef(goalId, userId);
    
    if (!goalData || goalData.userId !== userId) {
      throw new Error('Goal not found or access denied');
    }
    const milestones = goalData.milestones || [];
    
    const updatedMilestones = milestones.map((milestone: GoalMilestone) => {
      if (milestone.id === milestoneId) {
        return {
          ...milestone,
          completed: true,
          completedAt: new Date()
        };
      }
      return milestone;
    });

    // Calculate new progress based on completed milestones
    const completedCount = updatedMilestones.filter((m: GoalMilestone) => m.completed).length;
    const totalCount = updatedMilestones.length;
    const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    await updateDoc(goalRef, {
      milestones: updatedMilestones,
      progress: newProgress,
      updatedAt: serverTimestamp()
    });

    // Log activity
    await this.logActivity(userId, 'milestone_completed', [goalId]);

    logSecurityEvent('milestone_completed', { userId, goalId, milestoneId });
  }

  // Delete goal
  async deleteGoal(goalId: string, userId?: string): Promise<boolean> {
    try {
      const { goalRef, goalData } = await this.getGoalRef(goalId, userId);
      
      if (!goalData) {
        throw new Error('Goal not found');
      }
      
      const goalUserId = goalData.userId;
      
      await deleteDoc(goalRef);
      logSecurityEvent('goal_deleted', { userId: goalUserId, goalId });
      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      return false;
    }
  }

  // Get goal statistics
  async getGoalStats(userId: string): Promise<GoalStats> {
    if (!isValidUID(userId)) {
      return {
        totalGoals: 0,
        activeGoals: 0,
        completedGoals: 0,
        averageProgress: 0,
        goalsCompletedThisMonth: 0,
        currentStreak: 0,
        longestStreak: 0
      };
    }

    const goals = await this.getUserGoals(userId);
    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');
    
    // Goals completed this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const goalsCompletedThisMonth = completedGoals.filter(g => 
      g.completedAt && g.completedAt.toDate() >= thisMonth
    ).length;

    // Average progress of active goals
    const averageProgress = activeGoals.length > 0 
      ? activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / activeGoals.length 
      : 0;

    // Get streak data
    const streakData = await this.getUserStreak(userId);

    return {
      totalGoals: goals.length,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      averageProgress: Math.round(averageProgress),
      goalsCompletedThisMonth,
      currentStreak: streakData?.currentStreak || 0,
      longestStreak: streakData?.longestStreak || 0
    };
  }

  // Activity and Streak Management
  async logActivity(userId: string, activityType: ActivityType, goalIds: string[] = []): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get or create today's activity document
    const activityRef = doc(db, 'activities', `${userId}_${today}`);
    const activitySnap = await getDoc(activityRef);

    const currentActivities = activitySnap.exists() 
      ? activitySnap.data().activities || []
      : [];

    const updatedActivities = [...currentActivities, activityType];
    const allGoalsWorkedOn = activitySnap.exists() 
      ? [...new Set([...(activitySnap.data().goalsWorkedOn || []), ...goalIds])]
      : goalIds;

    const activityData: Partial<UserActivity> = {
      userId,
      date: today,
      timestamp: serverTimestamp(),
      activities: updatedActivities,
      goalsWorkedOn: allGoalsWorkedOn
    };

    await updateDoc(activityRef, activityData).catch(async () => {
      // Document doesn't exist, create it
      await addDoc(collection(db, 'activities'), {
        id: `${userId}_${today}`,
        ...activityData
      });
    });
  }

  async updateUserStreak(userId: string, goalIds: string[]): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const streakRef = doc(db, 'streaks', userId);
    const streakSnap = await getDoc(streakRef);

    let streakData: Partial<UserStreak>;

    if (streakSnap.exists()) {
      streakData = streakSnap.data();
      const lastActiveDate = streakData.lastActiveDate;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Calculate streak
      if (lastActiveDate === today) {
        // Already active today, no change needed
        return;
      } else if (lastActiveDate === yesterdayStr) {
        // Continuing streak
        streakData.currentStreak = (streakData.currentStreak || 0) + 1;
      } else {
        // Streak broken, start new
        streakData.currentStreak = 1;
      }

      // Update longest streak
      streakData.longestStreak = Math.max(
        streakData.longestStreak || 0, 
        streakData.currentStreak
      );

    } else {
      // First time user
      streakData = {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        streakHistory: [],
        createdAt: serverTimestamp()
      };
    }

    // Update streak data
    streakData.lastActiveDate = today;
    streakData.updatedAt = serverTimestamp();

    // Add today to history
    const newDay = {
      date: today,
      active: true,
      activitiesCount: 1,
      goalsWorkedOn: goalIds
    };

    streakData.streakHistory = [
      ...(streakData.streakHistory || []).filter(day => day.date !== today),
      newDay
    ].slice(-30); // Keep last 30 days

    await updateDoc(streakRef, streakData).catch(async () => {
      // Document doesn't exist, create it
      await addDoc(collection(db, 'streaks'), {
        ...streakData,
        id: userId
      });
    });
  }

  async getUserStreak(userId: string): Promise<UserStreak | null> {
    if (!isValidUID(userId)) return null;

    const streakRef = doc(db, 'streaks', userId);
    const streakSnap = await getDoc(streakRef);

    if (!streakSnap.exists()) {
      return null;
    }

    return { id: streakSnap.id, ...streakSnap.data() } as UserStreak;
  }

  // Real-time goal updates
  subscribeToUserGoals(
    userId: string, 
    callback: (goals: UserGoal[]) => void,
    filters?: GoalFilters
  ): () => void {
    if (!isValidUID(userId)) {
      callback([]);
      return () => {};
    }

    let q = query(
      collection(db, 'users', userId, 'goals'),
      orderBy('createdAt', 'desc')
    );

    if (filters?.status && filters.status.length > 0) {
      q = query(q, where('status', 'in', filters.status));
    }

    return onSnapshot(q, (snapshot) => {
      const goals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserGoal));
      callback(goals);
    });
  }

  // Migration helper - move goals from flat to user subcollection structure
  async migrateUserGoals(userId: string): Promise<void> {
    if (!isValidUID(userId)) return;
    
    try {
      console.log('🔄 Starting goal migration for user:', userId);
      
      // Get all goals from old flat structure for this user
      const oldGoalsQuery = query(
        collection(db, 'goals'),
        where('userId', '==', userId)
      );
      
      const oldGoalsSnapshot = await getDocs(oldGoalsQuery);
      
      if (oldGoalsSnapshot.empty) {
        console.log('✅ No goals to migrate for user:', userId);
        return;
      }
      
      const batch = writeBatch(db);
      let migratedCount = 0;
      
      for (const oldGoalDoc of oldGoalsSnapshot.docs) {
        const goalData = oldGoalDoc.data();
        const goalId = oldGoalDoc.id;
        
        // Create in new location
        const newGoalRef = doc(db, 'users', userId, 'goals', goalId);
        batch.set(newGoalRef, goalData);
        
        // Mark old for deletion
        batch.delete(oldGoalDoc.ref);
        
        migratedCount++;
      }
      
      await batch.commit();
      console.log(`✅ Successfully migrated ${migratedCount} goals for user:`, userId);
      
    } catch (error) {
      console.error('❌ Error migrating goals:', error);
      throw error;
    }
  }
}

export const goalsService = new GoalsService();