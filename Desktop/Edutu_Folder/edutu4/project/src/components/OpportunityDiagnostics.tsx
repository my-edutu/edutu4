import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertCircle, RefreshCw, Database, Globe, Users } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { initializeSampleData, checkOpportunitiesConnection } from '../services/sampleDataService';
import { useTopOpportunities } from '../hooks/useOpportunities';
import { getTopOpportunities } from '../services/apiService';

interface OpportunityDiagnosticsProps {
  onBack: () => void;
}

const OpportunityDiagnostics: React.FC<OpportunityDiagnosticsProps> = ({ onBack }) => {
  const { isDarkMode } = useDarkMode();
  const [diagnostics, setDiagnostics] = useState({
    firestoreConnection: { status: 'checking', message: 'Checking...' },
    dataAvailability: { status: 'checking', message: 'Checking...' },
    apiService: { status: 'checking', message: 'Checking...' },
    hookFunction: { status: 'checking', message: 'Checking...' }
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationResult, setInitializationResult] = useState<string | null>(null);

  // Test the hook directly
  const { opportunities: hookOpportunities, loading: hookLoading, error: hookError, refresh: refreshOpportunities } = useTopOpportunities(3);

  const runDiagnostics = async () => {
    setDiagnostics(prev => ({
      ...prev,
      firestoreConnection: { status: 'checking', message: 'Testing Firestore connection...' },
      dataAvailability: { status: 'checking', message: 'Checking data availability...' },
      apiService: { status: 'checking', message: 'Testing API service...' },
      hookFunction: { status: 'checking', message: 'Testing hook function...' }
    }));

    try {
      // Test 1: Firestore Connection
      console.log('🔄 Testing Firestore connection...');
      const connectionResult = await checkOpportunitiesConnection();
      
      setDiagnostics(prev => ({
        ...prev,
        firestoreConnection: {
          status: connectionResult.connected ? 'success' : 'error',
          message: connectionResult.connected 
            ? `Connected successfully (${connectionResult.count} documents found)`
            : `Connection failed: ${connectionResult.error}`
        }
      }));

      // Test 2: Data Availability
      console.log('🔄 Testing data availability...');
      setDiagnostics(prev => ({
        ...prev,
        dataAvailability: {
          status: connectionResult.count > 0 ? 'success' : 'warning',
          message: connectionResult.count > 0 
            ? `${connectionResult.count} opportunities available in database`
            : 'No opportunities found in database - sample data may be needed'
        }
      }));

      // Test 3: API Service
      console.log('🔄 Testing API service...');
      try {
        const apiOpportunities = await getTopOpportunities(3);
        setDiagnostics(prev => ({
          ...prev,
          apiService: {
            status: apiOpportunities.length > 0 ? 'success' : 'warning',
            message: `API service returned ${apiOpportunities.length} opportunities`
          }
        }));
      } catch (apiError) {
        setDiagnostics(prev => ({
          ...prev,
          apiService: {
            status: 'error',
            message: `API service error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`
          }
        }));
      }

      // Test 4: Hook Function (will be updated by the hook itself)
      setDiagnostics(prev => ({
        ...prev,
        hookFunction: {
          status: 'checking',
          message: 'Waiting for hook to complete...'
        }
      }));

    } catch (error) {
      console.error('❌ Diagnostics error:', error);
    }
  };

  // Update hook diagnostics when hook data changes
  useEffect(() => {
    if (!hookLoading) {
      setDiagnostics(prev => ({
        ...prev,
        hookFunction: {
          status: hookError ? 'error' : hookOpportunities.length > 0 ? 'success' : 'warning',
          message: hookError 
            ? `Hook error: ${hookError}`
            : `Hook returned ${hookOpportunities.length} opportunities`
        }
      }));
    }
  }, [hookLoading, hookError, hookOpportunities]);

  const initializeSampleDataHandler = async () => {
    setIsInitializing(true);
    setInitializationResult(null);
    
    try {
      const success = await initializeSampleData();
      if (success) {
        setInitializationResult('✅ Sample data initialized successfully! Please refresh diagnostics.');
      } else {
        setInitializationResult('❌ Failed to initialize sample data. Check console for details.');
      }
    } catch (error) {
      setInitializationResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'warning':
        return <AlertCircle size={20} className="text-yellow-500" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />;
      default:
        return <RefreshCw size={20} className="text-gray-400 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className={`min-h-screen bg-white dark:bg-gray-900 animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={onBack}
              size="md"
              icon={ArrowLeft}
            />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Opportunity System Diagnostics</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Check and fix opportunity data loading issues
              </p>
            </div>
            <Button
              onClick={runDiagnostics}
              variant="outline"
              size="sm"
              icon={RefreshCw}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Diagnostics Results */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">System Status</h2>
          <div className="space-y-4">
            {Object.entries(diagnostics).map(([key, result]) => (
              <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800 dark:text-white capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </h3>
                  <p className={`text-sm ${getStatusColor(result.status)}`}>
                    {result.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sample Data Initialization */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Sample Data</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            If no opportunities are found, you can initialize the database with sample data for testing.
          </p>
          
          <div className="space-y-4">
            <Button
              onClick={initializeSampleDataHandler}
              loading={isInitializing}
              disabled={isInitializing}
              variant="primary"
              icon={Database}
            >
              {isInitializing ? 'Initializing...' : 'Initialize Sample Data'}
            </Button>
            
            {initializationResult && (
              <div className={`p-3 rounded-lg ${
                initializationResult.includes('✅') 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {initializationResult}
              </div>
            )}
          </div>
        </Card>

        {/* Live Hook Data */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Live Hook Data</h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`text-sm ${
                hookLoading ? 'text-yellow-600' : 
                hookError ? 'text-red-600' : 
                'text-green-600'
              }`}>
                {hookLoading ? 'Loading...' : hookError ? `Error: ${hookError}` : 'Success'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Opportunities Count:</span>
              <span className="text-sm text-gray-800 dark:text-white">{hookOpportunities.length}</span>
            </div>
            
            {hookOpportunities.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Sample Opportunities:</h3>
                <div className="space-y-2">
                  {hookOpportunities.slice(0, 3).map((opp, index) => (
                    <div key={opp.id} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                      <div className="font-medium text-gray-800 dark:text-white">{opp.title}</div>
                      <div className="text-gray-600 dark:text-gray-400">{opp.provider}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={refreshOpportunities}
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={hookLoading}
            >
              Refresh Data
            </Button>
            <Button
              onClick={() => console.clear()}
              variant="outline"
              size="sm"
            >
              Clear Console
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OpportunityDiagnostics;