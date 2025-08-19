import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Star, 
  Users, 
  Calendar, 
  Trophy, 
  MessageCircle,
  Heart,
  Eye,
  ChevronRight,
  Award,
  TrendingUp,
  Globe,
  Sparkles,
  CheckCircle,
  Target,
  BookOpen,
  Briefcase,
  GraduationCap,
  Rocket,
  Zap,
  User,
  Plus
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';
import { useGoalCreation } from '../hooks/useGoalCreation';
import { adminService } from '../services/adminService';

interface CommunityRoadmap {
  id: string;
  title: string;
  description: string;
  creator: {
    name: string;
    avatar: string;
    title: string;
    verified: boolean;
    followers: number;
  };
  category: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: number;
  reviews: number;
  users: number;
  successRate: number;
  tags: string[];
  image: string;
  featured: boolean;
  price: 'Free' | 'Premium';
  achievements: string[];
  lastUpdated: string;
}

interface CommunityMarketplaceProps {
  onBack: () => void;
  onRoadmapSelect: (roadmap: CommunityRoadmap) => void;
  onGoalCreated: (goalId: string) => void;
  user: { name: string; age: number; uid: string } | null;
}

const CommunityMarketplace: React.FC<CommunityMarketplaceProps> = ({ 
  onBack, 
  onRoadmapSelect, 
  onGoalCreated,
  user 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFilter, setSelectedFilter] = useState('Popular');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [selectedRoadmapTitle, setSelectedRoadmapTitle] = useState('');
  const { isDarkMode } = useDarkMode();
  const { createGoalFromTemplate } = useGoalCreation();

  const categories = [
    'All', 
    'Programming', 
    'Business', 
    'Education', 
    'Health & Fitness', 
    'Creative', 
    'Personal Development'
  ];

  const filters = [
    'Popular', 
    'Newest', 
    'Highest Rated', 
    'Most Used', 
    'Free Only'
  ];

  const communityRoadmaps: CommunityRoadmap[] = [
    {
      id: '1',
      title: 'From Zero to Software Engineer at Google',
      description: 'Complete journey from beginner to landing a software engineering role at Google. Includes coding practice, system design, and interview preparation.',
      creator: {
        name: 'Amara Okafor',
        avatar: '👩🏾‍💻',
        title: 'Software Engineer at Google',
        verified: true,
        followers: 15420
      },
      category: 'Programming',
      duration: '18 months',
      difficulty: 'Advanced',
      rating: 4.9,
      reviews: 342,
      users: 2847,
      successRate: 78,
      tags: ['JavaScript', 'Python', 'System Design', 'Interviews', 'Career'],
      image: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg',
      featured: true,
      price: 'Premium',
      achievements: ['Google Software Engineer', 'Tech Lead', '6-Figure Salary'],
      lastUpdated: '2 days ago'
    },
    {
      id: '2',
      title: 'Building a $1M E-commerce Business',
      description: 'Step-by-step guide to building a successful e-commerce business from idea to $1M revenue. Real strategies that worked.',
      creator: {
        name: 'Kwame Asante',
        avatar: '👨🏿‍💼',
        title: 'Serial Entrepreneur & CEO',
        verified: true,
        followers: 23100
      },
      category: 'Business',
      duration: '24 months',
      difficulty: 'Advanced',
      rating: 4.8,
      reviews: 189,
      users: 1523,
      successRate: 65,
      tags: ['E-commerce', 'Marketing', 'Sales', 'Scaling', 'Leadership'],
      image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg',
      featured: true,
      price: 'Premium',
      achievements: ['$1M Revenue', 'Team of 50+', 'International Expansion'],
      lastUpdated: '1 week ago'
    },
    {
      id: '3',
      title: 'Rhodes Scholar Success Path',
      description: 'Complete roadmap to becoming a Rhodes Scholar, including academic excellence, leadership development, and application strategy.',
      creator: {
        name: 'Fatima Hassan',
        avatar: '👩🏽‍🎓',
        title: 'Rhodes Scholar & Oxford Graduate',
        verified: true,
        followers: 8750
      },
      category: 'Education',
      duration: '4 years',
      difficulty: 'Advanced',
      rating: 4.9,
      reviews: 156,
      users: 892,
      successRate: 45,
      tags: ['Scholarships', 'Leadership', 'Academic Excellence', 'Oxford', 'Research'],
      image: 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg',
      featured: true,
      price: 'Free',
      achievements: ['Rhodes Scholarship', 'Oxford DPhil', 'Published Research'],
      lastUpdated: '3 days ago'
    },
    {
      id: '4',
      title: 'Fitness Transformation: 0 to Marathon',
      description: 'Complete fitness journey from couch to completing a marathon. Includes training plans, nutrition, and mental preparation.',
      creator: {
        name: 'Chidi Nwosu',
        avatar: '👨🏿‍⚕️',
        title: 'Fitness Coach & Marathon Runner',
        verified: true,
        followers: 12300
      },
      category: 'Health & Fitness',
      duration: '12 months',
      difficulty: 'Intermediate',
      rating: 4.7,
      reviews: 278,
      users: 3421,
      successRate: 82,
      tags: ['Running', 'Fitness', 'Nutrition', 'Mental Health', 'Endurance'],
      image: 'https://images.pexels.com/photos/3768916/pexels-photo-3768916.jpeg',
      featured: false,
      price: 'Free',
      achievements: ['Marathon Finisher', '50lb Weight Loss', 'Fitness Coach Certification'],
      lastUpdated: '5 days ago'
    },
    {
      id: '5',
      title: 'YouTube Creator to 1M Subscribers',
      description: 'Proven strategy to grow from 0 to 1 million YouTube subscribers. Content creation, audience building, and monetization.',
      creator: {
        name: 'Zara Mwangi',
        avatar: '👩🏾‍🎨',
        title: 'Content Creator & Influencer',
        verified: true,
        followers: 45600
      },
      category: 'Creative',
      duration: '18 months',
      difficulty: 'Intermediate',
      rating: 4.6,
      reviews: 423,
      users: 5234,
      successRate: 72,
      tags: ['YouTube', 'Content Creation', 'Social Media', 'Monetization', 'Branding'],
      image: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg',
      featured: false,
      price: 'Premium',
      achievements: ['1M+ Subscribers', '$100K+ Revenue', 'Brand Partnerships'],
      lastUpdated: '1 day ago'
    },
    {
      id: '6',
      title: 'Mastering Public Speaking & Leadership',
      description: 'Transform from shy introvert to confident public speaker and leader. Techniques used to speak at TEDx and lead teams.',
      creator: {
        name: 'Kofi Mensah',
        avatar: '👨🏿‍💼',
        title: 'TEDx Speaker & Leadership Coach',
        verified: true,
        followers: 18900
      },
      category: 'Personal Development',
      duration: '8 months',
      difficulty: 'Beginner',
      rating: 4.8,
      reviews: 312,
      users: 2156,
      successRate: 89,
      tags: ['Public Speaking', 'Leadership', 'Confidence', 'Communication', 'TEDx'],
      image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg',
      featured: false,
      price: 'Free',
      achievements: ['TEDx Speaker', 'Leadership Award', 'Team of 100+'],
      lastUpdated: '4 days ago'
    },
    {
      id: '7',
      title: 'Data Science Career Transition',
      description: 'Complete career change from marketing to data science at a Fortune 500 company. No prior technical background required.',
      creator: {
        name: 'Aisha Kone',
        avatar: '👩🏽‍💻',
        title: 'Senior Data Scientist',
        verified: true,
        followers: 9800
      },
      category: 'Programming',
      duration: '15 months',
      difficulty: 'Intermediate',
      rating: 4.7,
      reviews: 198,
      users: 1876,
      successRate: 71,
      tags: ['Data Science', 'Python', 'Machine Learning', 'Career Change', 'Analytics'],
      image: 'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg',
      featured: false,
      price: 'Premium',
      achievements: ['Data Scientist Role', 'ML Certification', '40% Salary Increase'],
      lastUpdated: '6 days ago'
    },
    {
      id: '8',
      title: 'Building a Personal Brand Empire',
      description: 'How I built a personal brand that generates 7-figures annually through speaking, consulting, and digital products.',
      creator: {
        name: 'Tunde Adebayo',
        avatar: '👨🏿‍💼',
        title: 'Personal Brand Strategist',
        verified: true,
        followers: 32400
      },
      category: 'Business',
      duration: '20 months',
      difficulty: 'Advanced',
      rating: 4.9,
      reviews: 267,
      users: 1432,
      successRate: 58,
      tags: ['Personal Branding', 'Speaking', 'Consulting', 'Digital Products', 'Marketing'],
      image: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg',
      featured: false,
      price: 'Premium',
      achievements: ['7-Figure Business', 'Keynote Speaker', 'Best-Selling Author'],
      lastUpdated: '1 week ago'
    }
  ];

  const filteredRoadmaps = communityRoadmaps.filter(roadmap => {
    const matchesSearch = roadmap.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         roadmap.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         roadmap.creator.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || roadmap.category === selectedCategory;
    const matchesFilter = selectedFilter === 'Free Only' ? roadmap.price === 'Free' : true;
    
    return matchesSearch && matchesCategory && matchesFilter;
  }).sort((a, b) => {
    switch (selectedFilter) {
      case 'Newest':
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      case 'Highest Rated':
        return b.rating - a.rating;
      case 'Most Used':
        return b.users - a.users;
      default:
        return b.featured ? 1 : -1;
    }
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Programming': return <BookOpen size={16} className="text-blue-600" />;
      case 'Business': return <Briefcase size={16} className="text-green-600" />;
      case 'Education': return <GraduationCap size={16} className="text-purple-600" />;
      case 'Health & Fitness': return <Heart size={16} className="text-red-600" />;
      case 'Creative': return <Sparkles size={16} className="text-pink-600" />;
      case 'Personal Development': return <Target size={16} className="text-orange-600" />;
      default: return <Globe size={16} className="text-gray-600" />;
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  const handleRoadmapSelect = async (roadmap: CommunityRoadmap) => {
    if (!user) return;
    
    try {
      // Create goal directly from community roadmap
      const goalId = await createGoalFromTemplate({
        id: roadmap.id,
        title: roadmap.title,
        description: roadmap.description,
        category: roadmap.category.toLowerCase(),
        difficulty: roadmap.difficulty.toLowerCase(),
        duration: roadmap.duration,
        skills: roadmap.tags,
        estimatedTime: roadmap.duration,
        monthlyRoadmap: generateMonthlyRoadmapFromCommunity(roadmap)
      }, {
        userId: user.uid,
        priority: 'high',
        targetDate: calculateTargetDate(roadmap.duration)
      });
      
      if (goalId) {
        // Submit community-generated goal for moderation
        try {
          await adminService.submitForModeration(goalId, user.uid, 'goal');
          console.log('Goal submitted for moderation:', goalId);
        } catch (moderationError) {
          console.warn('Could not submit for moderation:', moderationError);
          // Continue even if moderation submission fails
        }
        
        // Show success popup
        setSelectedRoadmapTitle(roadmap.title);
        setShowSuccessPopup(true);
        
        // Auto-hide popup and redirect after 2.5 seconds
        setTimeout(() => {
          setShowSuccessPopup(false);
          onGoalCreated(goalId);
        }, 2500);
      }
    } catch (error) {
      console.error('Failed to create goal from community roadmap:', error);
      // Fallback to old method
      scrollToTop();
      onRoadmapSelect(roadmap);
    }
  };
  
  // Move these functions outside the component scope
  const generateMonthlyRoadmapFromCommunity = (roadmap: CommunityRoadmap) => {
    // Convert community roadmap into monthly structure
    const months = roadmap.duration.includes('month') ? parseInt(roadmap.duration) : 
                  roadmap.duration.includes('week') ? Math.ceil(parseInt(roadmap.duration) / 4) : 3;
    
    return Array.from({ length: months }, (_, index) => ({
      id: `month_${index + 1}`,
      month: index + 1,
      title: `Month ${index + 1}: ${getMonthTitle(index, roadmap.category)}`,
      description: `Focus on ${roadmap.tags.slice(index * 2, (index + 1) * 2).join(' and ')} skills`,
      tasks: generateMonthlyTasks(index, roadmap),
      focusAreas: roadmap.tags.slice(index * 2, (index + 1) * 2),
      targetProgress: Math.round(((index + 1) / months) * 100)
    }));
  };
  
  const getMonthTitle = (index: number, category: string) => {
    const titles: { [key: number]: string } = {
      0: 'Foundation & Setup',
      1: 'Core Development', 
      2: 'Advanced Practice',
      3: 'Mastery & Application'
    };
    return titles[index] || `${category} Progress`;
  };
  
  const generateMonthlyTasks = (monthIndex: number, roadmap: CommunityRoadmap) => {
    return [
      {
        id: `task_${monthIndex}_1`,
        title: `Study ${roadmap.category} fundamentals`,
        description: `Learn the core concepts of ${roadmap.category}`,
        completed: false,
        priority: 'high' as const,
        estimatedHours: 10
      },
      {
        id: `task_${monthIndex}_2`, 
        title: `Practice ${roadmap.tags[monthIndex] || 'key skills'}`,
        description: `Hands-on practice with ${roadmap.tags[monthIndex] || 'relevant skills'}`,
        completed: false,
        priority: 'medium' as const,
        estimatedHours: 15
      },
      {
        id: `task_${monthIndex}_3`,
        title: 'Apply learning through project',
        description: 'Build a practical project to demonstrate skills',
        completed: false,
        priority: 'medium' as const,
        estimatedHours: 20
      }
    ];
  };
  
  const calculateTargetDate = (duration: string): Date => {
    const date = new Date();
    if (duration.includes('month')) {
      const months = parseInt(duration) || 3;
      date.setMonth(date.getMonth() + months);
    } else if (duration.includes('week')) {
      const weeks = parseInt(duration) || 12;
      date.setDate(date.getDate() + (weeks * 7));
    }
    return date;
  };

  const handleContactCreator = (creator: any) => {
    // Handle contacting the creator
    console.log('Contact creator:', creator);
  };

  return (
    <div className={`min-h-screen bg-white dark:bg-gray-900 animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      {/* Header - Now scrollable, not fixed */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="secondary"
              onClick={handleBack}
              className="p-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Globe size={24} className="text-primary" />
                Community Marketplace
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {filteredRoadmaps.length} success roadmaps from accomplished creators
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search roadmaps, creators, or skills..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category !== 'All' && getCategoryIcon(category)}
                {category}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2 overflow-x-auto">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    selectedFilter === filter
                      ? 'bg-accent text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <Filter size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Featured Section */}
      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <Star size={20} className="text-yellow-500" />
            Featured Success Stories
          </h2>
          <div className="grid gap-4">
            {filteredRoadmaps.filter(r => r.featured).slice(0, 3).map((roadmap, index) => (
              <Card
                key={roadmap.id}
                className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.02] dark:bg-gray-800 dark:border-gray-700 animate-slide-up group"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => handleRoadmapSelect(roadmap)}
              >
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                    <img
                      src={roadmap.image}
                      alt={roadmap.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 dark:text-white line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                          {roadmap.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{roadmap.creator.avatar}</span>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium text-gray-800 dark:text-white">{roadmap.creator.name}</span>
                              {roadmap.creator.verified && (
                                <CheckCircle size={14} className="text-blue-500" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{roadmap.creator.title}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Star size={14} className="text-yellow-500" />
                        <span className="text-sm font-medium text-gray-800 dark:text-white">{roadmap.rating}</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {roadmap.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Users size={12} />
                          <span>{roadmap.users.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp size={12} />
                          <span>{roadmap.successRate}% success</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs border ${getDifficultyColor(roadmap.difficulty)}`}>
                          {roadmap.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {roadmap.price === 'Premium' && (
                          <span className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full font-medium">
                            Premium
                          </span>
                        )}
                        <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* All Roadmaps */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">All Roadmaps</h2>
          <div className="space-y-4">
            {filteredRoadmaps.map((roadmap, index) => (
              <Card
                key={roadmap.id}
                className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.01] dark:bg-gray-800 dark:border-gray-700 animate-slide-up group"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleRoadmapSelect(roadmap)}
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                    <img
                      src={roadmap.image}
                      alt={roadmap.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 dark:text-white line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                          {roadmap.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm">{roadmap.creator.avatar}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{roadmap.creator.name}</span>
                            {roadmap.creator.verified && (
                              <CheckCircle size={12} className="text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-500" />
                          <span className="text-sm font-medium text-gray-800 dark:text-white">{roadmap.rating}</span>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContactCreator(roadmap.creator);
                          }}
                          className="p-2"
                        >
                          <MessageCircle size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        {getCategoryIcon(roadmap.category)}
                        <span>{roadmap.category}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{roadmap.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        <span>{roadmap.users.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs border ${getDifficultyColor(roadmap.difficulty)}`}>
                          {roadmap.difficulty}
                        </span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          {roadmap.successRate}% success rate
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {roadmap.price === 'Premium' ? (
                          <span className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full font-medium">
                            Premium
                          </span>
                        ) : (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium">
                            Free
                          </span>
                        )}
                        <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredRoadmaps.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No roadmaps found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>

        {/* Create Your Own Section */}
        <Card className="bg-gradient-to-r from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 border-primary/20 dark:border-primary/30">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Rocket size={32} className="text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Share Your Success Story</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
              Have you achieved something amazing? Create a roadmap to help others follow in your footsteps and earn from your expertise.
            </p>
            <Button className="inline-flex items-center gap-2">
              <Plus size={16} />
              Create Roadmap
            </Button>
          </div>
        </Card>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-2xl p-8 text-center animate-fade-in`}>
            <div className="text-6xl mb-4">🎉</div>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-white" />
            </div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
              Community Goal Added! 🌟
            </h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6 leading-relaxed`}>
              "{selectedRoadmapTitle}" has been added to your goals! Check the "Your Goals" section on your dashboard to start following this proven roadmap.
            </p>
            <div className={`inline-flex items-center gap-2 px-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full text-sm`}>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                Redirecting to dashboard...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityMarketplace;