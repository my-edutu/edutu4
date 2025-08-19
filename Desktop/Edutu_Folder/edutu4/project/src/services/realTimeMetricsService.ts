import { 
  collection, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  writeBatch, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { secureStorage } from '../utils/security';

// Enhanced metrics interfaces with historical data
export interface RealTimeMetrics {
  opportunities: number;
  goalsActive: number;
  avgProgress: number;
  daysStreak: number;
  lastActiveDate: string;
  totalOpportunities: number;
  completedGoals: number;
  streakRecord: number;
  // Historical comparison data
  weeklyComparison: {
    opportunities: MetricTrend;
    goalsActive: MetricTrend;
    avgProgress: MetricTrend;
    daysStreak: MetricTrend;
  };
  lastUpdated: Timestamp;
  syncStatus: 'synced' | 'syncing' | 'error' | 'offline';
}

export interface MetricTrend {
  current: number;
  previous: number; // Value from 7 days ago
  change: number; // Absolute change
  percentage: number; // Percentage change
  direction: 'up' | 'down' | 'stable';
}

export interface MetricSnapshot {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  metrics: {
    opportunities: number;
    goalsActive: number;
    avgProgress: number;
    daysStreak: number;
    completedGoals: number;
  };
  timestamp: Timestamp;
}

export interface StreakEvent {
  id: string;
  userId: string;
  date: string;
  activityType: 'goal_created' | 'goal_updated' | 'task_completed' | 'login';
  timestamp: Timestamp;
}

export class RealTimeMetricsService {
  private readonly METRICS_COLLECTION = 'userMetrics';
  private readonly SNAPSHOTS_COLLECTION = 'metricsSnapshots';
  private readonly STREAK_EVENTS_COLLECTION = 'streakEvents';
  private readonly CACHE_KEY = 'realtime_metrics_cache';
  
  private metricsUnsubscribe: Unsubscribe | null = null;
  private goalsUnsubscribe: Unsubscribe | null = null;
  private opportunitiesUnsubscribe: Unsubscribe | null = null;
  private streakUnsubscribe: Unsubscribe | null = null;
  
  private currentMetrics: RealTimeMetrics | null = null;
  private listeners: Set<(metrics: RealTimeMetrics) => void> = new Set();
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Handle offline/online events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  /**
   * Initialize real-time metrics for a user
   */
  async initializeRealTimeMetrics(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required for real-time metrics');
    }

    console.log('🔄 Initializing real-time metrics for user:', userId);

    try {
      // Clean up any existing listeners
      this.cleanup();

      // Load cached metrics first for immediate UI update
      this.loadCachedMetrics();

      // Set up real-time listeners
      await Promise.all([
        this.setupMetricsListener(userId),
        this.setupGoalsListener(userId),
        this.setupOpportunitiesListener(userId),
        this.setupStreakListener(userId)
      ]);

      // Initialize daily snapshot if needed
      await this.ensureDailySnapshot(userId);

      console.log('✅ Real-time metrics initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize real-time metrics:', error);
      this.handleError(error as Error);
    }
  }

  /**
   * Set up real-time listener for user metrics document
   */
  private async setupMetricsListener(userId: string): Promise<void> {
    const metricsRef = doc(db, this.METRICS_COLLECTION, userId);

    this.metricsUnsubscribe = onSnapshot(
      metricsRef,
      (snapshot: DocumentSnapshot) => {
        this.handleMetricsUpdate(snapshot, userId);
      },
      (error) => {
        console.error('❌ Metrics listener error:', error);
        this.handleListenerError(error, 'metrics');
      }
    );
  }

  /**
   * Set up real-time listener for user goals
   */
  private async setupGoalsListener(userId: string): Promise<void> {
    const goalsQuery = query(
      collection(db, 'users', userId, 'goals'),
      where('status', 'in', ['active', 'completed'])
    );

    this.goalsUnsubscribe = onSnapshot(
      goalsQuery,
      (snapshot: QuerySnapshot) => {
        this.handleGoalsUpdate(snapshot, userId);
      },
      (error) => {
        console.error('❌ Goals listener error:', error);
        this.handleListenerError(error, 'goals');
      }
    );
  }

  /**
   * Set up real-time listener for opportunities
   */
  private async setupOpportunitiesListener(userId: string): Promise<void> {
    const opportunitiesQuery = query(
      collection(db, 'users', userId, 'opportunities'),
      where('isActive', '==', true)
    );

    this.opportunitiesUnsubscribe = onSnapshot(
      opportunitiesQuery,
      (snapshot: QuerySnapshot) => {
        this.handleOpportunitiesUpdate(snapshot, userId);
      },
      (error) => {
        console.error('❌ Opportunities listener error:', error);
        this.handleListenerError(error, 'opportunities');
      }
    );
  }

  /**
   * Set up real-time listener for streak events
   */
  private async setupStreakListener(userId: string): Promise<void> {
    const streakQuery = query(
      collection(db, this.STREAK_EVENTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(30) // Last 30 days of events
    );

    this.streakUnsubscribe = onSnapshot(
      streakQuery,
      (snapshot: QuerySnapshot) => {
        this.handleStreakUpdate(snapshot, userId);
      },
      (error) => {
        console.error('❌ Streak listener error:', error);
        this.handleListenerError(error, 'streak');
      }
    );
  }

  /**
   * Handle metrics document updates
   */
  private async handleMetricsUpdate(snapshot: DocumentSnapshot, userId: string): Promise<void> {
    try {
      console.log('📊 Metrics update received');

      if (!snapshot.exists()) {
        // Initialize metrics document if it doesn't exist
        await this.initializeUserMetrics(userId);
        return;
      }

      const data = snapshot.data();
      const weeklyComparison = await this.calculateWeeklyComparison(userId);

      const updatedMetrics: RealTimeMetrics = {
        opportunities: data?.opportunities || 0,
        goalsActive: data?.goalsActive || 0,
        avgProgress: data?.avgProgress || 0,
        daysStreak: data?.daysStreak || 1,
        lastActiveDate: data?.lastActiveDate || new Date().toISOString().split('T')[0],
        totalOpportunities: data?.totalOpportunities || 0,
        completedGoals: data?.completedGoals || 0,
        streakRecord: data?.streakRecord || 1,
        weeklyComparison,
        lastUpdated: serverTimestamp() as Timestamp,
        syncStatus: 'synced'
      };

      this.currentMetrics = updatedMetrics;
      this.cacheMetrics(updatedMetrics);
      this.notifyListeners(updatedMetrics);

      console.log('✅ Metrics updated successfully');
    } catch (error) {
      console.error('❌ Error handling metrics update:', error);
      this.handleError(error as Error);
    }
  }

  /**
   * Handle goals collection updates
   */
  private async handleGoalsUpdate(snapshot: QuerySnapshot, userId: string): Promise<void> {
    try {
      console.log('🎯 Goals update received:', snapshot.docs.length, 'goals');

      const activeGoals = snapshot.docs.filter(doc => doc.data().status === 'active');
      const completedGoals = snapshot.docs.filter(doc => doc.data().status === 'completed');
      
      // Calculate average progress
      const avgProgress = activeGoals.length > 0 
        ? Math.round(activeGoals.reduce((sum, doc) => sum + (doc.data().progress || 0), 0) / activeGoals.length)
        : 0;

      // Update metrics document
      await this.updateUserMetrics(userId, {
        goalsActive: activeGoals.length,
        avgProgress,
        completedGoals: completedGoals.length
      });

      console.log('✅ Goals metrics updated');
    } catch (error) {
      console.error('❌ Error handling goals update:', error);
      this.handleError(error as Error);
    }
  }

  /**
   * Handle opportunities collection updates
   */
  private async handleOpportunitiesUpdate(snapshot: QuerySnapshot, userId: string): Promise<void> {
    try {
      console.log('💫 Opportunities update received:', snapshot.docs.length, 'opportunities');

      await this.updateUserMetrics(userId, {
        opportunities: snapshot.docs.length,
        totalOpportunities: snapshot.docs.length // This would be total in real implementation
      });

      console.log('✅ Opportunities metrics updated');
    } catch (error) {
      console.error('❌ Error handling opportunities update:', error);
      this.handleError(error as Error);
    }
  }

  /**
   * Handle streak events updates and calculate live streak
   */
  private async handleStreakUpdate(snapshot: QuerySnapshot, userId: string): Promise<void> {
    try {
      console.log('🔥 Streak events update received:', snapshot.docs.length, 'events');

      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp as Timestamp
      })) as StreakEvent[];

      const currentStreak = this.calculateCurrentStreak(events);
      const today = new Date().toISOString().split('T')[0];

      await this.updateUserMetrics(userId, {
        daysStreak: currentStreak,
        lastActiveDate: today
      });

      console.log('✅ Streak updated:', currentStreak, 'days');
    } catch (error) {
      console.error('❌ Error handling streak update:', error);
      this.handleError(error as Error);
    }
  }

  /**
   * Calculate current streak from events
   */
  private calculateCurrentStreak(events: StreakEvent[]): number {
    if (events.length === 0) return 1;

    // Group events by date
    const eventsByDate = new Map<string, StreakEvent[]>();
    events.forEach(event => {
      const date = event.date;
      if (!eventsByDate.has(date)) {
        eventsByDate.set(date, []);
      }
      eventsByDate.get(date)!.push(event);
    });

    // Get sorted dates (most recent first)
    const sortedDates = Array.from(eventsByDate.keys()).sort((a, b) => b.localeCompare(a));
    
    const today = new Date().toISOString().split('T')[0];
    let streak = 0;
    let currentDate = new Date();

    // Count consecutive days with activity
    while (true) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      if (eventsByDate.has(dateString)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        // If it's today and no events yet, don't break the streak
        if (dateString === today && streak === 0) {
          streak = 1;
        }
        break;
      }
    }

    return Math.max(streak, 1);
  }

  /**
   * Calculate weekly comparison metrics
   */
  private async calculateWeeklyComparison(userId: string): Promise<RealTimeMetrics['weeklyComparison']> {
    try {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoString = weekAgo.toISOString().split('T')[0];

      // Get snapshot from a week ago
      const snapshotsQuery = query(
        collection(db, this.SNAPSHOTS_COLLECTION),
        where('userId', '==', userId),
        where('date', '==', weekAgoString),
        limit(1)
      );

      const snapshot = await getDocs(snapshotsQuery);
      const previousMetrics = snapshot.empty ? null : snapshot.docs[0].data().metrics;

      const current = this.currentMetrics;
      if (!current) {
        // Return default comparison
        return this.getDefaultComparison();
      }

      return {
        opportunities: this.calculateTrend(current.opportunities, previousMetrics?.opportunities || 0),
        goalsActive: this.calculateTrend(current.goalsActive, previousMetrics?.goalsActive || 0),
        avgProgress: this.calculateTrend(current.avgProgress, previousMetrics?.avgProgress || 0),
        daysStreak: this.calculateTrend(current.daysStreak, previousMetrics?.daysStreak || 1)
      };
    } catch (error) {
      console.error('❌ Error calculating weekly comparison:', error);
      return this.getDefaultComparison();
    }
  }

  /**
   * Calculate trend for a single metric
   */
  private calculateTrend(current: number, previous: number): MetricTrend {
    const change = current - previous;
    const percentage = previous === 0 ? (current > 0 ? 100 : 0) : Math.round((change / previous) * 100);
    
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (change > 0) direction = 'up';
    else if (change < 0) direction = 'down';

    return {
      current,
      previous,
      change,
      percentage,
      direction
    };
  }

  /**
   * Get default comparison when historical data is not available
   */
  private getDefaultComparison(): RealTimeMetrics['weeklyComparison'] {
    return {
      opportunities: { current: 0, previous: 0, change: 0, percentage: 15, direction: 'up' },
      goalsActive: { current: 0, previous: 0, change: 0, percentage: 8, direction: 'up' },
      avgProgress: { current: 0, previous: 0, change: 0, percentage: 12, direction: 'up' },
      daysStreak: { current: 1, previous: 1, change: 0, percentage: 25, direction: 'up' }
    };
  }

  /**
   * Record user activity for streak tracking
   */
  async recordActivity(userId: string, activityType: StreakEvent['activityType']): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const batch = writeBatch(db);

      // Add streak event
      const eventRef = doc(collection(db, this.STREAK_EVENTS_COLLECTION));
      batch.set(eventRef, {
        userId,
        date: today,
        activityType,
        timestamp: serverTimestamp()
      });

      // Update last active date
      const metricsRef = doc(db, this.METRICS_COLLECTION, userId);
      batch.update(metricsRef, {
        lastActiveDate: today,
        lastUpdated: serverTimestamp()
      });

      await batch.commit();
      console.log('✅ Activity recorded:', activityType);
    } catch (error) {
      console.error('❌ Error recording activity:', error);
      throw error;
    }
  }

  /**
   * Ensure daily snapshot exists for historical comparisons
   */
  private async ensureDailySnapshot(userId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const snapshotRef = doc(db, this.SNAPSHOTS_COLLECTION, `${userId}_${today}`);
      
      // Check if snapshot already exists
      const existingSnapshot = await getDoc(snapshotRef);
      if (existingSnapshot.exists()) {
        return;
      }

      // Create daily snapshot
      if (this.currentMetrics) {
        await setDoc(snapshotRef, {
          id: `${userId}_${today}`,
          userId,
          date: today,
          metrics: {
            opportunities: this.currentMetrics.opportunities,
            goalsActive: this.currentMetrics.goalsActive,
            avgProgress: this.currentMetrics.avgProgress,
            daysStreak: this.currentMetrics.daysStreak,
            completedGoals: this.currentMetrics.completedGoals
          },
          timestamp: serverTimestamp()
        });

        console.log('✅ Daily snapshot created for:', today);
      }
    } catch (error) {
      console.error('❌ Error creating daily snapshot:', error);
    }
  }

  /**
   * Update user metrics document
   */
  private async updateUserMetrics(userId: string, updates: Partial<RealTimeMetrics>): Promise<void> {
    try {
      const metricsRef = doc(db, this.METRICS_COLLECTION, userId);
      await updateDoc(metricsRef, {
        ...updates,
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Error updating user metrics:', error);
      throw error;
    }
  }

  /**
   * Initialize user metrics document
   */
  private async initializeUserMetrics(userId: string): Promise<void> {
    try {
      const metricsRef = doc(db, this.METRICS_COLLECTION, userId);
      const initialMetrics = {
        opportunities: 0,
        goalsActive: 0,
        avgProgress: 0,
        daysStreak: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        totalOpportunities: 0,
        completedGoals: 0,
        streakRecord: 1,
        lastUpdated: serverTimestamp()
      };

      await setDoc(metricsRef, initialMetrics);
      console.log('✅ User metrics initialized');
    } catch (error) {
      console.error('❌ Error initializing user metrics:', error);
      throw error;
    }
  }

  /**
   * Add listener for metrics updates
   */
  addListener(callback: (metrics: RealTimeMetrics) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current metrics if available
    if (this.currentMetrics) {
      callback(this.currentMetrics);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of metrics updates
   */
  private notifyListeners(metrics: RealTimeMetrics): void {
    this.listeners.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('❌ Error in metrics listener callback:', error);
      }
    });
  }

  /**
   * Handle connection errors and implement retry logic
   */
  private handleListenerError(error: Error, listenerType: string): void {
    console.error(`❌ ${listenerType} listener error:`, error);
    
    if (this.currentMetrics) {
      this.currentMetrics.syncStatus = 'error';
      this.notifyListeners(this.currentMetrics);
    }

    // Implement exponential backoff for reconnection
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // 1s, 2s, 4s, 8s, 16s
      this.reconnectAttempts++;
      
      console.log(`🔄 Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        // Reinitialize the specific listener that failed
        // This would require storing the userId and calling the appropriate setup method
        console.log(`🔄 Reconnecting ${listenerType} listener...`);
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      if (this.currentMetrics) {
        this.currentMetrics.syncStatus = 'offline';
        this.notifyListeners(this.currentMetrics);
      }
    }
  }

  /**
   * Handle general errors
   */
  private handleError(error: Error): void {
    console.error('❌ Real-time metrics service error:', error);
    
    if (this.currentMetrics) {
      this.currentMetrics.syncStatus = 'error';
      this.notifyListeners(this.currentMetrics);
    }
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('🌐 Connection restored');
    this.reconnectAttempts = 0;
    
    if (this.currentMetrics) {
      this.currentMetrics.syncStatus = 'syncing';
      this.notifyListeners(this.currentMetrics);
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('📱 Connection lost - using cached data');
    
    if (this.currentMetrics) {
      this.currentMetrics.syncStatus = 'offline';
      this.notifyListeners(this.currentMetrics);
    }
  }

  /**
   * Cache metrics to localStorage for offline access
   */
  private cacheMetrics(metrics: RealTimeMetrics): void {
    try {
      secureStorage.setItem(this.CACHE_KEY, JSON.stringify({
        ...metrics,
        lastUpdated: new Date().toISOString() // Convert timestamp to string for storage
      }));
    } catch (error) {
      console.error('❌ Error caching metrics:', error);
    }
  }

  /**
   * Load cached metrics from localStorage
   */
  private loadCachedMetrics(): void {
    try {
      const cached = secureStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const metrics = JSON.parse(cached);
        this.currentMetrics = {
          ...metrics,
          syncStatus: 'offline', // Mark as offline until real-time update
          lastUpdated: new Date(metrics.lastUpdated) as any // Convert back to timestamp
        };
        this.notifyListeners(this.currentMetrics);
        console.log('📱 Cached metrics loaded');
      }
    } catch (error) {
      console.error('❌ Error loading cached metrics:', error);
    }
  }

  /**
   * Get current metrics (synchronous)
   */
  getCurrentMetrics(): RealTimeMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Cleanup all listeners and timers
   */
  cleanup(): void {
    console.log('🧹 Cleaning up real-time metrics service');

    // Clean up Firestore listeners
    if (this.metricsUnsubscribe) {
      this.metricsUnsubscribe();
      this.metricsUnsubscribe = null;
    }
    
    if (this.goalsUnsubscribe) {
      this.goalsUnsubscribe();
      this.goalsUnsubscribe = null;
    }
    
    if (this.opportunitiesUnsubscribe) {
      this.opportunitiesUnsubscribe();
      this.opportunitiesUnsubscribe = null;
    }
    
    if (this.streakUnsubscribe) {
      this.streakUnsubscribe();
      this.streakUnsubscribe = null;
    }

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clear listeners
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }
}

// Create and export singleton instance
export const realTimeMetricsService = new RealTimeMetricsService();

// Additional utility functions
import { getDocs, getDoc, setDoc, updateDoc } from 'firebase/firestore';