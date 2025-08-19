# Edutu Continuous Learning System Setup

This document provides setup instructions for Edutu's continuous learning loop that improves recommendations, roadmaps, and chat responses based on user interactions.

## Overview

The continuous learning system consists of:

1. **User Activity Tracking** - Captures all user interactions
2. **Adaptive Recommendations** - Learns from user preferences and behavior
3. **Roadmap Refinement** - Optimizes learning paths based on completion patterns
4. **Chat Evolution** - Personalizes AI responses based on engagement
5. **Automated Learning Pipeline** - Weekly batch processing for system improvements

## Quick Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required: Firebase (existing)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase vars

# Required: Supabase for embeddings storage (NEW)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: AI Services for enhanced chat
VITE_GEMINI_API_KEY=your_gemini_api_key

# Optional: Learning pipeline configuration
VITE_LEARNING_PIPELINE_ENABLED=true
VITE_LEARNING_PIPELINE_SCHEDULE=daily
```

### 2. Supabase Database Setup

Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tables for embeddings and learning data
CREATE TABLE opportunity_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  embedding VECTOR(384),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE user_preference_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  preferences_vector VECTOR(384),
  interaction_vector VECTOR(384),
  success_vector VECTOR(384),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE chat_personalization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  preferred_topics TEXT[],
  communication_style TEXT CHECK (communication_style IN ('detailed', 'concise', 'mixed')),
  engagement_level TEXT CHECK (engagement_level IN ('high', 'medium', 'low')),
  successful_response_patterns JSONB,
  recent_interests TEXT[],
  learning_goals TEXT[],
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX opportunity_embeddings_category_idx ON opportunity_embeddings(category);
CREATE INDEX opportunity_embeddings_embedding_idx ON opportunity_embeddings USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX user_preference_embeddings_user_id_idx ON user_preference_embeddings(user_id);
CREATE INDEX chat_personalization_user_id_idx ON chat_personalization(user_id);
```

### 3. Firebase Firestore Setup

The system will automatically create these Firestore collections:
- `userActivities` - Stores all user interaction data
- `learningUpdates` - Tracks learning pipeline runs
- `learningPatterns` - Stores identified user behavior patterns

No additional setup required - the system creates these as needed.

### 4. Integration in Components

Update your components to use activity tracking:

```tsx
import { useActivityTracking } from '../hooks/useActivityTracking';

function YourComponent() {
  const { trackOpportunityView, trackChatQuestion } = useActivityTracking();
  
  // Track when user views an opportunity
  const handleOpportunityClick = (opportunity) => {
    trackOpportunityView(opportunity.id, opportunity.title, opportunity.category);
  };
  
  // Track chat interactions
  const handleChatSubmit = (question) => {
    trackChatQuestion(question);
  };
}
```

## Detailed Configuration

### Learning Pipeline Settings

Configure in `.env`:

```bash
# Pipeline frequency: 'daily', 'weekly', 'monthly'
VITE_LEARNING_PIPELINE_SCHEDULE=daily

# Batch processing limits
VITE_BATCH_SIZE=100
VITE_MAX_USERS_PER_BATCH=1000

# Performance settings
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
```

### Recommendation Engine Tuning

The system automatically learns but you can tune parameters in `learningConfig.ts`:

```typescript
RECOMMENDATIONS: {
  CACHE_DURATION: 1000 * 60 * 60 * 2, // 2 hours
  EMBEDDING_DIMENSIONS: 384,
  MIN_INTERACTIONS_FOR_PERSONALIZATION: 5,
  SIMILARITY_THRESHOLD: 0.1,
}
```

### Chat Personalization Settings

```typescript
CHAT: {
  MIN_INTERACTIONS_FOR_ADAPTATION: 3,
  RESPONSE_QUALITY_THRESHOLD: 4.0,
  MAX_CONVERSATION_HISTORY: 50,
}
```

## Feature Usage

### 1. Activity Tracking

Every user interaction is automatically tracked:

```typescript
// Automatically tracked:
- Opportunity clicks, saves, applications, ignores
- Roadmap task completions, delays, skips  
- Chat questions and response ratings
- Search queries and filter usage
- Goal creation and completion
```

### 2. Adaptive Recommendations

Get personalized recommendations:

```typescript
import { adaptiveRecommendationService } from '../services/adaptiveRecommendationService';

// Get personalized opportunities
const recommendations = await adaptiveRecommendationService
  .getPersonalizedRecommendations(userId, 20, { category: 'Technology' });
```

### 3. Enhanced Chat

Use the adaptive chat service:

```typescript
import { adaptiveAIChatService } from '../services/adaptiveAIChatService';

// Generate personalized response
const response = await adaptiveAIChatService.generateAdaptiveResponse(
  userId, 
  userMessage, 
  { name: 'John', age: 25 }
);
```

### 4. Roadmap Refinement

Get optimized roadmaps:

```typescript
import { roadmapRefinementService } from '../services/roadmapRefinementService';

// Get personalized roadmap adjustments
const recommendations = await roadmapRefinementService
  .getPersonalizedRoadmapRecommendations(userId, roadmapId);
```

### 5. Learning Pipeline Control

Manually trigger learning updates:

```typescript
import { learningPipelineService } from '../services/learningPipelineService';

// Trigger manual update
await learningPipelineService.triggerPipelineTask('recommendations');

// Check pipeline status
const status = learningPipelineService.getPipelineStatus();
```

## Monitoring and Analytics

### System Metrics

Monitor learning system performance:

```typescript
// Get system metrics
const metrics = await learningPipelineService.getSystemMetrics(7); // Last 7 days

// Recommendation performance
const performance = await adaptiveRecommendationService
  .getRecommendationPerformance(startDate, endDate);
```

### User Engagement Metrics

Track individual user engagement:

```typescript
// Get user engagement metrics
const metrics = await userActivityService.getUserEngagementMetrics(
  userId, 
  'weekly', 
  startDate, 
  endDate
);
```

## Cost Optimization

The system is designed for minimal costs:

### Free Tier Usage
- **Supabase**: Uses free tier for embeddings storage
- **Firebase**: Uses existing Firestore for activity logs
- **AI Services**: Optional - can run without paid AI APIs

### Optimization Settings
```bash
# Limit batch sizes to control costs
VITE_BATCH_SIZE=50
VITE_MAX_USERS_PER_BATCH=500

# Reduce pipeline frequency if needed
VITE_LEARNING_PIPELINE_SCHEDULE=weekly
```

## Development and Testing

### Debug Mode

Enable debugging:

```bash
VITE_DEV_MODE=true
VITE_DEBUG_RECOMMENDATIONS=true
VITE_DEBUG_EMBEDDINGS=true
VITE_MOCK_AI_RESPONSES=true  # Use mock responses for testing
```

### Testing Activity Tracking

```typescript
// Test activity tracking
import { userActivityService } from '../services/userActivityService';

// Track test activity
await userActivityService.trackActivity('test_user', 'opportunity_clicked', {
  opportunityId: 'test_opp',
  opportunityTitle: 'Test Opportunity',
  opportunityCategory: 'Technology'
});
```

## Troubleshooting

### Common Issues

1. **Supabase Connection Failed**
   - Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
   - Verify Supabase project is active

2. **Activity Tracking Not Working**
   - Check Firebase connection
   - Verify user authentication
   - Check browser console for errors

3. **Recommendations Not Personalizing**
   - Ensure minimum user interactions (default: 5)
   - Check if embeddings are being created
   - Verify Supabase vector extension is enabled

4. **Pipeline Not Running**
   - Check `VITE_LEARNING_PIPELINE_ENABLED=true`
   - Verify system clock and timezone
   - Check console logs for pipeline errors

### Debug Commands

```typescript
// Check configuration
import { CONFIG_STATUS } from '../config/learningConfig';
console.log('Config status:', CONFIG_STATUS);

// Test embeddings
import { vectorOperations } from '../config/supabase';
const testVector = vectorOperations.createTextEmbedding('test text');

// Check pipeline status
const status = learningPipelineService.getPipelineStatus();
```

## Production Deployment

### Pre-deployment Checklist

1. ✅ Environment variables configured
2. ✅ Supabase database tables created
3. ✅ Firebase security rules updated
4. ✅ Activity tracking integrated in key components
5. ✅ Pipeline schedules configured
6. ✅ Monitoring and alerts set up

### Performance Recommendations

1. **Enable caching** for better performance
2. **Set appropriate batch sizes** based on your user base
3. **Monitor Supabase usage** to avoid overages
4. **Implement error handling** for all external services
5. **Set up logging** for debugging in production

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review component integration examples
3. Check console logs for detailed error messages
4. Verify environment configuration

The continuous learning system will start showing improvements after 1-2 weeks of user data collection. Initial recommendations will be basic but will become increasingly personalized as the system learns from user interactions.