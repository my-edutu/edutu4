import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  QuerySnapshot, 
  DocumentData, 
  where,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Opportunity, UserActivity, Goal } from '../types/common';

/**
 * Real-time service for monitoring Firestore collections
 */
class RealTimeService {
  private listeners: Map<string, () => void> = new Map();
  private lastUpdateTimestamp: Map<string, Timestamp> = new Map();

  /**
   * Subscribe to real-time opportunity updates
   */
  subscribeToOpportunityUpdates(
    callback: (opportunities: Opportunity[], hasNewData: boolean) => void,
    limitCount: number = 20,
    filters: {
      category?: string;
      location?: string;
    } = {}
  ): () => void {
    const listenerId = `opportunities_${JSON.stringify(filters)}_${limitCount}`;
    
    // Clean up existing listener if any
    this.unsubscribe(listenerId);

    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ];

    // Add filters
    if (filters.category) {
      constraints.unshift(where('category', '==', filters.category));
    }
    if (filters.location && filters.location !== 'Various') {
      constraints.unshift(where('location', '==', filters.location));
    }

    const q = query(collection(db, 'scholarships'), ...constraints);
    
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const opportunities = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || 'Untitled Opportunity',
          organization: data.provider || 'Unknown',
          category: data.category || 'General',
          deadline: data.deadline || 'Not specified',
          location: data.location || 'Various',
          description: data.summary || '',
          requirements: data.requirements ? data.requirements.split('\n').filter(r => r.trim()) : [],
          benefits: data.benefits ? data.benefits.split('\n').filter(b => b.trim()) : [],
          applicationProcess: data.applicationProcess ? data.applicationProcess.split('\n').filter(a => a.trim()) : [],
          image: data.imageUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=300&fit=crop&q=80&auto=format',
          imageUrl: data.imageUrl,
          match: Math.floor(Math.random() * 40) + 60, // Random match for now
          difficulty: 'Medium' as const,
          applicants: 'N/A',
          successRate: data.successRate || 'Not available',
          link: data.link,
          provider: data.provider,
          tags: data.tags || [],
          eligibility: data.eligibility,
          createdAt: data.createdAt
        };
      });

      // Check if there's new data
      const hasNewData = this.checkForNewData(listenerId, snapshot);
      
      callback(opportunities, hasNewData);
    }, (error) => {
      console.error(`Real-time subscription error for ${listenerId}:`, error);
      callback([], false);
    });

    this.listeners.set(listenerId, unsubscribe);
    
    // Return unsubscribe function
    return () => this.unsubscribe(listenerId);
  }

  /**
   * Subscribe to real-time user activity updates
   */
  subscribeToUserActivity(
    userId: string,
    callback: (activities: UserActivity[]) => void
  ): () => void {
    const listenerId = `user_activity_${userId}`;
    
    this.unsubscribe(listenerId);

    const q = query(
      collection(db, 'userActivities'), 
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(activities);
    }, (error) => {
      console.error(`User activity subscription error:`, error);
      callback([]);
    });

    this.listeners.set(listenerId, unsubscribe);
    
    return () => this.unsubscribe(listenerId);
  }

  /**
   * Subscribe to real-time goal updates
   */
  subscribeToGoals(
    userId: string,
    callback: (goals: Goal[]) => void,
    filters: { status?: string[] } = {}
  ): () => void {
    const listenerId = `goals_${userId}_${JSON.stringify(filters)}`;
    
    this.unsubscribe(listenerId);

    let q = query(
      collection(db, 'goals'), 
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    if (filters.status && filters.status.length > 0) {
      q = query(
        collection(db, 'goals'),
        where('userId', '==', userId),
        where('status', 'in', filters.status),
        orderBy('updatedAt', 'desc')
      );
    }
    
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const goals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(goals);
    }, (error) => {
      console.error(`Goals subscription error:`, error);
      callback([]);
    });

    this.listeners.set(listenerId, unsubscribe);
    
    return () => this.unsubscribe(listenerId);
  }

  /**
   * Check if snapshot contains new data
   */
  private checkForNewData(listenerId: string, snapshot: QuerySnapshot<DocumentData>): boolean {
    if (snapshot.empty) return false;

    const mostRecentDoc = snapshot.docs[0];
    const mostRecentTimestamp = mostRecentDoc.data().createdAt as Timestamp;
    const lastKnownTimestamp = this.lastUpdateTimestamp.get(listenerId);

    if (!lastKnownTimestamp) {
      // First time, so consider it as no new data
      this.lastUpdateTimestamp.set(listenerId, mostRecentTimestamp);
      return false;
    }

    const hasNewData = mostRecentTimestamp.toMillis() > lastKnownTimestamp.toMillis();
    if (hasNewData) {
      this.lastUpdateTimestamp.set(listenerId, mostRecentTimestamp);
    }

    return hasNewData;
  }

  /**
   * Unsubscribe from a specific listener
   */
  private unsubscribe(listenerId: string): void {
    const unsubscribe = this.listeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(listenerId);
    }
  }

  /**
   * Unsubscribe from all listeners
   */
  unsubscribeAll(): void {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
    this.lastUpdateTimestamp.clear();
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.listeners.size > 0;
  }

  /**
   * Get active subscription count
   */
  getActiveSubscriptions(): number {
    return this.listeners.size;
  }
}

// Export singleton instance
export const realTimeService = new RealTimeService();
export default realTimeService;