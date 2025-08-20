/**
 * Goals System Test Utility
 * 
 * This utility helps verify that the goals system is working correctly
 * with real-time updates and proper persistence.
 */

import { goalsService } from '../services/goalsService';
import { CreateGoalData } from '../types/goals';

export const testGoalsSystem = async (userId: string) => {
  console.log('🧪 Testing Goals System for user:', userId);
  
  try {
    // Test 1: Create a test goal
    console.log('📝 Test 1: Creating a test goal...');
    const testGoalData: CreateGoalData = {
      title: 'Test Goal - System Verification',
      description: 'This is a test goal to verify the goals system is working correctly.',
      category: 'personal',
      type: 'short_term',
      priority: 'medium',
      difficulty: 'easy',
      tags: ['test', 'verification'],
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      milestones: [
        {
          id: 'milestone_1',
          title: 'Complete system setup',
          description: 'Set up all necessary components',
          completed: false,
          order: 0
        },
        {
          id: 'milestone_2', 
          title: 'Test real-time updates',
          description: 'Verify real-time functionality',
          completed: false,
          order: 1
        }
      ]
    };
    
    const goalId = await goalsService.createGoal(userId, testGoalData);
    console.log('✅ Test goal created with ID:', goalId);
    
    // Test 2: Fetch goals
    console.log('📥 Test 2: Fetching user goals...');
    const goals = await goalsService.getUserGoals(userId);
    console.log('✅ Retrieved', goals.length, 'goals');
    
    // Test 3: Update goal progress
    console.log('📊 Test 3: Updating goal progress...');
    const updateSuccess = await goalsService.updateGoalProgress(goalId, 50, userId);
    console.log('✅ Progress update success:', updateSuccess);
    
    // Test 4: Get goal statistics
    console.log('📈 Test 4: Getting goal statistics...');
    const stats = await goalsService.getGoalStats(userId);
    console.log('✅ Goal statistics:', stats);
    
    // Test 5: Clean up - delete test goal
    console.log('🧹 Test 5: Cleaning up test goal...');
    const deleteSuccess = await goalsService.deleteGoal(goalId, userId);
    console.log('✅ Test goal deleted:', deleteSuccess);
    
    console.log('🎉 All goals system tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Goals system test failed:', error);
    return false;
  }
};

export const verifyGoalsPersistence = async (userId: string) => {
  console.log('🔍 Verifying goals persistence for user:', userId);
  
  try {
    // Create a persistent test goal
    const persistentGoalData: CreateGoalData = {
      title: 'Persistent Goal - Login Test',
      description: 'This goal tests persistence across login sessions.',
      category: 'career',
      type: 'medium_term',
      priority: 'high',
      difficulty: 'medium',
      tags: ['persistence', 'login-test'],
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    };
    
    const goalId = await goalsService.createGoal(userId, persistentGoalData);
    console.log('✅ Persistent test goal created:', goalId);
    
    // Wait a moment for Firestore to sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the goal exists
    const goal = await goalsService.getGoalById(goalId, userId);
    if (goal) {
      console.log('✅ Goal persistence verified - goal exists after creation');
      console.log('📋 Goal details:', {
        id: goal.id,
        title: goal.title,
        category: goal.category,
        status: goal.status,
        progress: goal.progress
      });
      return { success: true, goalId, goal };
    } else {
      console.error('❌ Goal persistence failed - goal not found');
      return { success: false, goalId: null, goal: null };
    }
    
  } catch (error) {
    console.error('❌ Goals persistence verification failed:', error);
    return { success: false, goalId: null, goal: null };
  }
};

// Helper to run both tests
export const runCompleteGoalsTest = async (userId: string) => {
  console.log('🚀 Running complete goals system test...');
  
  const systemTest = await testGoalsSystem(userId);
  const persistenceTest = await verifyGoalsPersistence(userId);
  
  const allTestsPassed = systemTest && persistenceTest.success;
  
  console.log('📊 Test Results:');
  console.log('- System functionality:', systemTest ? '✅ PASSED' : '❌ FAILED');
  console.log('- Goals persistence:', persistenceTest.success ? '✅ PASSED' : '❌ FAILED');
  console.log('- Overall result:', allTestsPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED');
  
  return {
    systemTest,
    persistenceTest: persistenceTest.success,
    allTestsPassed,
    persistentGoalId: persistenceTest.goalId
  };
};