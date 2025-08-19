import React, { useState } from 'react';
import { 
  User, 
  Settings, 
  LogOut, 
  Edit3, 
  Save, 
  X,
  Target,
  Award,
  Brain,
  UserCircle,
  ChevronRight
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import { Screen } from '../App';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

interface ProfileProps {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onNavigate, onLogout }) => {
  const { userData, user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(userData?.name || '');
  const [editBio, setEditBio] = useState('Passionate about learning and growth');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) return;
    
    setIsUpdating(true);
    try {
      // Here you would update the user profile in Firestore
      // For now, we'll just close the modal
      setShowEditModal(false);
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const navigationCards = [
    {
      id: 'profile-details',
      title: 'My Profile Details',
      description: 'View and edit your education, interests, and preferences',
      icon: <UserCircle size={24} className="text-blue-600" />,
      bgGradient: 'from-blue-50 to-blue-100',
      iconBg: 'bg-gradient-to-br from-blue-50 to-blue-100',
      onClick: () => onNavigate('profile-edit' as Screen)
    },
    {
      id: 'ai-insights',
      title: 'AI Insights & Recommendations',
      description: 'Get personalized AI-powered suggestions for your growth',
      icon: <Brain size={24} className="text-purple-600" />,
      bgGradient: 'from-purple-50 to-purple-100',
      iconBg: 'bg-gradient-to-br from-purple-50 to-purple-100',
      onClick: () => onNavigate('ai-insights' as Screen)
    },
    {
      id: 'goals-roadmaps',
      title: 'My Goals & Roadmaps',
      description: 'Track your active goals and learning progress',
      icon: <Target size={24} className="text-green-600" />,
      bgGradient: 'from-green-50 to-green-100',
      iconBg: 'bg-gradient-to-br from-green-50 to-green-100',
      onClick: () => onNavigate('goals' as Screen)
    },
    {
      id: 'achievements',
      title: 'Achievements & Badges',
      description: 'View your milestones and earned rewards',
      icon: <Award size={24} className="text-yellow-600" />,
      bgGradient: 'from-yellow-50 to-yellow-100',
      iconBg: 'bg-gradient-to-br from-yellow-50 to-yellow-100',
      onClick: () => onNavigate('achievements' as Screen)
    },
    {
      id: 'settings',
      title: 'Account Settings',
      description: 'Manage notifications, privacy, and security settings',
      icon: <Settings size={24} className="text-gray-600" />,
      bgGradient: 'from-gray-50 to-gray-100',
      iconBg: 'bg-gradient-to-br from-gray-50 to-gray-100',
      onClick: () => onNavigate('settings' as Screen)
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="p-4 max-w-4xl mx-auto space-y-6 animate-fade-in pb-24">
        
        {/* Top Section - User Info */}
        <Card className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 dark:border-gray-700 shadow-lg border-0">
          <div className="text-center">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
                <User size={40} className="text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"></div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              {userData?.name || user?.displayName || 'Your Name'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {userData?.email || user?.email}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto leading-relaxed">
              {editBio}
            </p>
            
            <Button
              variant="outline"
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-blue-200 text-blue-600 hover:bg-blue-50 transition-all"
            >
              <Edit3 size={18} />
              Edit Profile
            </Button>
          </div>
        </Card>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {navigationCards.map((card, index) => (
            <Card
              key={card.id}
              className="bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 dark:border-gray-700 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 hover:scale-105"
              onClick={card.onClick}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-4 p-4 min-h-[80px]">
                <div className={`w-14 h-14 flex-shrink-0 ${card.iconBg} dark:from-gray-600 dark:to-gray-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                  {card.icon}
                </div>
                
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-1 group-hover:text-blue-600 transition-colors leading-tight">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {card.description}
                  </p>
                </div>
                
                <ChevronRight 
                  size={18} 
                  className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0" 
                />
              </div>
            </Card>
          ))}
        </div>

        {/* Log Out Button */}
        <Card className="bg-red-50/80 backdrop-blur-sm dark:bg-red-900/20 border-red-200 dark:border-red-800 shadow-md">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 group"
          >
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/40 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <LogOut size={24} className="text-red-500" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-lg font-semibold">Log Out</div>
              <div className="text-sm text-red-500 dark:text-red-400">Sign out of your Edutu account</div>
            </div>
            <ChevronRight size={20} className="text-red-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </Card>

        {/* App Info Footer */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm space-y-2 pt-6">
          <p className="font-medium">Edutu AI Opportunity Coach v1.0</p>
          <p>Empowering growth through personalized guidance</p>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="bg-white dark:bg-gray-800 max-w-md w-full shadow-2xl border-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Edit Profile</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                    placeholder="Tell us about yourself..."
                    rows={3}
                    maxLength={150}
                  />
                  <p className="text-xs text-gray-500 mt-1">{editBio.length}/150 characters</p>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  variant="secondary"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1"
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateProfile}
                  className="flex-1"
                  disabled={!editName.trim() || isUpdating}
                  loading={isUpdating}
                >
                  <Save size={16} className="mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Profile;