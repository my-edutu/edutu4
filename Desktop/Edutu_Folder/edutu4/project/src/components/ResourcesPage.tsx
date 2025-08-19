import React, { useState } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  FileText, 
  Users, 
  Award, 
  Download, 
  ExternalLink, 
  Play, 
  MessageCircle,
  Search,
  Filter,
  Star,
  Eye,
  Clock,
  Globe,
  Youtube,
  File,
  Link,
  Heart,
  Share2,
  Bookmark
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'video' | 'community' | 'course' | 'tool' | 'certification';
  category: string;
  url: string;
  downloadUrl?: string;
  thumbnail?: string;
  author: string;
  rating: number;
  views: number;
  duration?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  featured: boolean;
  free: boolean;
}

interface ResourcesPageProps {
  onBack: () => void;
  roadmapType?: string;
  roadmapTitle?: string;
}

const ResourcesPage: React.FC<ResourcesPageProps> = ({ 
  onBack, 
  roadmapType = 'python', 
  roadmapTitle = 'Complete Python Course' 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const { isDarkMode } = useDarkMode();

  const categories = ['All', 'Getting Started', 'Core Concepts', 'Advanced Topics', 'Projects', 'Career'];
  const types = ['All', 'Documents', 'Videos', 'Communities', 'Courses', 'Tools', 'Certifications'];

  const resources: Resource[] = [
    {
      id: '1',
      title: 'Official Python Documentation',
      description: 'Comprehensive official documentation covering all Python features, libraries, and best practices.',
      type: 'document',
      category: 'Getting Started',
      url: 'https://docs.python.org/3/',
      author: 'Python Software Foundation',
      rating: 4.9,
      views: 2500000,
      difficulty: 'Beginner',
      tags: ['Official', 'Reference', 'Complete'],
      featured: true,
      free: true
    },
    {
      id: '2',
      title: 'Python for Everybody Specialization',
      description: 'University of Michigan\'s comprehensive Python course series on Coursera, perfect for beginners.',
      type: 'course',
      category: 'Getting Started',
      url: 'https://www.coursera.org/specializations/python',
      thumbnail: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg',
      author: 'University of Michigan',
      rating: 4.8,
      views: 850000,
      duration: '8 months',
      difficulty: 'Beginner',
      tags: ['University', 'Structured', 'Certificate'],
      featured: true,
      free: false
    },
    {
      id: '3',
      title: 'Python Programming Tutorial - Full Course',
      description: 'Complete 4.5-hour Python tutorial covering basics to advanced concepts with practical examples.',
      type: 'video',
      category: 'Core Concepts',
      url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc',
      thumbnail: 'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg',
      author: 'Programming with Mosh',
      rating: 4.7,
      views: 12000000,
      duration: '4h 30m',
      difficulty: 'Beginner',
      tags: ['Complete', 'Practical', 'Free'],
      featured: true,
      free: true
    },
    {
      id: '4',
      title: 'r/Python Community',
      description: 'Active Reddit community with 900k+ members discussing Python news, tutorials, and getting help.',
      type: 'community',
      category: 'Getting Started',
      url: 'https://reddit.com/r/Python',
      author: 'Reddit Community',
      rating: 4.6,
      views: 900000,
      difficulty: 'Beginner',
      tags: ['Community', 'Discussion', 'Help'],
      featured: false,
      free: true
    },
    {
      id: '5',
      title: 'Automate the Boring Stuff with Python',
      description: 'Free online book teaching practical programming for total beginners with real-world projects.',
      type: 'document',
      category: 'Projects',
      url: 'https://automatetheboringstuff.com/',
      downloadUrl: 'https://automatetheboringstuff.com/2e/chapter0/',
      author: 'Al Sweigart',
      rating: 4.8,
      views: 1500000,
      difficulty: 'Beginner',
      tags: ['Free Book', 'Practical', 'Projects'],
      featured: true,
      free: true
    },
    {
      id: '6',
      title: 'Python Institute Certification',
      description: 'Industry-recognized Python certification program with multiple levels from entry to professional.',
      type: 'certification',
      category: 'Career',
      url: 'https://pythoninstitute.org/certification',
      author: 'Python Institute',
      rating: 4.5,
      views: 250000,
      difficulty: 'Intermediate',
      tags: ['Certification', 'Professional', 'Career'],
      featured: false,
      free: false
    },
    {
      id: '7',
      title: 'PyCharm IDE',
      description: 'Professional Python IDE with intelligent code assistance, debugging, and project management.',
      type: 'tool',
      category: 'Getting Started',
      url: 'https://www.jetbrains.com/pycharm/',
      downloadUrl: 'https://www.jetbrains.com/pycharm/download/',
      author: 'JetBrains',
      rating: 4.7,
      views: 3000000,
      difficulty: 'Beginner',
      tags: ['IDE', 'Development', 'Professional'],
      featured: false,
      free: true
    },
    {
      id: '8',
      title: 'Real Python Tutorials',
      description: 'High-quality Python tutorials, articles, and courses covering beginner to advanced topics.',
      type: 'course',
      category: 'Advanced Topics',
      url: 'https://realpython.com/',
      thumbnail: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg',
      author: 'Real Python Team',
      rating: 4.9,
      views: 2000000,
      difficulty: 'Intermediate',
      tags: ['Quality', 'Comprehensive', 'Updated'],
      featured: true,
      free: false
    },
    {
      id: '9',
      title: 'Python Discord Community',
      description: 'Large Discord server with 200k+ members for real-time Python help and discussions.',
      type: 'community',
      category: 'Getting Started',
      url: 'https://discord.gg/python',
      author: 'Python Discord',
      rating: 4.4,
      views: 200000,
      difficulty: 'Beginner',
      tags: ['Discord', 'Real-time', 'Help'],
      featured: false,
      free: true
    },
    {
      id: '10',
      title: 'Python Crash Course Book',
      description: 'Hands-on, project-based introduction to programming that teaches you to write programs that do something.',
      type: 'document',
      category: 'Projects',
      url: 'https://nostarch.com/pythoncrashcourse2e',
      author: 'Eric Matthes',
      rating: 4.8,
      views: 800000,
      difficulty: 'Beginner',
      tags: ['Book', 'Projects', 'Hands-on'],
      featured: false,
      free: false
    },
    {
      id: '11',
      title: 'Corey Schafer Python Tutorials',
      description: 'Comprehensive YouTube series covering Python basics, web development, and advanced topics.',
      type: 'video',
      category: 'Core Concepts',
      url: 'https://www.youtube.com/c/Coreyms',
      thumbnail: 'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg',
      author: 'Corey Schafer',
      rating: 4.9,
      views: 5000000,
      duration: '100+ videos',
      difficulty: 'Beginner',
      tags: ['YouTube', 'Comprehensive', 'Clear'],
      featured: true,
      free: true
    },
    {
      id: '12',
      title: 'Jupyter Notebook',
      description: 'Interactive development environment perfect for data science, prototyping, and learning Python.',
      type: 'tool',
      category: 'Getting Started',
      url: 'https://jupyter.org/',
      downloadUrl: 'https://jupyter.org/install',
      author: 'Project Jupyter',
      rating: 4.6,
      views: 4000000,
      difficulty: 'Beginner',
      tags: ['Interactive', 'Data Science', 'Learning'],
      featured: false,
      free: true
    }
  ];

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || resource.category === selectedCategory;
    const matchesType = selectedType === 'All' || 
                       (selectedType === 'Documents' && resource.type === 'document') ||
                       (selectedType === 'Videos' && resource.type === 'video') ||
                       (selectedType === 'Communities' && resource.type === 'community') ||
                       (selectedType === 'Courses' && resource.type === 'course') ||
                       (selectedType === 'Tools' && resource.type === 'tool') ||
                       (selectedType === 'Certifications' && resource.type === 'certification');
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText size={20} className="text-blue-600" />;
      case 'video': return <Play size={20} className="text-red-600" />;
      case 'community': return <Users size={20} className="text-green-600" />;
      case 'course': return <BookOpen size={20} className="text-purple-600" />;
      case 'tool': return <Globe size={20} className="text-orange-600" />;
      case 'certification': return <Award size={20} className="text-yellow-600" />;
      default: return <FileText size={20} className="text-gray-600" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const handleResourceClick = (resource: Resource) => {
    window.open(resource.url, '_blank');
  };

  const handleDownload = (resource: Resource) => {
    if (resource.downloadUrl) {
      window.open(resource.downloadUrl, '_blank');
    }
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
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="secondary"
              onClick={handleBack}
              className="p-2 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ArrowLeft size={20} />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Learning Resources</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Curated resources for: {roadmapTitle}
              </p>
            </div>
            <BookOpen size={24} className="text-primary" />
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search resources, topics, or authors..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categories</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === category
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resource Types</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {types.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedType === type
                        ? 'bg-accent text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Featured Resources */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Star size={20} className="text-yellow-500" />
            Featured Resources
          </h2>
          <div className="grid gap-4">
            {filteredResources.filter(r => r.featured).map((resource, index) => (
              <Card
                key={resource.id}
                className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.02] dark:bg-gray-800 dark:border-gray-700 animate-slide-up group"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => handleResourceClick(resource)}
              >
                <div className="flex gap-4">
                  {resource.thumbnail && (
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                      <img
                        src={resource.thumbnail}
                        alt={resource.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 dark:text-white line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                          {resource.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">By {resource.author}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {getTypeIcon(resource.type)}
                        {resource.free ? (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium">
                            Free
                          </span>
                        ) : (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full font-medium">
                            Premium
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {resource.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-yellow-500" />
                          <span>{resource.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye size={12} />
                          <span>{resource.views.toLocaleString()}</span>
                        </div>
                        {resource.duration && (
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{resource.duration}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs border ${getDifficultyColor(resource.difficulty)}`}>
                          {resource.difficulty}
                        </span>
                        {resource.downloadUrl && (
                          <Button
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(resource);
                            }}
                            className="p-2"
                          >
                            <Download size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* All Resources */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">All Resources</h2>
          <div className="space-y-4">
            {filteredResources.map((resource, index) => (
              <Card
                key={resource.id}
                className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.01] dark:bg-gray-800 dark:border-gray-700 animate-slide-up group"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleResourceClick(resource)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center flex-shrink-0">
                    {getTypeIcon(resource.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-medium text-gray-800 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                        {resource.title}
                      </h3>
                      <div className="flex items-center gap-2 ml-2">
                        <div className="flex items-center gap-1 text-sm">
                          <Star size={14} className="text-yellow-500" />
                          <span className="text-gray-600 dark:text-gray-400">{resource.rating}</span>
                        </div>
                        {resource.downloadUrl && (
                          <Button
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(resource);
                            }}
                            className="p-1"
                          >
                            <Download size={12} />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
                      {resource.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>By {resource.author}</span>
                        <span>{resource.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs border ${getDifficultyColor(resource.difficulty)}`}>
                          {resource.difficulty}
                        </span>
                        {resource.free ? (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Free</span>
                        ) : (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Premium</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredResources.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No resources found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourcesPage;