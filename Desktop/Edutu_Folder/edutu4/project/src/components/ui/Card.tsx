import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
  interactive?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  style, 
  onClick,
  variant = 'default',
  padding = 'md',
  hoverable = false,
  interactive = false,
  role,
  tabIndex,
  onKeyDown,
  ...props
}) => {
  const baseClasses = 'background-bg rounded-xl sm:rounded-2xl transition-all duration-200';
  
  const variantClasses = {
    default: 'shadow-sm border border-gray-200 dark:border-gray-700',
    elevated: 'shadow-md hover:shadow-lg',
    outlined: 'border-2 border-gray-200 dark:border-gray-700',
    flat: 'border-none shadow-none'
  };
  
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
    xl: 'p-8 sm:p-10'
  };
  
  const interactiveClasses = (onClick || interactive) 
    ? 'cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 touch-manipulation'
    : '';
    
  const hoverClasses = hoverable 
    ? 'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
    : '';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${interactiveClasses} ${hoverClasses} ${className}`}
      style={style}
      onClick={onClick}
      role={onClick ? (role || 'button') : role}
      tabIndex={onClick && !tabIndex ? 0 : tabIndex}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;

// Additional Card variants for specific use cases
export const InteractiveCard: React.FC<Omit<CardProps, 'interactive'>> = (props) => (
  <Card {...props} interactive hoverable />
);

export const ElevatedCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card {...props} variant="elevated" />
);