import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Users,
  Flag,
  TrendingUp,
  Activity,
  Shield,
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  MessageCircle,
  UserCheck,
  UserX,
  Calendar,
  Target,
  Award,
  Database,
  Server
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { adminService } from '../services/adminService';
import { AdminStats, ModerationItem, SystemHealth, AdminUser } from '../types/common';
import { UserGoal } from '../types/goals';

interface AdminDashboardProps {
  onBack: () => void;
  user: { name: string; age: number; uid: string } | null;
}

type AdminTab = 'overview' | 'moderation' | 'users' | 'analytics' | 'settings';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, user }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([]);
  const [selectedModeration, setSelectedModeration] = useState<ModerationItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    const initializeAdmin = async () => {
      if (!user?.uid) return;

      try {
        setIsLoading(true);
        
        // Check admin access
        const hasAccess = await adminService.checkAdminAccess(user.uid);
        if (!hasAccess) {
          throw new Error('Access denied');
        }
        
        setIsAdmin(true);

        // Load initial data
        const [stats, health] = await Promise.all([
          adminService.getAdminStats(user.uid),
          adminService.getSystemHealth(user.uid)
        ]);

        setAdminStats(stats);
        setSystemHealth(health);

        // Load moderation queue
        const moderationData = await adminService.getModerationQueue(user.uid, 1, 20);
        setModerationQueue(moderationData.items);

      } catch (error) {
        console.error('Error initializing admin dashboard:', error);
        // Handle unauthorized access
        if (error instanceof Error && error.message === 'Access denied') {
          alert('You do not have admin access.');
          onBack();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAdmin();
  }, [user?.uid, onBack]);

  // Real-time updates
  useEffect(() => {
    if (!user?.uid || !isAdmin) return;

    const unsubscribeModeration = adminService.subscribeToModerationQueue(
      user.uid,
      setModerationQueue
    );

    const unsubscribeStats = adminService.subscribeToSystemStats(
      user.uid,
      setAdminStats
    );

    return () => {
      unsubscribeModeration();
      unsubscribeStats();
    };
  }, [user?.uid, isAdmin]);

  const filteredModerationQueue = useMemo(() => {
    return moderationQueue.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [moderationQueue, searchTerm, statusFilter]);

  const handleModerate = async (moderationId: string, decision: 'approved' | 'rejected', reason?: string) => {
    if (!user?.uid) return;

    try {
      const success = await adminService.moderateItem(moderationId, user.uid, decision, reason);
      if (success) {
        // Update local state
        setModerationQueue(prev => 
          prev.map(item => 
            item.id === moderationId 
              ? { ...item, status: decision, moderatedBy: user.uid, moderatedAt: new Date() }
              : item
          )
        );
        setSelectedModeration(null);
      }
    } catch (error) {
      console.error('Error moderating item:', error);
      alert('Failed to moderate item');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'flagged': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {adminStats?.totalUsers.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                +{adminStats?.userGrowthRate || 0}% this month
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Moderations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {adminStats?.pendingModerations || '0'}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Requires attention
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center">
              <Flag size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Goals</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {adminStats?.totalGoals.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {adminStats?.goalCompletionRate.toFixed(1) || 0}% completion rate
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
              <Target size={24} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Daily Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {adminStats?.dailyActiveUsers.toLocaleString() || '0'}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {adminStats?.monthlyActiveUsers.toLocaleString() || '0'} monthly
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
              <Activity size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* System Health */}
      {systemHealth && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              systemHealth.status === 'healthy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
              systemHealth.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
              'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Server size={20} className="text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Response Time</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{systemHealth.responseTime}ms</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Database size={20} className="text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Database</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{systemHealth.databaseStatus}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Activity size={20} className="text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Error Rate</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{(systemHealth.errorRate * 100).toFixed(2)}%</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users size={20} className="text-gray-600 dark:text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Connections</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{systemHealth.activeConnections}</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {systemHealth.lastUpdated.toLocaleString()}
            </p>
          </div>
        </Card>
      )}

      {/* Recent Moderation Items */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Moderation Queue</h3>
          <Button
            variant="secondary"
            onClick={() => setActiveTab('moderation')}
            className="text-sm"
          >
            View All
          </Button>
        </div>
        
        <div className="space-y-3">
          {moderationQueue.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                  {item.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.type} • {item.submittedAt.toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
                <span className={`text-sm font-medium ${getPriorityColor(item.priority)}`}>
                  {item.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderModerationTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search moderation items..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="flagged">Flagged</option>
            </select>
            
            <Button variant="secondary" className="px-4">
              <Filter size={16} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Moderation Queue */}
      <div className="space-y-4">
        {filteredModerationQueue.map((item) => (
          <Card
            key={item.id}
            className="dark:bg-gray-800 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedModeration(item)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {item.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <span className={`text-sm font-medium ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {item.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {item.submittedAt.toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flag size={14} />
                    {item.type}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {item.category}
                  </span>
                  {item.reportCount && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <AlertTriangle size={14} />
                      {item.reportCount} reports
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                {item.status === 'pending' && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModerate(item.id, 'approved');
                      }}
                      className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                    >
                      <CheckCircle size={16} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleModerate(item.id, 'rejected', 'Does not meet community guidelines');
                      }}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      <XCircle size={16} />
                    </Button>
                  </>
                )}
                <Button variant="secondary" size="sm">
                  <Eye size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredModerationQueue.length === 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No items to moderate
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              All moderation items have been processed or no items match your filters.
            </p>
          </div>
        </Card>
      )}
    </div>
  );

  const renderUsersTab = () => (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🔧</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          User Management
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          User management features coming soon. This will include user search, status management, and detailed user analytics.
        </p>
      </div>
    </Card>
  );

  const renderAnalyticsTab = () => (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Advanced Analytics
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Detailed analytics dashboard with charts, trends, and insights coming soon.
        </p>
      </div>
    </Card>
  );

  const renderSettingsTab = () => (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⚙️</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Admin Settings
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          System configuration, admin management, and settings coming soon.
        </p>
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center ${isDarkMode ? 'dark' : ''}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center ${isDarkMode ? 'dark' : ''}`}>
        <Card className="max-w-md w-full mx-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't have permission to access the admin dashboard.
            </p>
            <Button onClick={onBack} className="w-full">
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={onBack}
                className="p-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <Shield size={28} className="text-primary" />
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  System management and moderation tools
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
                className="p-2"
              >
                <RefreshCw size={16} />
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'moderation', label: 'Moderation', icon: Flag },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {tab.id === 'moderation' && adminStats?.pendingModerations && adminStats.pendingModerations > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px]">
                    {adminStats.pendingModerations}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24 lg:pb-6">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'moderation' && renderModerationTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>

      {/* Moderation Detail Modal */}
      {selectedModeration && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Moderation Details
              </h3>
              <Button
                variant="secondary"
                onClick={() => setSelectedModeration(null)}
                className="p-2"
              >
                <XCircle size={16} />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {selectedModeration.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedModeration.description}
                </p>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <span className={`px-2 py-1 rounded-full font-medium ${getStatusColor(selectedModeration.status)}`}>
                  {selectedModeration.status}
                </span>
                <span className={`font-medium ${getPriorityColor(selectedModeration.priority)}`}>
                  {selectedModeration.priority} priority
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {selectedModeration.type}
                </span>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Submitted by: {selectedModeration.submittedBy} • {selectedModeration.submittedAt.toLocaleString()}
                </p>
                
                {selectedModeration.status === 'pending' && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleModerate(selectedModeration.id, 'approved')}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle size={16} className="mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleModerate(selectedModeration.id, 'rejected', 'Does not meet community guidelines')}
                      variant="secondary"
                      className="flex-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      <XCircle size={16} className="mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;