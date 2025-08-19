# Edutu AI Backend

Production-ready AI backend for Edutu — an AI-powered opportunity coaching platform. This backend provides personalized roadmaps, AI recommendations, and a context-aware chat assistant using only free or low-cost AI services.

## 🚀 Features

### Core AI Features

- **Personalized Roadmaps**: Generate detailed, deadline-driven roadmaps tailored to user profiles using Gemini 1.5 Flash
- **AI-Powered Recommendations**: Use embeddings to match opportunities to users with vector similarity search
- **Context-Aware Chat Assistant**: RAG-based chat with Gemini 1.5 Flash using contextual information
- **Real-time Updates**: Automatic embedding synchronization when new opportunities are added

### Technical Features

- **Zero-Cost AI Stack**: Uses free tiers of Google AI, OpenAI, and Cohere
- **Vector Database**: Supabase with pgvector for embeddings storage and similarity search
- **Secure Authentication**: Firebase Auth integration with admin middleware
- **Automatic Scheduling**: Background tasks for embedding maintenance and updates
- **Comprehensive Monitoring**: Health checks, metrics, and logging
- **Production Ready**: Rate limiting, error handling, and graceful shutdown

## 📋 API Endpoints

### Core APIs
- `POST /api/roadmaps/generate` - Generate personalized roadmap
- `GET /api/recommendations/user/:userId` - Get personalized recommendations
- `POST /api/chat/message` - Send chat message to AI assistant
- `GET /health` - System health check

### Admin APIs (requires admin role)
- `GET /api/admin/overview` - System overview and stats
- `POST /api/admin/scheduler/:action` - Manage scheduled tasks
- `POST /api/admin/embeddings/:action` - Manage embeddings

## 🛠 Tech Stack

### Core Technologies
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Firebase Firestore + Supabase (PostgreSQL with pgvector)
- **Authentication**: Firebase Admin SDK

### AI Services (All Free Tier)
- **Gemini 1.5 Flash** (Google AI) - Chat responses and roadmap generation
- **OpenAI text-embedding-3-small** - Primary embeddings service
- **Cohere embed-english-light-v3.0** - Fallback embeddings service

### Additional Services
- **Scheduling**: node-cron for background tasks
- **Logging**: Winston with structured logging
- **Security**: Helmet, CORS, rate limiting
- **Monitoring**: Custom health checks and metrics

## 🔧 Setup Instructions

### Prerequisites

1. **Node.js 18+** installed
2. **Firebase project** with Firestore enabled
3. **Supabase project** (free tier)
4. **AI API keys** (all free tier):
   - Google AI API key (Gemini)
   - OpenAI API key
   - Cohere API key

### 1. Get API Keys (All Free)

#### Google AI (Gemini 1.5 Flash)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key for `GOOGLE_AI_API_KEY`

#### OpenAI (Embeddings)
1. Go to [OpenAI API](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key for `OPENAI_API_KEY`

#### Cohere (Fallback Embeddings)
1. Go to [Cohere Dashboard](https://dashboard.cohere.ai/api-keys)
2. Create a free account and get API key
3. Copy the key for `COHERE_API_KEY`

### 2. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore database
3. Create a service account:
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Save the JSON file securely
4. Extract these values for your `.env`:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY` (the entire private key with \\n preserved)
   - `FIREBASE_CLIENT_EMAIL`

### 3. Supabase Setup

1. Create a Supabase project at [Supabase](https://supabase.com/)
2. Go to Settings > API to get:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (not the anon key)
3. Run the database setup script:

```sql
-- Copy the contents of database/supabase-setup.sql
-- and run in Supabase SQL editor
```

### 4. Installation

```bash
# Clone or navigate to the ai-backend directory
cd ai-backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your API keys (see next section)
nano .env
```

### 5. Environment Configuration

Create `.env` file with your actual values:

```env
# Node.js Environment
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# Firebase Configuration (Service Account)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google AI (Gemini 1.5 Flash) - Free Tier
GOOGLE_AI_API_KEY=your-google-ai-api-key

# OpenAI Configuration - Free/Low-cost embeddings
OPENAI_API_KEY=your-openai-api-key

# Cohere Configuration (Fallback) - Free Tier  
COHERE_API_KEY=your-cohere-api-key
```

### 6. Database Setup

Run the Supabase setup script:

```bash
# The setup script is in database/supabase-setup.sql
# Copy its contents and run in Supabase SQL editor
# This creates the vector database tables and functions
```

### 7. Initial Data Population

```bash
# Start the server
npm start

# In another terminal, populate embeddings for existing scholarships
curl -X POST http://localhost:3001/api/admin/embeddings/rebuild \
  -H "Authorization: Bearer YOUR_FIREBASE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev  # Using nodemon for auto-restart
```

### Production Mode

```bash
npm start
```

### Testing the Setup

1. **Health Check**:
```bash
curl http://localhost:3001/health/detailed
```

2. **Test AI Services**:
```bash
curl -X POST http://localhost:3001/api/admin/test-ai \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

3. **Generate Test Roadmap**:
```bash
curl -X POST http://localhost:3001/api/roadmaps/generate \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "opportunityId": "scholarship-id-from-firestore"
  }'
```

## 🎯 Usage Examples

### Generate Personalized Roadmap

```javascript
const response = await fetch('/api/roadmaps/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user123',
    opportunityId: 'scholarship456'
  })
});

const { roadmap } = await response.json();
console.log(roadmap.milestones); // Array of actionable milestones
```

### Get AI Recommendations

```javascript
const response = await fetch(`/api/recommendations/user/${userId}?limit=3`, {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const { recommendations } = await response.json();
console.log(recommendations); // Top 3 personalized opportunities
```

### Chat with AI Assistant

```javascript
const response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user123',
    message: 'Help me prepare for computer science scholarships',
    sessionId: 'session456'
  })
});

const { response: aiResponse } = await response.json();
console.log(aiResponse); // Contextual AI response
```

## 🚀 Deployment

### Deploy to Railway (Recommended)

1. Create Railway account at [Railway](https://railway.app/)
2. Connect your GitHub repository
3. Add environment variables in Railway dashboard
4. Deploy automatically from main branch

### Deploy to Render

1. Create Render account at [Render](https://render.com/)
2. Create new Web Service
3. Connect repository and add environment variables
4. Use build command: `npm install`
5. Use start command: `npm start`

### Deploy to Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create edutu-ai-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set FIREBASE_PROJECT_ID=your-project-id
# ... add all other environment variables

# Deploy
git push heroku main
```

### Deploy to VPS (Ubuntu/CentOS)

```bash
# On your VPS
git clone your-repository
cd ai-backend
npm install --production

# Install PM2 for process management
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'edutu-ai-backend',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔍 Monitoring & Maintenance

### Health Monitoring

The backend provides comprehensive health endpoints:

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed service status
- `GET /health/ai` - AI services health
- `GET /health/database` - Database connectivity
- `GET /health/metrics` - System metrics

### Scheduled Tasks

The backend automatically runs maintenance tasks:

- **Embedding Sync**: Every hour (updates new opportunities)
- **Full Maintenance**: Every 6 hours (comprehensive cleanup)
- **Stats Collection**: Every 30 minutes
- **Daily Cleanup**: 2 AM UTC (orphaned data removal)

### Manual Maintenance

```bash
# Sync embeddings manually
curl -X POST http://localhost:3001/api/admin/embeddings/sync \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Rebuild all embeddings
curl -X POST http://localhost:3001/api/admin/embeddings/rebuild \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Run maintenance
curl -X POST http://localhost:3001/api/admin/embeddings/maintenance \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 🔒 Security

### Authentication

- Uses Firebase Auth for user authentication
- Admin endpoints require admin custom claims
- Rate limiting applied to all API endpoints
- Request logging for monitoring

### Data Protection

- Environment variables for all secrets
- No sensitive data in logs
- CORS configured for specific origins
- Helmet.js security headers

### Production Considerations

- Use HTTPS in production
- Set proper CORS origins
- Monitor rate limiting logs
- Regular security updates

## 📊 Cost Analysis

All AI services used are free tier with generous limits:

### Google AI (Gemini 1.5 Flash)
- **Free tier**: 15 requests per minute, 1,500 requests per day
- **Usage**: Roadmap generation + chat responses
- **Estimated cost**: $0/month for typical usage

### OpenAI (Embeddings)
- **Free tier**: $5 credit (expires after 3 months)
- **text-embedding-3-small**: $0.00002 per 1K tokens
- **Estimated cost**: ~$1-2/month for 100K embeddings

### Cohere (Fallback)
- **Free tier**: 100 API calls per month
- **Usage**: Backup embeddings service
- **Estimated cost**: $0/month (free tier sufficient)

### Infrastructure
- **Supabase**: Free tier (500MB database, 2GB bandwidth)
- **Firebase**: Free tier (1GB storage, 10GB bandwidth)
- **Railway/Render**: $5-10/month for hosting

**Total Monthly Cost**: ~$6-12/month

## 🤝 Integration with Frontend

### React Integration

```javascript
// Example React hook for AI features
import { useAuth } from './hooks/useAuth';

export function useEdutuAI() {
  const { user, getIdToken } = useAuth();
  const API_BASE = process.env.REACT_APP_AI_BACKEND_URL;

  const generateRoadmap = async (opportunityId) => {
    const token = await getIdToken();
    const response = await fetch(`${API_BASE}/api/roadmaps/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.uid,
        opportunityId
      })
    });
    return response.json();
  };

  const getRecommendations = async () => {
    const token = await getIdToken();
    const response = await fetch(`${API_BASE}/api/recommendations/user/${user.uid}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  };

  const sendChatMessage = async (message, sessionId) => {
    const token = await getIdToken();
    const response = await fetch(`${API_BASE}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.uid,
        message,
        sessionId
      })
    });
    return response.json();
  };

  return {
    generateRoadmap,
    getRecommendations,
    sendChatMessage
  };
}
```

## 🐛 Troubleshooting

### Common Issues

**1. AI Service Errors**
```bash
# Check AI service status
curl http://localhost:3001/health/ai

# Test specific service
curl -X POST http://localhost:3001/api/admin/test-ai \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**2. Database Connection Issues**
```bash
# Check database health
curl http://localhost:3001/health/database

# Verify environment variables
echo $SUPABASE_URL $FIREBASE_PROJECT_ID
```

**3. Embedding Issues**
```bash
# Check embedding stats
curl http://localhost:3001/api/admin/embeddings/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Rebuild embeddings
curl -X POST http://localhost:3001/api/admin/embeddings/rebuild \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
ENABLE_DEBUG_LOGGING=true
```

## 📝 Contributing

1. Follow the existing code patterns
2. Add tests for new features
3. Update documentation
4. Use conventional commits
5. Ensure security best practices

## 📄 License

This project is part of the Edutu opportunity coaching platform.

---

## 🎯 Quick Start Summary

1. **Get API Keys** (all free): Google AI, OpenAI, Cohere
2. **Setup Firebase** project with Firestore
3. **Create Supabase** project and run setup SQL
4. **Clone & Install**: `npm install`
5. **Configure**: Copy `.env.example` to `.env` and fill values
6. **Run**: `npm start`
7. **Test**: Visit `http://localhost:3001/health`

The backend is now ready to power your Edutu frontend with AI-driven features!