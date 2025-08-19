import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, MessageCircle, Mail, Phone, Book, Search, ChevronDown, ChevronRight } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';

interface HelpScreenProps {
  onBack: () => void;
}

const HelpScreen: React.FC<HelpScreenProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const { isDarkMode } = useDarkMode();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  const contactOptions = [
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Chat with our support team',
      icon: <MessageCircle size={20} className="text-primary" />,
      action: 'Start Chat'
    },
    {
      id: 'email',
      title: 'Email Support',
      description: 'Send us an email',
      icon: <Mail size={20} className="text-blue-600" />,
      action: 'Send Email'
    },
    {
      id: 'phone',
      title: 'Phone Support',
      description: 'Call our support line',
      icon: <Phone size={20} className="text-green-600" />,
      action: 'Call Now'
    }
  ];

  const faqItems = [
    {
      id: 'getting-started',
      question: 'How do I get started with Edutu?',
      answer: 'Simply create an account, complete your profile, and start exploring opportunities. Our AI will begin recommending personalized opportunities based on your goals and interests.'
    },
    {
      id: 'opportunities',
      question: 'How does Edutu find opportunities for me?',
      answer: 'Our AI analyzes your profile, goals, skills, and preferences to match you with relevant scholarships, jobs, internships, and other opportunities from our curated database.'
    },
    {
      id: 'roadmaps',
      question: 'What are personalized roadmaps?',
      answer: 'Roadmaps are step-by-step plans created specifically for your goals. They include tasks, deadlines, resources, and milestones to help you achieve your objectives systematically.'
    },
    {
      id: 'notifications',
      question: 'How do I manage my notifications?',
      answer: 'Go to Settings > Notifications to customize what notifications you receive and when. You can set quiet hours and choose between push notifications and email alerts.'
    },
    {
      id: 'privacy',
      question: 'Is my data safe with Edutu?',
      answer: 'Yes, we take privacy seriously. Your data is encrypted and we never share personal information without your consent. You can review our privacy policy for more details.'
    },
    {
      id: 'account',
      question: 'How do I delete my account?',
      answer: 'Go to Settings > Privacy & Security > Data Management > Delete Account. Note that this action is permanent and cannot be undone.'
    }
  ];

  const filteredFaqs = faqItems.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
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
              className="p-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Help & Support</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get help and find answers</p>
            </div>
            <HelpCircle size={24} className="text-primary" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Search */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
        </Card>

        {/* Contact Options */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Contact Support</h3>
          <div className="space-y-3">
            {contactOptions.map((option, index) => (
              <button
                key={option.id}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 dark:text-white">{option.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{option.description}</p>
                </div>
                <Button variant="secondary" className="px-4 py-2 text-sm">
                  {option.action}
                </Button>
              </button>
            ))}
          </div>
        </Card>

        {/* FAQ */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {filteredFaqs.map((faq, index) => (
              <div
                key={faq.id}
                className="border border-gray-200 dark:border-gray-600 rounded-2xl animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-all rounded-2xl"
                >
                  <h4 className="font-medium text-gray-800 dark:text-white pr-4">{faq.question}</h4>
                  {expandedFaq === faq.id ? (
                    <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {expandedFaq === faq.id && (
                  <div className="px-4 pb-4 animate-slide-up">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredFaqs.length === 0 && searchQuery && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No results found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try searching with different keywords</p>
            </div>
          )}
        </Card>

        {/* Resources */}
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Additional Resources</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                <Book size={20} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 dark:text-white">User Guide</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Complete guide to using Edutu</p>
              </div>
            </button>

            <button className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                <MessageCircle size={20} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 dark:text-white">Community Forum</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Connect with other users</p>
              </div>
            </button>
          </div>
        </Card>

        {/* App Info */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm space-y-1">
          <p>Edutu v1.0</p>
          <p>Need more help? Contact us at support@edutu.com</p>
        </div>
      </div>
    </div>
  );
};

export default HelpScreen;