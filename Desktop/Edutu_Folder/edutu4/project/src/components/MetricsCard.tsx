import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

interface MetricsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  suffix?: string;
  isLoading?: boolean;
  onClick?: () => void;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
    period: string;
  };
  showProgress?: boolean;
  maxValue?: number;
  animationDelay?: number;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  suffix = '',
  isLoading = false,
  onClick,
  trend,
  showProgress = false,
  maxValue = 100,
  animationDelay = 0
}) => {
  const { isDarkMode } = useDarkMode();
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const numericValue = typeof value === 'number' ? value : parseInt(value.toString()) || 0;

  // Color configurations
  const colorConfig = {
    blue: {
      bg: isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      text: 'text-blue-700 dark:text-blue-300',
      hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
      progress: 'from-blue-400 to-blue-600',
      glow: 'shadow-blue-500/20'
    },
    green: {
      bg: isDarkMode ? 'bg-green-900/20' : 'bg-green-50', 
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      text: 'text-green-700 dark:text-green-300',
      hover: 'hover:bg-green-100 dark:hover:bg-green-900/30',
      progress: 'from-green-400 to-green-600',
      glow: 'shadow-green-500/20'
    },
    yellow: {
      bg: isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-50',
      border: 'border-yellow-200 dark:border-yellow-800', 
      icon: 'text-yellow-600 dark:text-yellow-400',
      text: 'text-yellow-700 dark:text-yellow-300',
      hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30',
      progress: 'from-yellow-400 to-yellow-600',
      glow: 'shadow-yellow-500/20'
    },
    purple: {
      bg: isDarkMode ? 'bg-purple-900/20' : 'bg-purple-50',
      border: 'border-purple-200 dark:border-purple-800',
      icon: 'text-purple-600 dark:text-purple-400', 
      text: 'text-purple-700 dark:text-purple-300',
      hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/30',
      progress: 'from-purple-400 to-purple-600',
      glow: 'shadow-purple-500/20'
    }
  };

  const config = colorConfig[color];

  // Animated counter effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      
      if (numericValue === 0) {
        setDisplayValue(0);
        return;
      }

      let current = 0;
      const increment = numericValue / 30; // 30 frames for smooth animation
      const duration = 1000; // 1 second
      const frameTime = duration / 30;

      const counter = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
          setDisplayValue(numericValue);
          clearInterval(counter);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, frameTime);

      return () => clearInterval(counter);
    }, animationDelay);

    return () => clearTimeout(timer);
  }, [numericValue, animationDelay]);

  const progressPercentage = showProgress ? (numericValue / maxValue) * 100 : 0;

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer
        ${config.bg} ${config.border} ${onClick ? config.hover : ''} 
        ${isVisible ? 'animate-slide-up' : 'opacity-0 translate-y-4'}
        ${onClick ? 'hover:scale-105 hover:shadow-lg ' + config.glow : ''}
        ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'}
        backdrop-blur-sm
      `}
      onClick={onClick}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-current to-transparent"></div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-10">
          <div className={`w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin ${config.icon}`}></div>
        </div>
      )}

      <div className="relative p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          {/* Icon */}
          <div className={`
            p-3 rounded-xl transition-transform duration-300 
            ${config.bg} ${config.border} border
            ${isVisible ? 'scale-100' : 'scale-75'}
          `}>
            <Icon size={24} className={`${config.icon} transition-colors duration-300`} />
          </div>

          {/* Trend Indicator */}
          {trend && (
            <div className={`
              flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium
              ${trend.direction === 'up' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : ''}
              ${trend.direction === 'down' ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : ''}
              ${trend.direction === 'neutral' ? 'text-gray-600 bg-gray-50 dark:bg-gray-900/20' : ''}
            `}>
              <span>{trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'}</span>
              <span>{trend.percentage}%</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-2">
          <div className={`
            text-3xl sm:text-4xl font-bold transition-all duration-500
            ${config.text} ${isDarkMode ? 'text-white' : 'text-gray-900'}
          `}>
            {isVisible ? displayValue : 0}{suffix}
          </div>
          
          {/* Progress Bar for percentage values */}
          {showProgress && (
            <div className="mt-3 mb-2">
              <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                <div
                  className={`
                    h-full bg-gradient-to-r ${config.progress} rounded-full
                    transition-all duration-1000 ease-out relative
                  `}
                  style={{ 
                    width: isVisible ? `${Math.min(progressPercentage, 100)}%` : '0%',
                    transitionDelay: `${animationDelay + 500}ms`
                  }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <div className={`
          text-sm sm:text-base font-medium transition-colors duration-300
          ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}
        `}>
          {title}
        </div>

        {/* Trend Period */}
        {trend && (
          <div className={`
            text-xs mt-1 transition-colors duration-300
            ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}
          `}>
            vs {trend.period}
          </div>
        )}

        {/* Hover Effect Overlay */}
        {onClick && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        )}
      </div>

      {/* Pulse Animation for Active Metrics */}
      {numericValue > 0 && isVisible && (
        <div className={`
          absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse
          ${config.icon.includes('blue') ? 'bg-blue-500' : ''}
          ${config.icon.includes('green') ? 'bg-green-500' : ''}
          ${config.icon.includes('yellow') ? 'bg-yellow-500' : ''}
          ${config.icon.includes('purple') ? 'bg-purple-500' : ''}
        `}></div>
      )}
    </div>
  );
};

export default MetricsCard;