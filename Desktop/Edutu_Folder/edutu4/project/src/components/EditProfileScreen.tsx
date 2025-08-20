import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Save, Camera, Sparkles, Settings } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import IntroductionPopup from './IntroductionPopup';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface EditProfileScreenProps {
  user: { name: string; age: number; uid: string } | null;
  setUser: (user: { name: string; age: number; uid: string } | null) => void;
  onBack: () => void;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ user, setUser, onBack }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    age: user?.age.toString() || '',
    email: 'user@example.com',
    phone: '+234 123 456 7890',
    location: 'Lagos, Nigeria',
    bio: 'Passionate about technology and personal growth. Always looking for new opportunities to learn and make an impact.',
    interests: 'Technology, Entrepreneurship, Education',
    goals: 'Complete Python Course, Apply to Scholarships, Build Portfolio'
  });

  const [showPreferencesPopup, setShowPreferencesPopup] = useState(false);
  const { isDarkMode } = useDarkMode();

  const handleSave = () => {
    if (formData.name && formData.age && user) {
      setUser({ name: formData.name, age: parseInt(formData.age), uid: user.uid });
      onBack();
    }
  };

  // Handle preferences popup completion
  const handlePreferencesComplete = async (preferences: any) => {
    if (!user?.uid) return;

    try {
      // Save the preferences to Firestore
      if (Object.keys(preferences).length > 0) {
        const preferencesRef = doc(db, `users/${user.uid}/onboarding`, 'preferences');
        await setDoc(preferencesRef, {
          ...preferences,
          completedAt: new Date(),
          version: '1.0',
          completedViaProfile: true
        });
        
        console.log('✅ Preferences saved successfully from profile');
      }
    } catch (error) {
      console.error('❌ Error saving preferences from profile:', error);
    }

    setShowPreferencesPopup(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  return (
    <div className={`min-h-screen bg-white dark:bg-gray-900 animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleBack}
              size="md"
              icon={ArrowLeft}
            />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Edit Profile</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Update your personal information</p>
            </div>
            <Button 
              onClick={handleSave} 
              variant="primary"
              size="sm"
              icon={Save}
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Picture */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto">
                <User size={40} className="text-white" />
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                <Camera size={16} />
              </button>
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Profile Picture</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Click the camera icon to update your photo</p>
          </div>
        </Card>

        {/* Basic Information */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Age
              </label>
              <div className="relative">
                <Calendar size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  min="16"
                  max="30"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Your age"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <div className="relative">
                <MapPin size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Enter your location"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">About You</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interests
              </label>
              <input
                type="text"
                value={formData.interests}
                onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Your interests (comma separated)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Goals
              </label>
              <textarea
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                placeholder="What are your current goals?"
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Complete Profile Setup */}
        <Card className="dark:bg-gray-800 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={28} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Complete Your Profile</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Set up your detailed preferences to get personalized recommendations and opportunities tailored just for you.
            </p>
            <Button 
              onClick={() => setShowPreferencesPopup(true)}
              variant="primary"
              size="md"
              icon={Settings}
            >
              Complete Profile Setup
            </Button>
          </div>
        </Card>

        {/* Save Button */}
        <div className="pt-4">
          <Button 
            onClick={handleSave} 
            variant="primary"
            size="lg"
            fullWidth
            disabled={!formData.name || !formData.age}
            icon={Save}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Preferences Setup Popup */}
      {user && (
        <IntroductionPopup
          isOpen={showPreferencesPopup}
          onComplete={handlePreferencesComplete}
          userName={user.name}
        />
      )}
    </div>
  );
};

export default EditProfileScreen;