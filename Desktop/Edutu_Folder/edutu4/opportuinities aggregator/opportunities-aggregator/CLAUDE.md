# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `npm run dev` - Development server with hot reload using ts-node-dev
- `npm run build` - Compile TypeScript to JavaScript in dist/ directory
- `npm start` - Run production build from dist/index.js
- `npm run lint` - Run ESLint on src/**/*.ts files
- `npm run typecheck` - TypeScript type checking without emitting files

### Environment Setup
- Copy `.env.example` to `.env` and configure required Google Custom Search API credentials
- Required: `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_CX`
- Optional: `PORT` (default: 3000), `CACHE_TIMEOUT_MS` (default: 1 hour)

## Architecture Overview

This is an opportunities aggregator service built with Node.js/TypeScript that uses Google Custom Search API to find educational and career opportunities from predefined sites.

### Core Components

**Main Application (`src/index.ts`)**
- Express server with security middleware (Helmet, CORS)
- Comprehensive error handling and graceful shutdown
- Request logging and health endpoints

**Configuration (`src/config.ts`)**
- Environment variable validation with required checks
- Predefined opportunity sites list (opportunitydesk.org, youthopportunitieshub.org, etc.)
- Rate limiting and pagination settings

**Services Architecture**
- `googleSearch.ts` - Google Custom Search API integration
- `cacheService.ts` - In-memory caching with TTL (1 hour default)
- `cronService.ts` - Background jobs for refreshing popular topics every 6 hours

**Data Flow**
- API requests → Controller → Google Search Service → Data cleaning → Cache storage
- Cron jobs automatically refresh cache for popular topics (scholarships, internships, fellowships, etc.)

### Key Features
- Smart data cleaning with meta image extraction and date parsing
- Production-ready logging with Winston
- RESTful API with pagination and filtering
- Health monitoring and cache statistics endpoints

## API Structure

Primary endpoint: `/api/opportunities` with query parameters:
- `topic` (required) - search term
- `limit`, `page` - pagination
- `sites` - filter specific opportunity sites
- `refresh` - bypass cache

Additional endpoints: `/api/health`, `/api/opportunities/cache/stats`, cache management

## Development Notes

- Uses strict TypeScript configuration with comprehensive type checking
- Path aliases: `@/*` maps to `src/*`
- Winston logger configured for structured logging to `logs/` directory
- Express middleware handles CORS, security headers, and request parsing
- Graceful shutdown handling for SIGTERM/SIGINT signals