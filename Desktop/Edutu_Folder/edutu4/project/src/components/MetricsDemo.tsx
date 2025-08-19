import React, { useState } from 'react';
import { RefreshCw, Plus, Target, TrendingUp } from 'lucide-react';
import MetricsOverview from './MetricsOverview';
import Button from './ui/Button';
import { useMetrics } from '../hooks/useMetrics';
import { useDarkMode } from '../hooks/useDarkMode';

const MetricsDemo: React.FC = () => {
  const { isDarkMode } = useDarkMode();
  const { 
    metrics, 
    addGoal, 
    addOpportunity, 
    updateGoalProgress,
    refreshMetrics,
    goals,
    opportunities 
  } = useMetrics();

  const [isAdding, setIsAdding] = useState(false);

  const handleAddSampleGoal = async () => {
    setIsAdding(true);
    try {
      await addGoal({
        title: `New Goal ${Date.now()}`,
        progress: Math.floor(Math.random() * 100),
        isActive: true,
        category: 'demo'
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddSampleOpportunity = async () => {
    setIsAdding(true);
    try {
      await addOpportunity({
        title: `Sample Opportunity ${Date.now()}`,
        organization: 'Demo Corp',
        category: 'Technology',
        match: Math.floor(Math.random() * 100),
        isActive: true,
        deadline: '2024-12-31'
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateRandomGoal = async () => {
    const activeGoals = goals.filter(g => g.isActive);
    if (activeGoals.length > 0) {
      const randomGoal = activeGoals[Math.floor(Math.random() * activeGoals.length)];
      const newProgress = Math.min(randomGoal.progress + Math.floor(Math.random() * 20), 100);
      await updateGoalProgress(randomGoal.id, newProgress);
    }
  };

  return (
    <div className={`min-h-screen p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className={`mb-8 p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h1 className={`text-3xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            🚀 Edutu Dynamic Metrics System
          </h1>
          <p className={`text-lg mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Experience fully dynamic, real-time updating metrics with beautiful animations and responsive design.
          </p>
          
          {/* Demo Controls */}
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleAddSampleGoal}
              disabled={isAdding}
              className="inline-flex items-center gap-2"
            >
              <Target size={16} />
              Add Sample Goal
            </Button>
            
            <Button
              onClick={handleAddSampleOpportunity}
              disabled={isAdding}
              variant="secondary"
              className="inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Add Sample Opportunity
            </Button>
            
            <Button
              onClick={handleUpdateRandomGoal}
              disabled={isAdding || goals.filter(g => g.isActive).length === 0}
              variant="secondary"
              className="inline-flex items-center gap-2"
            >
              <TrendingUp size={16} />
              Update Random Goal
            </Button>
            
            <Button
              onClick={refreshMetrics}
              disabled={isAdding}
              variant="secondary"
              className="inline-flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh Metrics
            </Button>
          </div>
        </div>

        {/* Metrics Overview */}
        <MetricsOverview
          onOpportunitiesClick={() => {}}
          onGoalsClick={() => {}}
          onProgressClick={() => {}}
          onStreakClick={() => {}}
        />

        {/* Feature Highlights */}
        <div className={`mt-8 p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            ✨ Key Features Demonstrated
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                🔄 Real-time Updates
              </h3>
              <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li>• Metrics auto-refresh every 30 seconds</li>
                <li>• Instant updates when data changes</li>
                <li>• Smooth animated transitions</li>
                <li>• Loading states and error handling</li>
              </ul>
            </div>
            
            <div>
              <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                🎨 Beautiful Design
              </h3>
              <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li>• Color-coded metrics (blue, green, yellow, purple)</li>
                <li>• Subtle animations and hover effects</li>
                <li>• Dark/light mode support</li>
                <li>• Mobile-responsive layout</li>
              </ul>
            </div>
            
            <div>
              <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                📊 Smart Data Management
              </h3>
              <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li>• Persistent storage with security</li>
                <li>• Automatic streak calculation</li>
                <li>• Dynamic progress averaging</li>
                <li>• Mock data with realistic patterns</li>
              </ul>
            </div>
            
            <div>
              <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                🔌 Future-Ready Architecture
              </h3>
              <ul className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li>• Easy API integration hooks</li>
                <li>• Analytics-ready data structure</li>
                <li>• Scalable component architecture</li>
                <li>• TypeScript for type safety</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Current Data Display */}
        {metrics && (
          <div className={`mt-8 p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              📈 Current Data State
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Live Metrics
                </h3>
                <div className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <div>Opportunities: {metrics.opportunities}</div>
                  <div>Goals Active: {metrics.goalsActive}</div>
                  <div>Avg Progress: {metrics.avgProgress}%</div>
                  <div>Days Streak: {metrics.daysStreak}</div>
                  <div>Streak Record: {metrics.streakRecord}</div>
                  <div>Total Goals: {goals.length}</div>
                  <div>Total Opportunities: {opportunities.length}</div>
                </div>
              </div>
              
              <div>
                <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Data Flow
                </h3>
                <div className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <div>✅ Secure local storage</div>
                  <div>✅ Automatic data validation</div>
                  <div>✅ Real-time calculations</div>
                  <div>✅ Error boundary protection</div>
                  <div>✅ Activity tracking</div>
                  <div>✅ Streak management</div>
                  <div>✅ Progress aggregation</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsDemo;