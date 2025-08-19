# Edutu AI Backend Deployment Guide

## 🚀 Production Deployment to Firebase Functions

This guide will help you deploy the Edutu AI backend to Firebase Functions with all required services and configurations.

## Prerequisites

✅ **Completed Setup:**
- Firebase CLI installed and configured
- Firebase project created
- Firestore database initialized
- Firebase Authentication enabled
- Node.js 18+ installed

✅ **Required Services:**
- **Supabase account** with Vector/Embeddings extension enabled
- **AI Service API keys** (at least one):
  - Google Gemini API key
  - OpenAI API key
  - Cohere API key

## 📋 Deployment Checklist

### 1. Configure Environment Variables

Set up Firebase Functions configuration with your API keys:

```bash
# Navigate to project root
cd C:\Users\USER\Desktop\Edutu_Folder\edutu4\project

# Set AI service keys (choose at least one)
firebase functions:config:set ai.gemini_key="YOUR_GEMINI_API_KEY"
firebase functions:config:set ai.openai_key="YOUR_OPENAI_API_KEY"  
firebase functions:config:set ai.cohere_key="YOUR_COHERE_API_KEY"

# Set Supabase configuration
firebase functions:config:set supabase.url="https://YOUR_PROJECT.supabase.co"
firebase functions:config:set supabase.service_key="YOUR_SUPABASE_SERVICE_ROLE_KEY"

# Set CORS origins for your domain
firebase functions:config:set app.cors_origins="https://edutu-ai.web.app,https://YOUR_DOMAIN.com"

# Set rate limiting
firebase functions:config:set app.rate_limit_window_ms="900000"
firebase functions:config:set app.rate_limit_max_requests="100"

# Set environment
firebase functions:config:set app.node_env="production"
```

### 2. Verify Configuration

```bash
# Check that all configurations are set
firebase functions:config:get
```

### 3. Deploy Firestore Security Rules

```bash
# Deploy security rules and indexes
firebase deploy --only firestore:rules,firestore:indexes
```

### 4. Build and Deploy Functions

```bash
# Navigate to functions directory
cd functions

# Build TypeScript
npm run build

# Deploy functions
firebase deploy --only functions
```

### 5. Verify Deployment

After deployment, your endpoints will be available at:

```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api/
```

**Test the deployment:**

```bash
# Test health check
curl https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/healthCheck

# Test API root
curl https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api/
```

## 🔄 Scheduled Functions

The deployment includes two scheduled functions:

### RSS Scraper (Every 6 hours)
- **Function:** `rssScraperCron`
- **Schedule:** `0 */6 * * *` (Every 6 hours)
- **Purpose:** Scrapes RSS feeds for new scholarships and opportunities

### Embedding Refresh (Daily at 2 AM UTC)
- **Function:** `embeddingRefreshCron` 
- **Schedule:** `0 2 * * *` (Daily at 2 AM UTC)
- **Purpose:** Updates vector embeddings and refreshes recommendations

## 🛡️ Security Configuration

### Firestore Security Rules
The deployment includes comprehensive security rules:
- Users can only access their own data
- Resource ownership validation  
- Authentication requirements
- Input validation and sanitization

### API Security
- Rate limiting (100 requests per 15 minutes per IP)
- CORS configuration for allowed origins
- Firebase Authentication token verification
- Request size limits (10MB)

## 📊 Monitoring and Logging

### View Function Logs
```bash
# View all function logs
firebase functions:log

# View specific function logs
firebase functions:log --only rssScraperCron
firebase functions:log --only embeddingRefreshCron
firebase functions:log --only api
```

### Monitor Performance
- **Firebase Console:** [console.firebase.google.com](https://console.firebase.google.com)
- **Functions tab:** Monitor invocations, errors, and performance
- **Firestore tab:** Monitor database reads/writes
- **Authentication tab:** Monitor user sign-ins

## 🔧 API Endpoints

Once deployed, the following endpoints will be available:

### Core API Endpoints
```
POST   /api/roadmaps/generate              # Generate personalized roadmap
GET    /api/roadmaps/user/{userId}         # Get user's roadmaps
GET    /api/roadmaps/{roadmapId}           # Get specific roadmap
PUT    /api/roadmaps/{roadmapId}/milestones/{milestoneId}  # Update milestone

GET    /api/recommendations/user/{userId}   # Get personalized recommendations
POST   /api/recommendations/user/{userId}/refresh  # Refresh recommendations
GET    /api/recommendations/similar/{scholarshipId}  # Find similar scholarships

POST   /api/chat/message                    # Send chat message
GET    /api/chat/history/{userId}           # Get chat history
POST   /api/chat/session/new               # Start new chat session

POST   /api/activity/log                    # Log user activity
GET    /api/activity/user/{userId}          # Get user activity
GET    /api/activity/user/{userId}/analytics  # Get activity analytics
```

### Utility Endpoints
```
GET    /health                             # Health check
GET    /health/detailed                    # Detailed health check
POST   /verifyDataIntegrity                # Manual data verification
```

## 🔍 Data Verification

### Manual Verification
Use the deployed verification function to check data integrity:

```bash
# Using Firebase CLI
firebase functions:call verifyDataIntegrity

# Or run local verification script
cd functions
node verify-firestore.js
```

### Expected Collections
The system should have data in these Firestore collections:
- `scholarships` - Scholarship opportunities
- `users` - User profiles and preferences  
- `userRoadmaps` - Generated learning roadmaps
- `chatMessages` - Chat conversation history
- `userActivity` - User interaction logs
- `scraperLogs` - RSS scraper execution logs
- `embeddingLogs` - Embedding refresh logs

## 🏗️ Frontend Integration

### Update Frontend Configuration

Update your frontend to point to the production API:

```javascript
// In your frontend config
const API_BASE_URL = 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api';

// Example API calls
const getRoadmaps = async (userId, token) => {
  const response = await fetch(`${API_BASE_URL}/roadmaps/user/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};
```

### Authentication Integration
Ensure your frontend passes Firebase Auth tokens:

```javascript
import { getAuth } from 'firebase/auth';

const makeAuthenticatedRequest = async (url, options = {}) => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (user) {
    const token = await user.getIdToken();
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  
  return fetch(url, options);
};
```

## 🐛 Troubleshooting

### Common Issues

**1. Function Timeout**
```bash
# Increase timeout in firebase.json
{
  "functions": {
    "runtime": "nodejs18", 
    "timeout": "540s",
    "memory": "2GB"
  }
}
```

**2. CORS Errors**
- Verify your domain is in `app.cors_origins` configuration
- Check that requests include proper headers

**3. Authentication Errors**
- Ensure Firebase Auth tokens are being sent
- Verify token hasn't expired
- Check Firestore security rules

**4. AI Service Errors**
- Verify API keys are correctly set
- Check API quotas and limits
- Ensure at least one AI service is configured

**5. Supabase Connection Issues**
- Verify Supabase URL and service role key
- Check Supabase project settings
- Ensure Vector/Embeddings extension is enabled

### Getting Help

**Logs and Debugging:**
```bash
# Real-time function logs
firebase functions:log --follow

# Firestore debug mode
firebase emulators:start --inspect-functions
```

**Configuration Check:**
```bash
# View current configuration
firebase functions:config:get

# Test local functions
cd functions && npm run serve
```

## ✅ Deployment Verification

After deployment, verify everything is working:

1. **✅ Health Check**
   ```bash
   curl https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/healthCheck
   ```

2. **✅ API Root**
   ```bash
   curl https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api/
   ```

3. **✅ Scheduled Functions**
   - Check Firebase Console → Functions tab
   - Verify cron jobs are scheduled
   - Check execution logs

4. **✅ Database Access**  
   - Verify Firestore collections exist
   - Check security rules are active
   - Test read/write permissions

5. **✅ AI Services**
   - Generate a test embedding
   - Create a test roadmap
   - Send a test chat message

## 📈 Success Metrics

**Deployment is successful when:**
- ✅ All API endpoints return 200 status
- ✅ Scheduled functions run without errors  
- ✅ Firestore data is accessible and secure
- ✅ AI services generate responses
- ✅ Vector embeddings are stored in Supabase
- ✅ Frontend can authenticate and make API calls
- ✅ User activity is being logged
- ✅ Recommendations are being generated

## 🎯 Next Steps

After successful deployment:

1. **Monitor Performance**
   - Set up alerting for function errors
   - Monitor Firestore usage and billing
   - Track API response times

2. **Optimize Costs**
   - Review function memory allocations
   - Optimize database queries
   - Consider caching for frequently accessed data

3. **Scale Preparation**
   - Plan for increased traffic
   - Consider regional function deployment
   - Implement additional rate limiting if needed

4. **Feature Enhancement**
   - Add more AI models for redundancy
   - Implement advanced analytics
   - Enhance recommendation algorithms

---

🎉 **Congratulations!** Your Edutu AI backend is now live in production with:
- ✅ Secure API endpoints
- ✅ Automated RSS scraping  
- ✅ AI-powered recommendations
- ✅ Real-time chat assistance
- ✅ Comprehensive monitoring
- ✅ Scalable architecture

Your users can now access personalized learning roadmaps, AI-powered opportunity recommendations, and intelligent career guidance!