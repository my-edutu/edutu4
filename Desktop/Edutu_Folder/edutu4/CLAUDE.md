# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains the **Edutu AI Opportunity Coach** ecosystem - a comprehensive platform for AI-powered career development and educational opportunity discovery. The project includes multiple specialized backend services, a React-based frontend, and AI agent documentation.

## Key Components

### 1. Main Application (`project/`)
- **Type**: React + TypeScript web application with multiple backend services
- **Primary Stack**: Vite, React 18, TypeScript, Tailwind CSS, Firebase
- **Purpose**: Main user-facing application for opportunity coaching

### 2. Opportunities Aggregator (`opportuinities aggregator/opportunities-aggregator/`)
- **Type**: Node.js/TypeScript API service
- **Purpose**: External opportunities data aggregation and caching
- **Tech Stack**: Express, TypeScript, Google Search integration

### 3. AI Agents Documentation (`agents/`)
- **Type**: Markdown documentation system
- **Purpose**: Comprehensive documentation for various AI agent types and capabilities
- **Structure**: Organized by domain (engineering, design, marketing, product, etc.)

## Development Commands

### Frontend Development (project/)
```bash
cd project
npm run dev              # Development server
npm run build            # Production build
npm run lint             # ESLint checking
npm run typecheck        # TypeScript checking
npm run preview          # Preview production build
```

### Backend Services Development

#### AI Backend (RAG system, embeddings)
```bash
cd project/ai-backend
npm start               # Production server
npm run dev             # Development with nodemon
npm test                # Jest tests
```

#### Firebase Functions
```bash
cd project/functions
npm run serve           # Local Firebase emulator
npm run build           # TypeScript compilation
npm run deploy          # Deploy to Firebase
```

#### Opportunities Aggregator
```bash
cd "opportuinities aggregator/opportunities-aggregator"
npm start               # Production server
npm run dev             # Development server
npm run build           # TypeScript build
```

## Architecture Highlights

### Multi-Service Architecture
The project implements a microservices pattern with:
- **Frontend**: Single-page React application
- **AI Backend**: Handles RAG system, embeddings, and chat
- **API Services**: Multiple specialized API endpoints
- **Firebase Functions**: Serverless functions for specific features
- **External Aggregator**: Independent service for opportunity data collection

### Technology Integration
- **Firebase**: Authentication, Firestore database, hosting
- **Supabase**: Vector database for AI embeddings
- **Multiple AI Providers**: OpenAI, Google Gemini, Cohere
- **Real-time Features**: WebSocket connections and Firebase real-time updates

### Security Implementation
- Rate limiting across all services
- Input validation and sanitization
- Firebase security rules
- Environment variable validation
- Secure storage patterns

## Development Workflow

### Working with Multiple Services
1. **Start Core Services**: Begin with Firebase functions and AI backend
2. **Frontend Development**: Use `npm run dev` in project directory
3. **API Testing**: Use provided test files in each service directory
4. **Integration Testing**: Services communicate via REST APIs and Firebase

### Common Patterns
- **TypeScript**: Strict typing across all services
- **Error Handling**: Comprehensive error boundaries and logging
- **Configuration**: Environment-based configuration with validation
- **Authentication**: Firebase Auth integration across services

### Testing Strategy
- **AI Backend**: Jest unit tests configured
- **Frontend**: No testing framework currently configured
- **API Services**: Basic test files provided
- **Integration**: Manual testing scripts available

## Key Configuration Files

### Root Level
- Each component maintains its own package.json and configuration
- Shared patterns for TypeScript, ESLint, and environment setup

### Environment Variables
Services require various Firebase, Supabase, and AI provider credentials:
- Firebase configuration (API keys, project IDs)
- Supabase credentials for vector database
- AI provider API keys (OpenAI, Google, Cohere)

## Development Guidelines

### Code Organization
- Follow existing TypeScript patterns in each service
- Use provided type definitions and interfaces
- Implement proper error handling and logging
- Follow security best practices established in existing code

### Service Communication
- REST API patterns between services
- Firebase real-time updates for user data
- Event-driven architecture for background processing
- Proper CORS configuration for cross-service requests

### AI Integration
- Multiple AI providers supported with fallback strategies
- Vector embeddings stored in Supabase
- RAG system for contextual AI responses
- Comprehensive prompt engineering patterns

## Documentation Structure

### Project Documentation
- Comprehensive CLAUDE.md in project/ directory with detailed architecture
- Individual service README files
- Deployment and setup guides per service

### AI Agents Documentation
- Organized by functional domain in agents/ directory
- Each agent type has detailed capabilities and use cases
- Integration patterns for agent collaboration

This repository represents a production-ready, multi-service AI platform with comprehensive documentation and established development patterns. Each component is independently deployable while maintaining integration capabilities through well-defined APIs and shared authentication systems.