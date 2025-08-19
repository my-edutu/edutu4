import React from 'react';
import { 
  Sparkles, 
  Target, 
  TrendingUp, 
  Users, 
  Brain, 
  Award, 
  BookOpen, 
  Bell,
  ArrowRight,
  CheckCircle,
  Zap,
  Globe,
  Heart,
  Moon,
  Sun
} from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useDarkMode } from '../hooks/useDarkMode';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const features = [
    {
      icon: <Brain size={28} className="text-primary" />,
      title: "AI-Powered Coaching",
      description: "Smart recommendations tailored to your unique goals, skills, and circumstances"
    },
    {
      icon: <Target size={28} className="text-accent" />,
      title: "Personalized Roadmaps",
      description: "Step-by-step plans that guide you from where you are to where you want to be"
    },
    {
      icon: <Award size={28} className="text-green-600" />,
      title: "Opportunity Discovery",
      description: "Access curated scholarships, jobs, and fellowships that match your profile"
    },
    {
      icon: <BookOpen size={28} className="text-purple-600" />,
      title: "Skill Development",
      description: "Course recommendations and learning paths to build in-demand skills"
    },
    {
      icon: <Bell size={28} className="text-red-500" />,
      title: "Smart Notifications",
      description: "Never miss deadlines with intelligent reminders and opportunity alerts"
    },
    {
      icon: <Users size={28} className="text-blue-600" />,
      title: "Community Support",
      description: "Connect with peers and mentors on similar journeys to success"
    }
  ];

  const benefits = [
    "Improve your CV, SOPs, and LinkedIn profile",
    "Stay accountable with progress reminders",
    "Access curated opportunities based on your skills",
    "Get actionable learning paths for career transitions",
    "Receive automatic alerts for matching opportunities",
    "Build a strong professional network"
  ];

  const testimonials = [
    {
      name: "Amara K.",
      role: "Mastercard Scholar",
      quote: "Edutu helped me navigate the complex scholarship application process. The roadmap was a game-changer!",
      avatar: "👩🏾‍🎓"
    },
    {
      name: "Kwame A.",
      role: "Software Engineer",
      quote: "From zero coding experience to landing my first tech job - Edutu's learning path made it possible.",
      avatar: "👨🏿‍💻"
    },
    {
      name: "Fatima M.",
      role: "Young Leader",
      quote: "The AI coach understood my goals better than I did. Now I'm part of One Young World!",
      avatar: "👩🏽‍💼"
    }
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-yellow-50'}`}>
        {/* Dark Mode Toggle */}
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={toggleDarkMode}
            className={`w-12 h-12 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 border`}
          >
            {isDarkMode ? (
              <Sun size={20} className="text-yellow-500" />
            ) : (
              <Moon size={20} className="text-gray-600" />
            )}
          </button>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className={`absolute inset-0 ${isDarkMode ? 'bg-gradient-to-r from-primary/5 to-accent/5' : 'bg-gradient-to-r from-primary/10 to-accent/10'}`}></div>
          <div className="relative px-4 py-16 text-center max-w-6xl mx-auto">
            <div className="animate-fade-in">
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center animate-bounce-subtle">
                  <Sparkles size={24} className="text-white" />
                </div>
                <h1 className={`text-4xl md:text-6xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  Edu<span className="text-primary">tu</span>
                </h1>
              </div>
              
              <h2 className={`text-2xl md:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-6 leading-tight`}>
                Your AI-Powered Growth Coach for 
                <span className="text-primary"> Ambitious African Youth</span>
              </h2>
              
              <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} max-w-3xl mx-auto mb-8 leading-relaxed`}>
                Discover scholarships, build skills, and unlock opportunities with personalized roadmaps 
                that guide you from where you are to where you want to be.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Button 
                  onClick={onGetStarted} 
                  size="lg" 
                  className="animate-pulse-glow flex items-center gap-2 text-lg px-8 py-4 font-semibold shadow-lg hover:shadow-xl"
                >
                  Get Started Free
                  <ArrowRight size={20} />
                </Button>
                <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm">No credit card required</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
                <div className="text-center animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <div className="text-3xl font-bold text-primary mb-2">10K+</div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Opportunities Discovered</div>
                </div>
                <div className="text-center animate-slide-up" style={{ animationDelay: '400ms' }}>
                  <div className="text-3xl font-bold text-accent mb-2">95%</div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Success Rate</div>
                </div>
                <div className="text-center animate-slide-up" style={{ animationDelay: '600ms' }}>
                  <div className="text-3xl font-bold text-green-600 mb-2">50+</div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Countries Supported</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className={`py-20 px-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h3 className={`text-3xl md:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
                Everything You Need to <span className="text-primary">Succeed</span>
              </h3>
              <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
                Edutu is not just a platform. It's your strategic partner — always a few steps ahead.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className={`text-center hover:shadow-xl transition-all transform hover:scale-105 animate-slide-up ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`w-16 h-16 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    {feature.icon}
                  </div>
                  <h4 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-3`}>{feature.title}</h4>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className={`py-20 px-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h3 className={`text-3xl md:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
                How Edutu <span className="text-primary">Works</span>
              </h3>
              <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Your journey to success in three simple steps
              </p>
            </div>

            <div className="space-y-12">
              <div className="flex flex-col md:flex-row items-center gap-8 animate-slide-up">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  1
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-3`}>Tell Us Your Goals</h4>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-lg`}>
                    Share your aspirations, current situation, and what success looks like to you. 
                    Our AI understands your unique journey.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row-reverse items-center gap-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  2
                </div>
                <div className="flex-1 text-center md:text-right">
                  <h4 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-3`}>Get Your Roadmap</h4>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-lg`}>
                    Receive a personalized, step-by-step plan with deadlines, milestones, 
                    and resources tailored to your goals.
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8 animate-slide-up" style={{ animationDelay: '400ms' }}>
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  3
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-3`}>Achieve Success</h4>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} text-lg`}>
                    Follow your roadmap, get reminders, discover opportunities, 
                    and celebrate milestones as you reach your goals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className={`py-20 px-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h3 className={`text-3xl md:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
                What You'll <span className="text-primary">Achieve</span>
              </h3>
              <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Join thousands of young Africans who've transformed their futures with Edutu
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-4 p-4 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'} rounded-2xl shadow-sm animate-slide-up border`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={16} className="text-green-600" />
                  </div>
                  <p className={`${isDarkMode ? 'text-white' : 'text-gray-800'} font-medium`}>{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className={`py-20 px-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h3 className={`text-3xl md:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
                Success <span className="text-primary">Stories</span>
              </h3>
              <p className={`text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Real results from real people
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card 
                  key={index} 
                  className={`text-center animate-slide-up ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <div className="text-4xl mb-4">{testimonial.avatar}</div>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 italic`}>"{testimonial.quote}"</p>
                  <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{testimonial.name}</div>
                  <div className="text-sm text-primary">{testimonial.role}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 px-4 bg-gradient-to-r from-primary to-accent">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to Transform Your Future?
              </h3>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join thousands of ambitious young Africans who are already using Edutu 
                to discover opportunities and achieve their dreams.
              </p>
              
              <button 
                onClick={onGetStarted}
                className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-4 font-semibold shadow-lg hover:shadow-xl rounded-2xl transition-all transform hover:scale-105 active:scale-95 inline-flex items-center gap-2"
              >
                Start Your Journey Today
                <Zap size={20} />
              </button>
              
              <div className="flex items-center justify-center gap-6 mt-8 text-white/80">
                <div className="flex items-center gap-2">
                  <Globe size={16} />
                  <span className="text-sm">Available across Africa</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart size={16} />
                  <span className="text-sm">Built by Africans, for Africans</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`py-8 px-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-900'} text-center`}>
          <div className="text-gray-400 text-sm">
            <p>© 2024 Edutu. Empowering African youth since 2024.</p>
            <p className="mt-2">Made with ❤️ for ambitious dreamers</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;