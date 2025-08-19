import React, { useState, useEffect } from 'react';
import { Activity, Check, X, RefreshCw, Database, Wifi, Users, Target, Flame, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRealTimeMetrics } from '../hooks/useRealTimeMetrics';
import { useGoals } from '../hooks/useGoals';
import { useDarkMode } from '../hooks/useDarkMode';
import Button from './ui/Button';
import Card from './ui/Card';

interface DiagnosticTest {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  data?: any;
}

const DashboardDiagnostics: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();
  const { 
    metrics, 
    isLoading, 
    error, 
    syncStatus, 
    isConnected, 
    refreshMetrics,
    recordActivity 
  } = useRealTimeMetrics({ autoInitialize: true });
  const { goals, loading: goalsLoading, createGoal } = useGoals();

  const [tests, setTests] = useState<DiagnosticTest[]>([
    { name: 'User Authentication', status: 'pending' },
    { name: 'Real-time Metrics Service', status: 'pending' },
    { name: 'Firebase Connection', status: 'pending' },
    { name: 'Goals Data Sync', status: 'pending' },
    { name: 'Metrics Calculation', status: 'pending' },
    { name: 'Activity Recording', status: 'pending' },
    { name: 'Live Data Updates', status: 'pending' }
  ]);

  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any>({});

  const updateTest = (name: string, status: DiagnosticTest['status'], message?: string, data?: any) => {
    setTests(prev => prev.map(test => 
      test.name === name 
        ? { ...test, status, message, data }
        : test
    ));
    
    if (data) {
      setTestResults(prev => ({ ...prev, [name]: data }));
    }
  };

  const runDiagnostics = async () => {
    setIsRunningTests(true);
    
    try {
      // Test 1: User Authentication
      updateTest('User Authentication', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (user?.uid) {
        updateTest('User Authentication', 'passed', `User ID: ${user.uid.slice(0, 8)}...`);
      } else {
        updateTest('User Authentication', 'failed', 'No authenticated user found');
        setIsRunningTests(false);
        return;
      }

      // Test 2: Real-time Metrics Service
      updateTest('Real-time Metrics Service', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (metrics) {
        updateTest('Real-time Metrics Service', 'passed', 
          `Status: ${syncStatus}, Connected: ${isConnected}`,
          {
            opportunities: metrics.opportunities,
            goalsActive: metrics.goalsActive,
            avgProgress: metrics.avgProgress,
            daysStreak: metrics.daysStreak
          }
        );
      } else if (isLoading) {
        updateTest('Real-time Metrics Service', 'running', 'Loading metrics...');
        // Wait a bit more for metrics to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (metrics) {
          updateTest('Real-time Metrics Service', 'passed', 'Metrics loaded successfully');
        } else {
          updateTest('Real-time Metrics Service', 'failed', error || 'Metrics failed to load');
        }
      } else {
        updateTest('Real-time Metrics Service', 'failed', error || 'No metrics available');
      }

      // Test 3: Firebase Connection
      updateTest('Firebase Connection', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (isConnected && syncStatus === 'synced') {
        updateTest('Firebase Connection', 'passed', 'Connected and synced');
      } else if (syncStatus === 'syncing') {
        updateTest('Firebase Connection', 'running', 'Syncing...');
      } else {
        updateTest('Firebase Connection', 'failed', `Status: ${syncStatus}`);
      }

      // Test 4: Goals Data Sync
      updateTest('Goals Data Sync', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!goalsLoading) {
        updateTest('Goals Data Sync', 'passed', 
          `${goals.length} goals found`,
          { goalCount: goals.length, activeGoals: goals.filter(g => g.status === 'active').length }
        );
      } else {
        updateTest('Goals Data Sync', 'running', 'Loading goals...');
      }

      // Test 5: Metrics Calculation
      updateTest('Metrics Calculation', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (metrics) {
        const activeGoalsCount = goals.filter(g => g.status === 'active').length;
        const avgProgress = activeGoalsCount > 0 
          ? Math.round(goals.filter(g => g.status === 'active').reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoalsCount)
          : 0;
        
        const metricsMatch = metrics.goalsActive === activeGoalsCount;
        
        updateTest('Metrics Calculation', metricsMatch ? 'passed' : 'failed',
          metricsMatch 
            ? 'Metrics calculation is accurate'
            : `Mismatch: Expected ${activeGoalsCount} active goals, got ${metrics.goalsActive}`,
          {
            expected: { activeGoals: activeGoalsCount, avgProgress },
            actual: { activeGoals: metrics.goalsActive, avgProgress: metrics.avgProgress }
          }
        );
      } else {
        updateTest('Metrics Calculation', 'failed', 'No metrics to verify');
      }

      // Test 6: Activity Recording
      updateTest('Activity Recording', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        await recordActivity('login');
        updateTest('Activity Recording', 'passed', 'Activity recorded successfully');
      } catch (err) {
        updateTest('Activity Recording', 'failed', `Recording failed: ${err}`);
      }

      // Test 7: Live Data Updates
      updateTest('Live Data Updates', 'running');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // Try to refresh metrics and see if they update
        const beforeRefresh = metrics?.lastUpdated;
        await refreshMetrics();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const afterRefresh = metrics?.lastUpdated;
        const updated = beforeRefresh !== afterRefresh;
        
        updateTest('Live Data Updates', updated ? 'passed' : 'failed',
          updated ? 'Metrics updated successfully' : 'No update detected'
        );
      } catch (err) {
        updateTest('Live Data Updates', 'failed', `Update failed: ${err}`);
      }

    } catch (error) {
      console.error('Diagnostics error:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const createTestGoal = async () => {
    try {
      await createGoal({
        title: 'Test Goal - Dashboard Sync',
        description: 'This is a test goal to verify real-time dashboard synchronization',
        category: 'Testing',
        priority: 'medium',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        progress: 25
      });
      
      // Record activity
      await recordActivity('goal_created');
      
      // Refresh diagnostics
      setTimeout(() => runDiagnostics(), 1000);
    } catch (error) {
      console.error('Failed to create test goal:', error);
    }
  };

  const getStatusIcon = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'passed': return <Check size={16} className="text-green-500" />;
      case 'failed': return <X size={16} className="text-red-500" />;
      case 'running': return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'passed': return 'text-green-600 dark:text-green-400';
      case 'failed': return 'text-red-600 dark:text-red-400';
      case 'running': return 'text-blue-600 dark:text-blue-400';
      default: return isDarkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  // Auto-run diagnostics on mount
  useEffect(() => {
    const timer = setTimeout(() => runDiagnostics(), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="sticky top-0 bg-inherit border-b border-gray-200 dark:border-gray-700 p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity size={24} className="text-primary" />
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Dashboard Real-time Sync Diagnostics
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Testing dashboard synchronization with live data
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Current Status Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-blue-500" />
                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Opportunities</span>
              </div>
              <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {metrics?.opportunities ?? '—'}
              </div>
            </div>

            <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className="text-green-500" />
                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Active Goals</span>
              </div>
              <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {metrics?.goalsActive ?? '—'}
              </div>
            </div>

            <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Activity size={16} className="text-yellow-500" />
                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Avg Progress</span>
              </div>
              <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {metrics?.avgProgress ?? '—'}%
              </div>
            </div>

            <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Flame size={16} className="text-red-500" />
                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Streak</span>
              </div>
              <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {metrics?.daysStreak ?? '—'}
              </div>
            </div>
          </div>

          {/* Diagnostic Tests */}
          <div className="space-y-3 mb-6">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
              Diagnostic Tests
            </h3>
            
            {tests.map((test) => (
              <div 
                key={test.name}
                className={`flex items-center justify-between p-4 rounded-xl border ${isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {test.name}
                    </div>
                    {test.message && (
                      <div className={`text-sm ${getStatusColor(test.status)}`}>
                        {test.message}
                      </div>
                    )}
                  </div>
                </div>
                
                {test.data && (
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {JSON.stringify(test.data, null, 0).slice(0, 100)}...
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={runDiagnostics} 
              disabled={isRunningTests}
              icon={<RefreshCw size={16} className={isRunningTests ? 'animate-spin' : ''} />}
            >
              {isRunningTests ? 'Running Tests...' : 'Run Diagnostics'}
            </Button>
            
            <Button 
              variant="secondary"
              onClick={createTestGoal}
              icon={<Target size={16} />}
            >
              Create Test Goal
            </Button>
            
            <Button 
              variant="secondary"
              onClick={refreshMetrics}
              icon={<Database size={16} />}
            >
              Force Refresh
            </Button>
          </div>

          {/* System Status */}
          <div className={`mt-6 p-4 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h4 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>System Status</h4>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Wifi size={14} className={isConnected ? 'text-green-500' : 'text-red-500'} />
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                  Connection: {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Database size={14} className="text-blue-500" />
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                  Sync Status: {syncStatus}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Users size={14} className="text-purple-500" />
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                  User: {user?.email || 'Not authenticated'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-green-500" />
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                  Last Updated: {metrics?.lastUpdated ? 'Just now' : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardDiagnostics;