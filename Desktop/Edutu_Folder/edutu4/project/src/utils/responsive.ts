/**
 * Responsive Design Utilities for Edutu
 * Standardized breakpoints, layouts, and responsive design patterns
 */

// Tailwind CSS breakpoints (mobile-first approach)
export const breakpoints = {
  sm: '640px',   // Small devices (landscape phones, 640px and up)
  md: '768px',   // Medium devices (tablets, 768px and up)
  lg: '1024px',  // Large devices (desktops, 1024px and up)
  xl: '1280px',  // Extra large devices (large desktops, 1280px and up)
  '2xl': '1536px' // 2X Extra large devices (larger desktops, 1536px and up)
};

// Common responsive class patterns
export const responsivePatterns = {
  // Grid layouts
  grid: {
    // Auto-fit columns with minimum width
    autoFit: (minWidth: string = '280px') => `grid-cols-[repeat(auto-fit,minmax(${minWidth},1fr))]`,
    
    // Responsive columns
    cols: {
      mobile1Desktop2: 'grid-cols-1 md:grid-cols-2',
      mobile1Desktop3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      mobile1Desktop4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      mobile2Desktop4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
      mobile2Desktop6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
    }
  },
  
  // Flexbox layouts
  flex: {
    // Stack on mobile, row on desktop
    mobileStackDesktopRow: 'flex flex-col md:flex-row',
    // Center on mobile, justify between on desktop
    mobileCenterDesktopBetween: 'flex flex-col items-center md:flex-row md:justify-between',
    // Wrap items responsively
    wrapResponsive: 'flex flex-wrap gap-2 sm:gap-4'
  },
  
  // Spacing
  spacing: {
    // Container padding
    containerPx: 'px-4 sm:px-6 lg:px-8',
    containerPy: 'py-4 sm:py-6 lg:py-8',
    container: 'px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8',
    
    // Section spacing
    sectionGap: 'space-y-4 sm:space-y-6 lg:space-y-8',
    cardGap: 'gap-4 sm:gap-6',
    
    // Component margins
    componentMb: 'mb-4 sm:mb-6 lg:mb-8',
    componentMt: 'mt-4 sm:mt-6 lg:mt-8'
  },
  
  // Typography
  typography: {
    // Responsive headings
    h1: 'text-2xl sm:text-3xl lg:text-4xl xl:text-5xl',
    h2: 'text-xl sm:text-2xl lg:text-3xl',
    h3: 'text-lg sm:text-xl lg:text-2xl',
    h4: 'text-base sm:text-lg lg:text-xl',
    
    // Body text
    body: 'text-sm sm:text-base',
    bodyLarge: 'text-base sm:text-lg',
    caption: 'text-xs sm:text-sm'
  },
  
  // Component sizes
  sizes: {
    // Buttons
    button: {
      sm: 'px-3 py-1.5 text-sm sm:px-4 sm:py-2',
      md: 'px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base',
      lg: 'px-6 py-3 text-base sm:px-8 sm:py-4 sm:text-lg'
    },
    
    // Cards
    card: {
      padding: 'p-4 sm:p-6',
      rounded: 'rounded-lg sm:rounded-xl'
    },
    
    // Forms
    input: {
      padding: 'px-3 py-2 sm:px-4 sm:py-3',
      text: 'text-sm sm:text-base'
    }
  },
  
  // Layout widths
  width: {
    // Container max widths
    container: 'max-w-7xl mx-auto',
    content: 'max-w-4xl mx-auto',
    narrow: 'max-w-2xl mx-auto',
    wide: 'max-w-full',
    
    // Component widths
    full: 'w-full',
    auto: 'w-auto',
    fit: 'w-fit'
  }
};

// Responsive component generators
export const createResponsiveClasses = {
  // Create responsive padding
  padding: (mobile: string, desktop?: string) => 
    desktop ? `${mobile} md:${desktop}` : mobile,
  
  // Create responsive margin
  margin: (mobile: string, desktop?: string) => 
    desktop ? `${mobile} md:${desktop}` : mobile,
  
  // Create responsive text size
  textSize: (mobile: string, tablet?: string, desktop?: string) => {
    let classes = mobile;
    if (tablet) classes += ` sm:${tablet}`;
    if (desktop) classes += ` lg:${desktop}`;
    return classes;
  },
  
  // Create responsive grid
  grid: (mobile: number, tablet?: number, desktop?: number) => {
    let classes = `grid-cols-${mobile}`;
    if (tablet) classes += ` sm:grid-cols-${tablet}`;
    if (desktop) classes += ` lg:grid-cols-${desktop}`;
    return classes;
  }
};

// Media query hooks for JavaScript
export const mediaQueries = {
  // Check if screen is mobile
  isMobile: () => window.matchMedia(`(max-width: ${breakpoints.sm})`).matches,
  
  // Check if screen is tablet
  isTablet: () => window.matchMedia(`(min-width: ${breakpoints.sm}) and (max-width: ${breakpoints.lg})`).matches,
  
  // Check if screen is desktop
  isDesktop: () => window.matchMedia(`(min-width: ${breakpoints.lg})`).matches,
  
  // Check if screen supports hover
  canHover: () => window.matchMedia('(hover: hover)').matches,
  
  // Check if user prefers reduced motion
  prefersReducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
};

// Responsive image utility
export const responsiveImage = {
  // Generate srcSet for responsive images
  generateSrcSet: (baseUrl: string, sizes: number[]) => 
    sizes.map(size => `${baseUrl}?w=${size} ${size}w`).join(', '),
  
  // Common image sizes
  sizes: {
    avatar: [40, 80, 120],
    card: [300, 600, 900],
    hero: [800, 1200, 1600, 2000],
    thumbnail: [150, 300, 450]
  },
  
  // Responsive image classes
  classes: {
    avatar: 'w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12',
    cardImage: 'w-full h-32 sm:h-40 lg:h-48',
    heroImage: 'w-full h-48 sm:h-64 lg:h-96'
  }
};

// Touch and gesture utilities
export const touchUtils = {
  // Touch-friendly tap targets (minimum 44px)
  tapTarget: 'min-h-[44px] min-w-[44px]',
  
  // Touch-friendly interactive elements
  interactive: 'select-none touch-manipulation',
  
  // Prevent text selection during gestures
  noSelect: 'select-none',
  
  // Enable smooth scrolling
  smoothScroll: 'scroll-smooth'
};

// Accessibility utilities
export const a11yUtils = {
  // Screen reader only content
  srOnly: 'sr-only',
  
  // Focus visible styles
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  
  // High contrast mode support
  highContrast: 'contrast-more:border-2 contrast-more:border-black dark:contrast-more:border-white',
  
  // Reduced motion support
  respectMotion: 'motion-reduce:animate-none motion-reduce:transition-none'
};

// Performance utilities
export const performanceUtils = {
  // GPU acceleration for animations
  gpuAcceleration: 'transform-gpu',
  
  // Optimize repaints
  willChange: {
    transform: 'will-change-transform',
    scroll: 'will-change-scroll',
    auto: 'will-change-auto'
  },
  
  // Lazy loading
  lazy: 'loading-lazy',
  
  // Content visibility
  contentVisibility: {
    auto: 'content-visibility-auto',
    hidden: 'content-visibility-hidden',
    visible: 'content-visibility-visible'
  }
};

// Dark mode utilities
export const darkModeUtils = {
  // Background colors
  bg: {
    primary: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800',
    tertiary: 'bg-gray-100 dark:bg-gray-700'
  },
  
  // Text colors
  text: {
    primary: 'text-gray-900 dark:text-white',
    secondary: 'text-gray-600 dark:text-gray-300',
    tertiary: 'text-gray-500 dark:text-gray-400'
  },
  
  // Border colors
  border: {
    primary: 'border-gray-200 dark:border-gray-700',
    secondary: 'border-gray-300 dark:border-gray-600'
  }
};

// Export utility function to combine classes
export const cn = (...classes: (string | undefined | null | false)[]) => 
  classes.filter(Boolean).join(' ');

// Export commonly used patterns
export const commonPatterns = {
  // Card layout
  card: cn(
    responsivePatterns.sizes.card.padding,
    responsivePatterns.sizes.card.rounded,
    darkModeUtils.bg.primary,
    darkModeUtils.border.primary,
    'border',
    'shadow-sm hover:shadow-md transition-shadow duration-200'
  ),
  
  // Page container
  pageContainer: cn(
    responsivePatterns.width.container,
    responsivePatterns.spacing.container
  ),
  
  // Content container
  contentContainer: cn(
    responsivePatterns.width.content,
    responsivePatterns.spacing.container
  ),
  
  // Button base styles
  buttonBase: cn(
    responsivePatterns.sizes.button.md,
    'rounded-lg font-medium transition-all duration-200',
    touchUtils.tapTarget,
    touchUtils.interactive,
    a11yUtils.focusVisible
  ),
  
  // Input base styles
  inputBase: cn(
    responsivePatterns.sizes.input.padding,
    responsivePatterns.sizes.input.text,
    'rounded-lg border transition-colors duration-200',
    darkModeUtils.bg.primary,
    darkModeUtils.text.primary,
    darkModeUtils.border.primary,
    a11yUtils.focusVisible
  )
};

export default {
  breakpoints,
  responsivePatterns,
  createResponsiveClasses,
  mediaQueries,
  responsiveImage,
  touchUtils,
  a11yUtils,
  performanceUtils,
  darkModeUtils,
  cn,
  commonPatterns
};