# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CLAUDE.md - Edutu AI Opportunity Coach

## Project Overview

**Edutu** is a modern web application serving as an AI-powered opportunity coach for career development and learning. The application helps users discover educational opportunities, create personalized learning roadmaps, track goals, and connect with career resources.

## Technology Stack

### Core Technologies
- **Frontend Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.2 (ES modules, fast HMR)
- **Styling**: Tailwind CSS 3.4.1 with custom design system
- **Backend**: Firebase services (Authentication, Firestore, Analytics)
- **State Management**: React hooks and context patterns
- **Icon Library**: Lucide React 0.344.0

### Development Tools
- **TypeScript**: 5.5.3 with strict configuration
- **ESLint**: 9.9.1 with TypeScript and React hooks plugins
- **PostCSS**: 8.4.35 with Autoprefixer
- **Package Manager**: npm with package-lock.json

## Development Commands

### Frontend Development
```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Code linting
npm run lint

# Preview production build locally
npm run preview
```

### Backend Services Development
Each backend service has its own development commands:

```bash
# AI Backend (RAG system, embeddings, chat)
cd ai-backend
npm install
npm start  # Runs on configured port

# API Server (opportunities API)
cd api-server  
npm install
node index.js  # Runs on configured port

# CV Backend (Firebase Functions)
cd cv-backend
npm install
firebase serve --only functions  # Local Firebase Functions emulator

# RSS Scraper (data collection)
cd rss-scraper
npm install
node index.js  # One-time scraping or scheduled jobs
```

## Project Structure

```
src/
├── components/           # React components (50+ components)
│   ├── ui/              # Reusable UI components (Button, Card, etc.)
│   ├── AuthFlow.tsx     # Authentication orchestrator
│   ├── Dashboard.tsx    # Main user dashboard
│   ├── LandingPage.tsx  # Marketing landing page
│   └── ...             # Feature-specific components
├── config/
│   ├── firebase.ts     # Firebase configuration with security
│   ├── supabase.ts     # Supabase configuration
│   └── learningConfig.ts # Learning pipeline configuration
├── data/
│   └── successStories.ts # Static success story data
├── hooks/
│   ├── useAuth.ts      # Authentication state management
│   ├── useDarkMode.ts  # Dark mode toggle
│   ├── useGoals.ts     # Goals management hooks
│   └── ...             # Feature-specific hooks
├── services/
│   ├── authService.ts      # Firebase auth operations
│   ├── goalsService.ts     # Goals management
│   ├── opportunitiesService.ts # Opportunities API
│   ├── aiChatService.ts    # AI chat integration
│   └── ...                 # Additional services
├── types/
│   ├── common.ts       # Core interfaces and types
│   ├── goals.ts        # Goal-related types
│   ├── successStory.ts # Success story types
│   └── user.ts         # User and preferences types
├── utils/
│   ├── security.ts     # Security utilities (rate limiting, validation)
│   ├── validation.ts   # Form validation helpers
│   └── responsive.ts   # Responsive design utilities
├── App.tsx             # Main application component
├── main.tsx           # React app entry point
└── index.css          # Global styles and Tailwind imports
```

## Architecture Patterns

### Screen-Based Navigation Architecture
The application uses a screen-based navigation pattern centered around `App.tsx`:

- **Central State Management**: App.tsx maintains navigation state and handles screen transitions
- **Screen Types**: All screens are defined in the `Screen` union type
- **Navigation Handler**: Centralized `handleNavigate` function manages screen transitions
- **Auto-scroll**: All navigation includes automatic scroll-to-top behavior

### Component Architecture
- **Screen Components**: Each major UI state is a separate screen component
- **Reusable UI Components**: Located in `components/ui/` directory
- **Props-based Communication**: Explicit prop passing for state management
- **Type Safety**: Comprehensive TypeScript interfaces for all data structures

### State Management Patterns
- **Local State**: useState for component-level state
- **Authentication State**: useAuth hook with Firebase integration
- **Global Theme**: useDarkMode hook for dark/light mode
- **Persistent Storage**: Custom secureStorage wrapper with sanitization
- **Firebase Integration**: Real-time Firestore for user data persistence

### Security Implementation
- **Rate Limiting**: Protection against brute force attacks in authService
- **Input Validation**: Client-side sanitization for all user inputs
- **Environment Validation**: Runtime checks for required Firebase config
- **Secure Storage**: Custom localStorage wrapper with XSS protection
- **Firebase Security Rules**: Firestore rules for data access control

## Key Features

### 1. Authentication System
- **Email/Password Authentication** with Firebase Auth
- **Google OAuth Integration** for one-click sign-in
- **Security Features**: Rate limiting, input sanitization, secure storage
- **Onboarding Flow**: 7-step preference collection for new users

### 2. Navigation Architecture
The app uses a centralized navigation system with these key patterns:
- Screen-based routing via `currentScreen` state in App.tsx
- Automatic scroll-to-top on all navigation events
- Consistent back navigation with target screen specification
- Conditional navigation bar visibility based on current screen

### 3. AI Integration Architecture
- **Multiple AI Services**: Separate services for chat, recommendations, and embeddings
- **RAG System**: Vector embeddings with Supabase vector store
- **Learning Pipeline**: Automated content processing and recommendation generation
- **Chat Interface**: Real-time AI chat with context awareness

### 4. Data Architecture
- **Firebase Firestore**: Primary database for user data, goals, and preferences
- **Supabase**: Vector database for embeddings and AI features
- **RSS Integration**: Automated opportunity scraping and data enrichment
- **Real-time Updates**: Live data synchronization across components

## Configuration Files

### Build Configuration
- **vite.config.ts**: Vite build configuration with React plugin
- **tsconfig.json**: TypeScript project references
- **tsconfig.app.json**: Main app TypeScript config (strict mode enabled)
- **tsconfig.node.json**: Node.js specific TypeScript config

### Styling Configuration
- **tailwind.config.js**: Custom design system with:
  - Custom color palette (primary: #1E88E5, accent: #FFCA28)
  - Extended animations and keyframes
  - Mobile-safe spacing utilities
  - Dark mode support with 'class' strategy
  - Safe area insets for mobile devices
  - Custom components for elevated cards and touch-friendly buttons

### Code Quality
- **eslint.config.js**: ESLint 9 flat config with TypeScript and React rules
- **No testing framework**: Currently no test configuration
- **Build Optimization**: Vite excludes lucide-react from optimization

## Environment Variables

Required environment variables (Firebase configuration):
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

## Database Schema (Firestore)

### Users Collection
```typescript
{
  uid: string,
  name: string,
  email: string,
  age: number,
  createdAt: timestamp,
  onboardingCompleted: boolean,
  preferences: {
    educationLevel: string,
    careerInterests: string[],
    learningStyle: string,
    timeAvailability: string,
    // ... comprehensive preference data
  }
}
```

### Goals Collection
```typescript
{
  id: string,
  title: string,
  description: string,
  category: string,
  priority: string,
  targetDate: Date,
  monthlyRoadmap: MonthlyRoadmapItem[],
  aiGenerated: boolean,
  userId: string,
  createdAt: Date
}
```

## Multi-Backend Architecture

The project includes several backend services:

### 1. AI Backend (`ai-backend/`)
- **Purpose**: RAG system, embeddings, and AI chat functionality
- **Tech Stack**: Node.js, Express, Supabase, OpenAI
- **Key Features**: Vector embeddings, semantic search, chat completion

### 2. API Server (`api-server/`)
- **Purpose**: Opportunities data API
- **Tech Stack**: Node.js, Express, Firebase Admin
- **Key Features**: CRUD operations for opportunities, authentication middleware

### 3. CV Backend (`cv-backend/`)
- **Purpose**: CV optimization and ATS analysis
- **Tech Stack**: TypeScript, Firebase Functions
- **Key Features**: CV parsing, optimization recommendations, ATS compatibility

### 4. RSS Scraper (`rss-scraper/`)
- **Purpose**: Automated opportunity data collection
- **Tech Stack**: Node.js, RSS parsing
- **Key Features**: Scholarship scraping, data enrichment, Firestore integration

## Performance Characteristics

### Bundle Analysis
- **CSS**: 52.10 kB (8.31 kB gzipped)
- **JavaScript**: 1,012.90 kB (236.29 kB gzipped)
- **Total**: ~1.06 MB (~245 kB gzipped)

### Optimization Notes
- Lucide React excluded from optimization (performance concern noted)
- React 18 with concurrent features
- Vite for fast development and optimized production builds

## Development Guidelines

### Component Development
- Follow existing component patterns in `components/ui/`
- Use TypeScript interfaces from `types/` directory
- Implement proper error boundaries and loading states
- Follow mobile-first responsive design principles
- All screens are managed through the centralized `Screen` union type in App.tsx

### State Management
- Use local useState for component-specific state
- Leverage existing hooks (useAuth, useDarkMode, useGoals)
- Implement proper cleanup in useEffect hooks
- Follow existing patterns for Firebase integration
- Navigation state is centralized in App.tsx with automatic scroll-to-top

### Styling Guidelines
- Use Tailwind CSS classes with custom design system
- Follow existing color palette and spacing conventions
- Implement proper dark mode support using 'dark:' prefixes
- Use custom animations and components from tailwind.config.js
- Utilize mobile-safe spacing utilities and touch-friendly components

### Security Best Practices
- Always validate user inputs using utils/validation.ts
- Use secureStorage wrapper instead of direct localStorage
- Implement proper rate limiting for sensitive operations
- Follow existing patterns in utils/security.ts
- Environment validation is performed at startup

### Working with Multiple Backends
- Each backend service is independently deployable
- Services communicate via REST APIs and Firebase
- AI backend handles RAG system and embeddings
- API server manages opportunities data
- CV backend uses Firebase Functions for scalability
- RSS scraper runs scheduled data collection jobs

## Testing Setup Needed

Currently no testing framework is configured. Recommendations:
- **Unit Testing**: Vitest for unit testing (Vite-native)
- **Component Testing**: React Testing Library
- **E2E Testing**: Playwright or Cypress

## Production Readiness

### Deployment Ready Features
- Environment validation on startup
- Security headers configuration ready
- Firebase security rules implemented
- Comprehensive error handling
- Performance optimized builds

### Monitoring Recommendations
- Firebase Analytics integrated
- Security event logging implemented
- Consider error tracking (Sentry)
- Performance monitoring setup

## Documentation Files

The project includes comprehensive documentation:
- **APPLICATION_SUMMARY.md**: Complete security and implementation summary
- **FIREBASE_SETUP.md**: Firebase configuration and authentication guide
- **ONBOARDING_SYSTEM.md**: Detailed onboarding and RAG integration documentation
- **SUCCESS_STORY_SYSTEM.md**: Success story feature documentation

This is a production-ready React application with comprehensive security measures, clean architecture, and extensive documentation. The codebase follows modern React/TypeScript best practices and is well-prepared for AI integration and scaling.