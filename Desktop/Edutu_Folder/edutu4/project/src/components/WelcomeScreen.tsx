import React, { useState } from 'react';
import { Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';

interface WelcomeScreenProps {
  onGetStarted: (userData: { name: string; age: number }) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else if (step === 2 && name && age) {
      onGetStarted({ name, age: parseInt(age) });
    }
  };

  const features = [
    {
      icon: <Sparkles size={24} />,
      title: "AI-Powered Coaching",
      description: "Get personalized guidance tailored to your unique goals and circumstances"
    },
    {
      icon: <Target size={24} />,
      title: "Opportunity Discovery",
      description: "Uncover hidden opportunities in education, career, and personal growth"
    },
    {
      icon: <TrendingUp size={24} />,
      title: "Progress Tracking",
      description: "Watch your growth with clear milestones and achievement celebrations"
    },
    {
      icon: <Users size={24} />,
      title: "Community Support",
      description: "Connect with peers and mentors who share your journey"
    }
  ];

  return (
    <div className="min-h-screen p-4 flex flex-col">
      {step === 0 && (
        <div className="animate-fade-in">
          <div className="text-center mb-8 pt-12">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-subtle">
              <Sparkles size={32} className="text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              Welcome to <span className="text-primary">Edutu</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Your AI-powered opportunity coach designed specifically for ambitious African youth
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
            {features.map((feature, index) => (
              <Card key={index} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="text-primary mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button onClick={handleNext} size="lg" className="animate-pulse-glow">
              Start Your Journey
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="animate-fade-in flex-1 flex flex-col justify-center max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Let's get to know you! 👋
            </h2>
            <p className="text-gray-600">
              We'll personalize your experience based on your information
            </p>
          </div>

          <Card className="mb-8">
            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                What's your first name?
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Enter your name"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                How old are you?
              </label>
              <input
                type="number"
                id="age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="16"
                max="30"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Your age"
              />
            </div>
          </Card>

          <div className="flex gap-4">
            <Button variant="secondary" onClick={() => setStep(0)} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={handleNext} 
              className="flex-1" 
              disabled={!name || !age}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-in flex-1 flex flex-col justify-center max-w-lg mx-auto text-center">
          <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-subtle">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Great to meet you, {name}!
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            You're about to embark on an exciting journey of growth and discovery. 
            Let's unlock your potential together!
          </p>
          
          <Button onClick={handleNext} size="lg" className="animate-pulse-glow">
            Enter Edutu
          </Button>
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;