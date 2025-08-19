// Goal Creation Event System
// Provides a centralized way to notify components about goal-related events

export type GoalEventType = 
  | 'goal_created' 
  | 'goal_updated' 
  | 'goal_deleted' 
  | 'goal_progress_updated'
  | 'task_completed';

export interface GoalEvent {
  type: GoalEventType;
  goalId: string;
  goalData?: any;
  timestamp: Date;
  userId?: string;
}

type GoalEventListener = (event: GoalEvent) => void;

class GoalEventManager {
  private listeners: Map<GoalEventType, Set<GoalEventListener>> = new Map();
  private allListeners: Set<GoalEventListener> = new Set();

  // Subscribe to specific goal event types
  subscribe(eventType: GoalEventType, callback: GoalEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  // Subscribe to all goal events
  subscribeToAll(callback: GoalEventListener): () => void {
    this.allListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.allListeners.delete(callback);
    };
  }

  // Emit a goal event
  emit(event: GoalEvent): void {
    console.log('📢 Goal event emitted:', event.type, event.goalId);
    
    // Notify specific event type listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in goal event listener:', error);
        }
      });
    }

    // Notify all-event listeners
    this.allListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in goal event listener:', error);
      }
    });
  }

  // Helper methods for common events
  emitGoalCreated(goalId: string, goalData: any, userId?: string): void {
    this.emit({
      type: 'goal_created',
      goalId,
      goalData,
      timestamp: new Date(),
      userId
    });
  }

  emitGoalUpdated(goalId: string, goalData: any, userId?: string): void {
    this.emit({
      type: 'goal_updated',
      goalId,
      goalData,
      timestamp: new Date(),
      userId
    });
  }

  emitGoalDeleted(goalId: string, userId?: string): void {
    this.emit({
      type: 'goal_deleted',
      goalId,
      timestamp: new Date(),
      userId
    });
  }

  emitGoalProgressUpdated(goalId: string, progress: number, userId?: string): void {
    this.emit({
      type: 'goal_progress_updated',
      goalId,
      goalData: { progress },
      timestamp: new Date(),
      userId
    });
  }

  emitTaskCompleted(goalId: string, taskId: string, completed: boolean, userId?: string): void {
    this.emit({
      type: 'task_completed',
      goalId,
      goalData: { taskId, completed },
      timestamp: new Date(),
      userId
    });
  }

  // Clear all listeners (for cleanup)
  clearAll(): void {
    this.listeners.clear();
    this.allListeners.clear();
  }
}

// Export singleton instance
export const goalEvents = new GoalEventManager();

// React hook for using goal events
import { useEffect, useCallback } from 'react';

export interface UseGoalEventsOptions {
  eventTypes?: GoalEventType[];
  userId?: string;
}

export const useGoalEvents = (
  callback: (event: GoalEvent) => void,
  options: UseGoalEventsOptions = {}
) => {
  const { eventTypes, userId } = options;

  const wrappedCallback = useCallback((event: GoalEvent) => {
    // Filter by user if specified
    if (userId && event.userId && event.userId !== userId) {
      return;
    }
    
    callback(event);
  }, [callback, userId]);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (eventTypes && eventTypes.length > 0) {
      // Subscribe to specific event types
      eventTypes.forEach(eventType => {
        const unsubscribe = goalEvents.subscribe(eventType, wrappedCallback);
        unsubscribers.push(unsubscribe);
      });
    } else {
      // Subscribe to all events
      const unsubscribe = goalEvents.subscribeToAll(wrappedCallback);
      unsubscribers.push(unsubscribe);
    }

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [wrappedCallback, eventTypes]);
};

// Utility function to emit goal creation event from anywhere in the app
export const notifyGoalCreated = (goalId: string, goalData: any, userId?: string) => {
  goalEvents.emitGoalCreated(goalId, goalData, userId);
};

export const notifyGoalUpdated = (goalId: string, goalData: any, userId?: string) => {
  goalEvents.emitGoalUpdated(goalId, goalData, userId);
};

export const notifyGoalDeleted = (goalId: string, userId?: string) => {
  goalEvents.emitGoalDeleted(goalId, userId);
};