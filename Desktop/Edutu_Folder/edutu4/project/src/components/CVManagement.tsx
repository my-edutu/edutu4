import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Download, 
  Star, 
  CheckCircle, 
  AlertCircle, 
  Zap,
  Eye,
  Edit,
  Plus,
  BarChart3,
  Camera,
  Loader2,
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';

interface CVManagementProps {
  onBack: () => void;
}

const CVManagement: React.FC<CVManagementProps> = ({ onBack }) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'upload' | 'optimize' | 'ats' | 'generate'>('overview');
  const [uploadedCV, setUploadedCV] = useState<File | null>(null);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const { isDarkMode } = useDarkMode();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    scrollToTop();
    onBack();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedCV(file);
      setIsAnalyzing(true);
      setAnalysisComplete(false);
      
      // Simulate analysis process
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisComplete(true);
        setAtsScore(Math.floor(Math.random() * 30) + 70);
      }, 3000);
    }
  };

  const handleCameraUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setUploadedCV(new File([file], 'scanned-cv.pdf', { type: 'application/pdf' }));
        setIsAnalyzing(true);
        setAnalysisComplete(false);
        
        setTimeout(() => {
          setIsAnalyzing(false);
          setAnalysisComplete(true);
          setAtsScore(Math.floor(Math.random() * 30) + 70);
        }, 4000);
      }
    };
    input.click();
  };

  const handleOptimizeCV = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAtsScore(Math.min(100, (atsScore || 75) + Math.floor(Math.random() * 15) + 5));
    }, 2500);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle size={20} className="text-green-600 dark:text-green-400" />;
    if (score >= 75) return <AlertCircle size={20} className="text-yellow-600 dark:text-yellow-400" />;
    return <AlertCircle size={20} className="text-red-600 dark:text-red-400" />;
  };

  const capabilities = [
    {
      id: 'upload',
      title: 'Smart Upload & Scan',
      description: 'Upload your existing CV or scan a physical copy using your camera. Our AI instantly processes and digitizes your document.',
      icon: <Upload size={24} className="text-blue-600" />,
      features: ['PDF, DOC, DOCX support', 'Camera scanning', 'Instant processing', 'Format conversion']
    },
    {
      id: 'optimize',
      title: 'AI-Powered Optimization',
      description: 'Transform your CV with intelligent suggestions. Our AI analyzes content, structure, and keywords to maximize your impact.',
      icon: <Zap size={24} className="text-purple-600" />,
      features: ['Content enhancement', 'Keyword optimization', 'Structure improvement', 'Industry-specific tips']
    },
    {
      id: 'ats',
      title: 'ATS Compatibility Check',
      description: 'Ensure your CV passes through Applicant Tracking Systems. Get detailed scoring and actionable recommendations.',
      icon: <BarChart3 size={24} className="text-green-600" />,
      features: ['ATS scoring', 'Format analysis', 'Keyword density', 'Compatibility report']
    },
    {
      id: 'generate',
      title: 'Professional CV Builder',
      description: 'Create stunning CVs from scratch with our guided builder. Choose from professional templates designed for success.',
      icon: <Plus size={24} className="text-orange-600" />,
      features: ['Professional templates', 'Guided creation', 'Real-time preview', 'Export options']
    }
  ];

  const optimizationSuggestions = [
    {
      type: 'critical',
      title: 'Add Keywords',
      description: 'Include more industry-specific keywords to improve ATS compatibility',
      impact: '+8 points'
    },
    {
      type: 'important',
      title: 'Format Consistency',
      description: 'Use consistent formatting for dates and bullet points',
      impact: '+5 points'
    },
    {
      type: 'minor',
      title: 'Contact Information',
      description: 'Add LinkedIn profile and portfolio links',
      impact: '+3 points'
    }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header */}
      <Card className="dark:bg-gray-800 dark:border-gray-700 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">CV Management Hub</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Transform your CV into a powerful tool that opens doors to opportunities. Our AI-powered platform 
          helps you create, optimize, and perfect your professional profile.
        </p>
      </Card>

      {/* Capabilities Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {capabilities.map((capability, index) => (
          <Card
            key={capability.id}
            className="cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.02] dark:bg-gray-800 dark:border-gray-700 animate-slide-up group"
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => setActiveSection(capability.id as any)}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                {capability.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 group-hover:text-primary transition-colors">
                  {capability.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">
                  {capability.description}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              {capability.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">Get Started</span>
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center dark:bg-gray-800 dark:border-gray-700">
          <div className="text-2xl font-bold text-primary mb-1">98%</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
        </Card>
        <Card className="text-center dark:bg-gray-800 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 mb-1">50K+</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">CVs Enhanced</div>
        </Card>
        <Card className="text-center dark:bg-gray-800 dark:border-gray-700">
          <div className="text-2xl font-bold text-purple-600 mb-1">24/7</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">AI Support</div>
        </Card>
      </div>
    </div>
  );

  const renderUploadSection = () => (
    <div className="space-y-4 sm:space-y-6">
      <Card className="card-bg p-4 sm:p-6">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Upload size={24} className="sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-primary mb-2">Upload Your CV</h3>
          <p className="text-sm sm:text-base text-secondary mb-4 sm:mb-6 leading-relaxed">
            Upload your current CV to get started with optimization and ATS scoring
          </p>
          
          <div className="space-y-3 sm:space-y-4">
            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 hover:border-primary dark:hover:border-primary transition-all hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="cv-upload"
                aria-describedby="upload-description"
              />
              <label
                htmlFor="cv-upload"
                className="cursor-pointer flex flex-col items-center gap-3 sm:gap-4 btn-touch"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    document.getElementById('cv-upload')?.click();
                  }
                }}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 dark:bg-gray-700 rounded-xl sm:rounded-2xl flex items-center justify-center">
                  <FileText size={20} className="sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-primary text-sm sm:text-base mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p id="upload-description" className="text-xs sm:text-sm text-secondary">
                    PDF, DOC, or DOCX (max 5MB)
                  </p>
                </div>
              </label>
            </div>

            {/* Camera Upload */}
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Or</p>
              <Button
                onClick={handleCameraUpload}
                variant="secondary"
                className="inline-flex items-center gap-2"
              >
                <Camera size={16} />
                Scan with Camera
              </Button>
            </div>
          </div>

          {/* Analysis Loading */}
          {isAnalyzing && (
            <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Loader2 size={24} className="text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="font-medium text-blue-800 dark:text-blue-300">Analyzing your CV...</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                This may take a few moments while we process your document
              </p>
            </div>
          )}

          {/* Upload Success */}
          {uploadedCV && analysisComplete && !isAnalyzing && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                <div className="flex-1 text-left">
                  <p className="font-medium text-green-800 dark:text-green-300">{uploadedCV.name}</p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {(uploadedCV.size / 1024 / 1024).toFixed(2)} MB • Analysis complete
                  </p>
                </div>
                <Button variant="secondary" className="px-4 py-2">
                  <Eye size={16} className="mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {uploadedCV && analysisComplete && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Next Steps</h3>
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={() => setActiveSection('ats')}
              className="flex items-center justify-center gap-2"
            >
              <BarChart3 size={16} />
              Check ATS Score
            </Button>
            <Button 
              variant="secondary"
              onClick={() => setActiveSection('optimize')}
              className="flex items-center justify-center gap-2"
            >
              <Zap size={16} />
              Optimize CV
            </Button>
          </div>
        </Card>
      )}
    </div>
  );

  const renderOptimizeSection = () => (
    <div className="space-y-6">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={32} className="text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">CV Optimization</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Get AI-powered suggestions to improve your CV and increase your chances of success
          </p>
        </div>

        {uploadedCV ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-3">
                <FileText size={20} className="text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-800 dark:text-blue-300">{uploadedCV.name}</span>
              </div>
              {isAnalyzing ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="text-blue-600 dark:text-blue-400 animate-spin" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">Optimizing...</span>
                </div>
              ) : (
                <Button onClick={handleOptimizeCV} className="w-full">
                  <Zap size={16} className="mr-2" />
                  Optimize My CV
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 dark:text-white">Optimization Suggestions</h4>
              {optimizationSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 dark:border-gray-600 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      suggestion.type === 'critical' ? 'bg-red-500' :
                      suggestion.type === 'important' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-medium text-gray-800 dark:text-white">{suggestion.title}</h5>
                        <span className="text-sm text-primary font-medium">{suggestion.impact}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{suggestion.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">Upload a CV first to get optimization suggestions</p>
            <Button onClick={() => setActiveSection('upload')} variant="secondary">
              <Upload size={16} className="mr-2" />
              Upload CV
            </Button>
          </div>
        )}
      </Card>
    </div>
  );

  const renderATSSection = () => (
    <div className="space-y-6">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={32} className="text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">ATS Compatibility Score</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Check how well your CV performs with Applicant Tracking Systems
          </p>

          {isAnalyzing ? (
            <div className="text-center py-8">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">Analyzing</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Please wait</div>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400">Analyzing your CV for ATS compatibility...</p>
            </div>
          ) : atsScore !== null ? (
            <div className="space-y-6">
              <div className="relative">
                <div className="w-32 h-32 mx-auto">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - atsScore / 100)}`}
                      className={getScoreColor(atsScore)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getScoreColor(atsScore)}`}>{atsScore}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">/ 100</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                {getScoreIcon(atsScore)}
                <span className={`font-medium ${getScoreColor(atsScore)}`}>
                  {atsScore >= 90 ? 'Excellent' : atsScore >= 75 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                  <div className="font-semibold text-gray-800 dark:text-white">Keywords</div>
                  <div className="text-gray-600 dark:text-gray-400">85%</div>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-2xl">
                  <div className="font-semibold text-gray-800 dark:text-white">Format</div>
                  <div className="text-gray-600 dark:text-gray-400">92%</div>
                </div>
              </div>

              <Button onClick={() => setActiveSection('optimize')} className="w-full">
                <Zap size={16} className="mr-2" />
                Improve Score
              </Button>
            </div>
          ) : uploadedCV ? (
            <div className="text-center py-8">
              <Button onClick={() => {
                setIsAnalyzing(true);
                setTimeout(() => {
                  setIsAnalyzing(false);
                  setAtsScore(Math.floor(Math.random() * 30) + 70);
                }, 3000);
              }} className="inline-flex items-center gap-2">
                <BarChart3 size={16} />
                Analyze ATS Score
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Upload a CV to get your ATS score</p>
              <Button onClick={() => setActiveSection('upload')} variant="secondary">
                <Upload size={16} className="mr-2" />
                Upload CV
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  const renderGenerateSection = () => (
    <div className="space-y-6">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus size={32} className="text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Generate New CV</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Create a professional CV from scratch with AI assistance and premium templates
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 border border-gray-200 dark:border-gray-600 hover:border-primary dark:hover:border-primary transition-all cursor-pointer group">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">Professional Template</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Clean, modern design for corporate roles</p>
              </div>
            </Card>

            <Card className="p-4 border border-gray-200 dark:border-gray-600 hover:border-primary dark:hover:border-primary transition-all cursor-pointer group">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Star size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">Creative Template</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Eye-catching design for creative fields</p>
              </div>
            </Card>
          </div>

          <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-2xl border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles size={20} className="text-orange-600 dark:text-orange-400" />
              <h4 className="font-medium text-orange-800 dark:text-orange-300">AI-Powered CV Builder</h4>
            </div>
            <p className="text-sm text-orange-700 dark:text-orange-400 mb-4">
              Answer a few questions and our AI will generate a professional CV tailored to your experience and goals
            </p>
            <Button className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600">
              <Plus size={16} className="mr-2" />
              Start AI Builder
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className={`min-h-screen surface-bg animate-fade-in ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="background-bg sticky top-0 z-10 shadow-sm safe-area-top" role="banner">
        <div className="safe-area-x px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Button
              variant="secondary"
              onClick={handleBack}
              className="btn-touch p-2 sm:p-3 flex-shrink-0"
              aria-label="Go back to dashboard"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary mb-1 truncate">
                CV Management
              </h1>
              <p className="text-xs sm:text-sm text-secondary truncate">
                Professional CV tools powered by AI
              </p>
            </div>
            <div className="flex-shrink-0">
              <FileText size={20} className="sm:w-6 sm:h-6 text-primary" aria-hidden="true" />
            </div>
          </div>

          {/* Navigation Buttons */}
          {activeSection !== 'overview' && (
            <nav className="flex gap-2 overflow-x-auto pb-2 -mx-1" role="navigation" aria-label="CV management sections">
              <Button
                onClick={() => setActiveSection('overview')}
                variant="secondary"
                size="sm"
                icon={<ArrowLeft size={14} />}
                aria-label="Return to overview"
              >
                Overview
              </Button>
            </nav>
          )}
        </div>
      </header>

      <main className="safe-area-x px-3 sm:px-4 py-4 sm:py-6" role="main">
        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'upload' && renderUploadSection()}
        {activeSection === 'optimize' && renderOptimizeSection()}
        {activeSection === 'ats' && renderATSSection()}
        {activeSection === 'generate' && renderGenerateSection()}
      </main>
    </div>
  );
};

export default CVManagement;