# Edutu Chat System Verification Guide

## Overview
This guide provides comprehensive steps to test and verify the enhanced AI-powered chat system with RAG integration and context persistence.

## Prerequisites

### Environment Setup
Ensure the following environment variables are configured in Firebase Functions:

```bash
# AI Service Keys
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key  
COHERE_API_KEY=your_cohere_key

# Database Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_key
```

### Required Firebase Collections
- `users` - User profiles and preferences
- `scholarships` - Available opportunities  
- `goals` - User goals and objectives
- `chat_history` - Conversation persistence
- `rate_limits` - Security rate limiting
- `security_logs` - Security event logging
- `user_blocks` - Temporary user blocks

## Local Testing (npm run serve)

### 1. Start Firebase Functions Emulator

```bash
cd functions
npm install
npm run serve
```

The emulator should start on `http://localhost:5001`

### 2. Test Basic Chat Endpoint

**POST** `http://localhost:5001/YOUR_PROJECT_ID/us-central1/api/chat/message`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_FIREBASE_TOKEN
```

**Body:**
```json
{
  "userId": "valid_firebase_uid_28_chars",
  "message": "Hello, I'm looking for computer science scholarships",
  "sessionId": "chat_1642598400000_abc1234"
}
```

**Expected Response:**
```json
{
  "success": true,
  "response": "Hi [User Name]! I found 5 scholarship opportunities that match your profile: ...",
  "timestamp": "2024-01-19T10:30:00.000Z"
}
```

### 3. Test Chat History Retrieval

**GET** `http://localhost:5001/YOUR_PROJECT_ID/us-central1/api/chat/history/YOUR_USER_ID`

**Query Parameters:**
- `sessionId` (optional): Specific session
- `limit` (optional): Number of messages (default: 20)

**Expected Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": "message_id",
      "message": "Hello, I'm looking for scholarships",
      "response": "Hi! I found several opportunities...",
      "timestamp": "2024-01-19T10:30:00.000Z",
      "sessionId": "chat_1642598400000_abc1234"
    }
  ],
  "total": 1,
  "sessionId": "chat_1642598400000_abc1234"
}
```

### 4. Test New Session Creation

**POST** `http://localhost:5001/YOUR_PROJECT_ID/us-central1/api/chat/session/new`

**Body:**
```json
{
  "userId": "valid_firebase_uid_28_chars"
}
```

**Expected Response:**
```json
{
  "success": true,
  "sessionId": "chat_1642598400000_xyz7890",
  "message": "New chat session created",
  "timestamp": "2024-01-19T10:30:00.000Z"
}
```

## Production Testing (After Deploy)

### 1. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:api
```

### 2. Production Endpoint Testing

**Base URL:** `https://YOUR_PROJECT_ID.cloudfunctions.net/api`

Test the same endpoints as above, but using the production URL.

### 3. Frontend Integration Test

From your React frontend, test the chat integration:

```javascript
const testChatMessage = async () => {
  try {
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        userId: currentUser.uid,
        message: 'I need help finding STEM scholarships for graduate school',
        sessionId: currentSessionId
      })
    });
    
    const data = await response.json();
    console.log('AI Response:', data.response);
  } catch (error) {
    console.error('Chat error:', error);
  }
};
```

## Comprehensive Test Scenarios

### 1. RAG Context Testing

**Test Messages:**
```
"I'm interested in computer science scholarships"
"Can you help me create a roadmap for applying to MIT?"
"What opportunities are available for African students?"
"I need funding for my PhD research in AI"
```

**Verification Points:**
- ✅ Response references user's education level
- ✅ Response mentions relevant scholarships from database
- ✅ Response considers user's career interests
- ✅ Response builds on previous conversation context

### 2. Multi-LLM Fallback Testing

**Simulate Provider Failures:**
1. Temporarily disable Gemini API key
2. Send chat message - should fallback to OpenAI
3. Disable OpenAI - should fallback to Cohere
4. Disable Cohere - should return enhanced rule-based response

**Verification Points:**
- ✅ No "technical difficulties" messages
- ✅ Meaningful responses even with AI failures  
- ✅ Proper error logging
- ✅ Context-aware fallback responses

### 3. Security Validation Testing

**Test Invalid Inputs:**
```json
// Long message (>2000 characters)
{ "userId": "valid_uid", "message": "A".repeat(2001) }

// Invalid user ID
{ "userId": "invalid_uid", "message": "Hello" }

// Spam message
{ "userId": "valid_uid", "message": "click here click here click here..." }

// XSS attempt
{ "userId": "valid_uid", "message": "<script>alert('xss')</script>" }
```

**Verification Points:**
- ✅ Appropriate error messages
- ✅ Security events logged
- ✅ Input sanitization working
- ✅ Rate limiting active

### 4. Chat History Persistence Testing

**Test Flow:**
1. Send first message: "Hello, I'm new here"
2. Send follow-up: "I mentioned I'm new, what opportunities do you recommend?"
3. Start new session
4. Send message: "Continue our previous conversation"

**Verification Points:**
- ✅ Second message references first message
- ✅ Chat history stored correctly
- ✅ Cross-session context maintained
- ✅ Session management working

### 5. Performance Testing

**Load Testing:**
```bash
# Using Apache Bench (install if needed)
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
   -H "Content-Type: application/json" \
   -p chat_payload.json \
   https://YOUR_PROJECT_ID.cloudfunctions.net/api/chat/message
```

**Verification Points:**
- ✅ Average response time < 3 seconds
- ✅ No timeouts under normal load
- ✅ Rate limiting prevents abuse
- ✅ Error rates < 1%

## Error Scenarios Testing

### 1. Database Connection Issues
- Temporarily revoke Firestore permissions
- Verify graceful degradation

### 2. AI Service Outages  
- Test with invalid API keys
- Verify fallback responses quality

### 3. Memory/Timeout Issues
- Send very complex queries
- Verify timeout handling

## Monitoring and Logging

### Firebase Console Checks
1. **Functions Logs:** Check for errors and performance
2. **Firestore Usage:** Verify data writes/reads
3. **Security Rules:** Ensure proper access control

### Custom Monitoring
```javascript
// Add to your monitoring dashboard
const chatMetrics = {
  totalMessages: 'count of chat_history documents',
  avgResponseTime: 'function execution time',  
  errorRate: 'ratio of failed to successful calls',
  aiProviderDistribution: 'usage across Gemini/OpenAI/Cohere',
  securityEvents: 'count by event type'
};
```

## Success Criteria

### Functional Requirements ✅
- ✅ Chat responds with AI-generated content (no "technical difficulties")
- ✅ User profile integrated into responses
- ✅ Scholarship/opportunity data referenced appropriately  
- ✅ Chat history maintains conversation context
- ✅ Multi-LLM fallback system working
- ✅ New session creation and management

### Performance Requirements ✅
- ✅ Response time < 5 seconds for 95% of requests
- ✅ Rate limiting prevents abuse (15 messages/minute)
- ✅ Graceful degradation under load
- ✅ Memory usage within Firebase limits

### Security Requirements ✅
- ✅ Input validation and sanitization
- ✅ Authentication and authorization
- ✅ Security event logging
- ✅ Spam and abuse prevention
- ✅ User blocking for violations

### User Experience Requirements ✅
- ✅ Responses feel natural and helpful
- ✅ Context-aware conversations
- ✅ Relevant recommendations
- ✅ Clear error messages
- ✅ Session continuity

## Troubleshooting Common Issues

### "Function timeout" errors
- Check AI service response times
- Optimize database queries  
- Reduce context size if needed

### "Permission denied" errors
- Verify Firebase security rules
- Check user authentication tokens
- Confirm Firestore permissions

### "Rate limit exceeded" errors  
- Expected behavior for spam protection
- Verify rate limits are reasonable
- Check security logs for patterns

### Poor response quality
- Verify user profile data completeness
- Check scholarship database content
- Review AI prompt engineering
- Monitor AI service selection

## Final Verification Checklist

- [ ] Local testing passes all scenarios
- [ ] Production deployment successful  
- [ ] Frontend integration working
- [ ] Performance metrics acceptable
- [ ] Security validation active
- [ ] Error handling graceful
- [ ] Monitoring and logging operational
- [ ] User acceptance testing positive

## Support and Maintenance

### Regular Health Checks
- Weekly: Review error logs and performance metrics
- Monthly: Analyze user feedback and usage patterns  
- Quarterly: Update AI prompts and enhance features

### Scaling Considerations
- Monitor Firebase quotas and billing
- Consider switching to dedicated hosting for high volume
- Implement caching for frequently accessed data
- Add CDN for global performance

---

**Contact Information:**
- Technical Issues: Check Firebase Console logs
- Feature Requests: Create GitHub issues  
- Performance Issues: Monitor dashboard alerts