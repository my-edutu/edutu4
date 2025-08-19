import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star, ArrowRight, Sparkles, Trophy, Target, Zap } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

interface SuccessStory {
  id: string;
  name: string;
  title: string;
  achievement: string;
  description: string;
  timeframe: string;
  category: string;
  avatar: string;
  gradient: string;
  stats: {
    metric: string;
    value: string;
  };
  inspiration: string;
}

interface SuccessStoriesProps {
  onGetRoadmap?: (story: SuccessStory) => void;
  className?: string;
}

const SuccessStories: React.FC<SuccessStoriesProps> = ({ 
  onGetRoadmap,
  className = ''
}) => {
  const { isDarkMode } = useDarkMode();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const autoSlideRef = useRef<NodeJS.Timeout | null>(null);

  // Stunning success stories with beautiful gradients
  const stories: SuccessStory[] = [
    {
      id: '1',
      name: 'Amara Okafor',
      title: 'Google Software Engineer',
      achievement: 'From Zero to Tech Giant',
      description: 'Self-taught programming and landed at Google within 18 months. Mastered algorithms, system design, and shipped features used by millions.',
      timeframe: '18 months',
      category: 'Technology',
      avatar: '👩🏾‍💻',
      gradient: 'from-blue-600 via-purple-600 to-indigo-800',
      stats: { metric: 'Salary Increase', value: '400%' },
      inspiration: 'Code your dreams into reality'
    },
    {
      id: '2',
      name: 'Kwame Asante',
      title: 'Serial Entrepreneur',
      achievement: '$1M+ Business Empire',
      description: 'Built multiple successful businesses from $5K savings. Now mentors entrepreneurs across Africa and runs a venture capital fund.',
      timeframe: '3 years',
      category: 'Business',
      avatar: '👨🏿‍💼',
      gradient: 'from-emerald-500 via-teal-600 to-green-700',
      stats: { metric: 'Revenue Growth', value: '20,000%' },
      inspiration: 'Turn ideas into impact'
    },
    {
      id: '3',
      name: 'Fatima Hassan',
      title: 'Rhodes Scholar',
      achievement: 'Academic Excellence',
      description: 'Achieved perfect grades, led community initiatives, and won the prestigious Rhodes Scholarship to Oxford University.',
      timeframe: '4 years',
      category: 'Education',
      avatar: '👩🏽‍🎓',
      gradient: 'from-amber-500 via-orange-600 to-red-600',
      stats: { metric: 'Scholarship Value', value: '$250K' },
      inspiration: 'Excellence is a habit'
    },
    {
      id: '4',
      name: 'Dr. Chidi Nwosu',
      title: 'WHO Program Director',
      achievement: 'Global Health Impact',
      description: 'Leading healthcare initiatives across 20 African countries, improving medical access for over 10 million people.',
      timeframe: '8 years',
      category: 'Healthcare',
      avatar: '👨🏿‍⚕️',
      gradient: 'from-red-500 via-pink-600 to-rose-700',
      stats: { metric: 'Lives Impacted', value: '10M+' },
      inspiration: 'Heal the world, one life at a time'
    },
    {
      id: '5',
      name: 'Zara Mwangi',
      title: 'Netflix Creator',
      achievement: 'Global Storyteller',
      description: 'Created award-winning content for Netflix, reaching 50M+ viewers worldwide with authentic African narratives.',
      timeframe: '5 years',
      category: 'Creative',
      avatar: '👩🏾‍🎨',
      gradient: 'from-violet-600 via-purple-600 to-fuchsia-700',
      stats: { metric: 'Global Reach', value: '50M+' },
      inspiration: 'Stories shape the world'
    },
    {
      id: '6',
      name: 'Kofi Mensah',
      title: 'Climate Champion',
      achievement: 'Environmental Leader',
      description: 'Leading $100M climate initiatives, created 50K+ green jobs, and reduced carbon emissions across 15 countries.',
      timeframe: '6 years',
      category: 'Environment',
      avatar: '🌍',
      gradient: 'from-green-600 via-emerald-600 to-teal-700',
      stats: { metric: 'CO₂ Reduced', value: '2M tons' },
      inspiration: 'Save the planet, secure the future'
    }
  ];

  // Auto-slide functionality
  const startAutoSlide = useCallback(() => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
    }
    
    autoSlideRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % stories.length);
    }, 4000);
  }, [stories.length]);

  const stopAutoSlide = useCallback(() => {
    if (autoSlideRef.current) {
      clearInterval(autoSlideRef.current);
    }
  }, []);

  useEffect(() => {
    if (isAutoPlaying && !isHovered) {
      startAutoSlide();
    } else {
      stopAutoSlide();
    }
    return () => stopAutoSlide();
  }, [isAutoPlaying, isHovered, startAutoSlide, stopAutoSlide]);

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % stories.length);
  };

  const goToPrevious = () => {
    setCurrentIndex(prev => prev === 0 ? stories.length - 1 : prev - 1);
  };

  const currentStory = stories[currentIndex];

  return (
    <div className={`${className} relative`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Star size={24} className="text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Success Stories
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Real journeys, extraordinary outcomes
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`
            px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm
            ${isDarkMode ? 'bg-white/10 text-white' : 'bg-black/10 text-gray-800'}
          `}>
            {currentIndex + 1} of {stories.length}
          </div>
        </div>
      </div>

      {/* Scrollable Cards Container */}
      <div 
        className="relative overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400">
          {stories.map((story, index) => (
            <div key={story.id} className="flex-shrink-0 w-80">
              <div className="relative h-72 rounded-xl overflow-hidden shadow-lg">
                {/* Dynamic Gradient Background */}
                <div className={`
                  absolute inset-0 bg-gradient-to-br ${story.gradient}
                  transition-all duration-500 ease-in-out
                `}>
                  {/* Glassmorphism Overlay */}
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>
                </div>

                {/* Content */}
                <div className="relative h-full flex flex-col justify-between p-4 text-white">
                  {/* Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-lg border border-white/30">
                        {story.avatar}
                      </div>
                      <div className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium border border-white/30">
                        {story.category}
                      </div>
                    </div>

                    <h3 className="text-lg font-bold mb-1 leading-tight">
                      {story.name}
                    </h3>
                    <h4 className="text-sm font-semibold mb-2 text-white/90">
                      {story.title}
                    </h4>
                    
                    <div className="max-h-20 overflow-y-auto scrollbar-thin scrollbar-track-white/10 scrollbar-thumb-white/30 mb-3">
                      <p className="text-xs leading-relaxed text-white/90 pr-1">
                        {story.description}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div>
                    <div className="flex items-center gap-4 mb-3 text-xs">
                      <div className="text-center">
                        <div className="font-bold">{story.stats.value}</div>
                        <div className="text-white/70">{story.stats.metric}</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold">{story.timeframe}</div>
                        <div className="text-white/70">Timeline</div>
                      </div>
                    </div>

                    <button
                      onClick={() => onGetRoadmap?.(story)}
                      className="
                        w-full flex items-center justify-center gap-2 px-3 py-2 
                        bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 
                        text-white font-semibold text-xs hover:bg-white/30 
                        hover:scale-105 transition-all duration-300
                      "
                    >
                      <Trophy size={14} />
                      <span>Get Roadmap</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuccessStories;