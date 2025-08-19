# Goals System Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the Edutu Goals System backend. The system includes a complete goals management platform with marketplace functionality, admin dashboard, and AI-powered features.

## System Architecture

### Core Components

1. **Firebase Functions** - Backend API and scheduled tasks
2. **Firestore Database** - Data storage with security rules
3. **Firebase Authentication** - User management and role-based access
4. **AI Integration** - Google Gemini for goal generation and recommendations

### New Collections

- `goalTemplates` - Pre-built goal templates
- `marketplaceGoals` - Community-submitted goals
- `userGoals` - Individual user goal instances  
- `goalSessions` - Goal activity tracking
- `goalSubscriptions` - Marketplace goal subscriptions
- `adminModerationQueue` - Content moderation queue
- `systemAnalytics` - Analytics and reporting data
- `systemLogs` - System activity logs

## Pre-Deployment Setup

### 1. Environment Variables

Add these environment variables to your Firebase Functions configuration:

```bash
# Required for AI features
firebase functions:config:set gemini.api_key="your_gemini_api_key"

# Required for admin features  
firebase functions:config:set admin.master_key="your_secure_master_key"
```

### 2. Firebase Project Configuration

Ensure your Firebase project has:
- Firestore Database enabled
- Firebase Authentication enabled
- Firebase Functions enabled (Blaze plan required for external API calls)

### 3. Admin User Setup

Set up admin users with custom claims:

```javascript
// Run this once to set up your first admin user
const admin = require('firebase-admin');
admin.auth().setCustomUserClaims('your-admin-user-id', {
  admin: true,
  role: 'admin',
  permissions: ['moderate', 'analytics', 'user_management']
});
```

## Deployment Steps

### 1. Build the Functions

```bash
cd functions
npm run build
```

### 2. Deploy Firebase Functions

```bash
firebase deploy --only functions
```

### 3. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 4. Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

### 5. Seed Goal Templates (One-time)

After deployment, call the seed function to populate initial goal templates:

```bash
curl -X POST https://your-region-your-project.cloudfunctions.net/seedGoalTemplates \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## API Endpoints

### Goals System Endpoints

```
GET /api/goals/templates - Get goal templates
GET /api/goals/templates/recommended - Get personalized recommendations
GET /api/goals/marketplace/search - Search marketplace goals
GET /api/goals/marketplace/featured - Get featured goals
POST /api/goals - Create new goal
GET /api/goals/user/:userId - Get user's goals
PUT /api/goals/:goalId/progress - Update goal progress
POST /api/goals/:goalId/submit-to-marketplace - Submit to marketplace
```

### Admin Dashboard Endpoints

```
GET /api/admin/moderation/queue - Get moderation queue
POST /api/admin/moderation/goals/:goalId/moderate - Moderate goal
GET /api/admin/analytics/overview - Get system analytics
GET /api/admin/analytics/goals - Get goal analytics
GET /api/admin/users - Get user list
PUT /api/admin/users/:userId/role - Update user role
```

## Scheduled Functions

The system includes these automated tasks:

- **Daily Analytics** (1 AM UTC) - Generate daily system metrics
- **Weekly Reminders** (Monday 9 AM UTC) - Send goal reminders
- **Monthly Analytics** (1st of month, 3 AM UTC) - Generate monthly reports  
- **Progress Stall Detection** (6 PM UTC) - Send encouragement to inactive users
- **Auto-Moderation** (Every 4 hours) - Automatically moderate simple cases
- **Data Cleanup** (Sunday 4 AM UTC) - Clean up old sessions and logs

## Security Features

### Authentication & Authorization

- JWT token verification on all endpoints
- Role-based access control (user, moderator, admin)
- User ownership validation for personal data
- Rate limiting (100 requests per 15 minutes per IP)

### Data Protection

- Firestore security rules prevent unauthorized access
- Input validation on all endpoints
- SQL injection prevention through Firestore SDK
- File upload restrictions and virus scanning

### Content Moderation

- Automated moderation for obvious violations
- Human moderation queue for complex cases
- Community flagging system
- Admin override capabilities

## Performance Optimization

### Database Indexing

All required Firestore indexes are defined in `firestore.indexes.json`:
- User goal queries
- Marketplace search and filtering
- Analytics aggregation
- Moderation queue sorting

### Caching Strategy

- Template data cached in memory
- Popular marketplace goals cached
- Analytics data cached for 1 hour
- User session data cached for 15 minutes

### Function Optimization

- Memory allocation based on function complexity
- Timeout settings appropriate for each function type
- Connection pooling for database operations
- Batch operations where possible

## Monitoring & Analytics

### Built-in Analytics

- Daily/weekly/monthly system metrics
- User engagement tracking
- Goal completion rates
- Marketplace activity analysis

### Error Monitoring

- Structured logging with Winston
- Error aggregation in system logs
- Real-time alerting for critical failures
- Performance monitoring

### Health Checks

```
GET /health - Basic health check
GET /api/admin/system/health - Detailed system health
```

## Troubleshooting

### Common Issues

1. **Functions Timeout**
   - Check memory allocation in function configuration
   - Optimize database queries
   - Implement proper error handling

2. **Permission Errors**
   - Verify Firestore security rules
   - Check user authentication tokens
   - Validate admin role assignments

3. **AI Integration Issues**
   - Verify Gemini API key configuration
   - Check API quota limits
   - Implement fallback for AI failures

4. **Database Performance**
   - Monitor index usage
   - Optimize query patterns
   - Implement pagination for large datasets

### Debugging

Enable detailed logging:

```bash
firebase functions:log --only api
```

Check system health:

```bash
curl https://your-region-your-project.cloudfunctions.net/api/admin/system/health
```

## Scaling Considerations

### Database Scaling

- Implement database sharding for large user bases
- Use sub-collections for user-specific data
- Archive old data to Cloud Storage
- Implement read replicas for analytics

### Function Scaling

- Monitor concurrent executions
- Optimize cold start performance
- Implement circuit breakers for external APIs
- Use pub/sub for async processing

### Cost Optimization

- Monitor function invocations and duration
- Optimize database read/write operations
- Implement intelligent caching
- Use scheduled functions for batch operations

## Security Checklist

- [ ] Environment variables configured
- [ ] Firestore security rules deployed
- [ ] Admin users configured with proper roles
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error messages don't expose sensitive data
- [ ] HTTPS enforced for all endpoints
- [ ] Authentication required for all operations

## Post-Deployment Testing

### Functional Testing

1. Test goal template retrieval
2. Test goal creation with different sources
3. Test progress tracking and analytics
4. Test marketplace submission and moderation
5. Test admin dashboard functionality
6. Test scheduled function execution

### Performance Testing

1. Load test API endpoints
2. Test database query performance
3. Monitor function execution times
4. Test concurrent user scenarios

### Security Testing

1. Test authentication bypass attempts
2. Test role-based access controls
3. Test input validation edge cases
4. Test rate limiting effectiveness

## Maintenance

### Regular Tasks

- Monitor system analytics for trends
- Review and process moderation queue
- Update goal templates based on user feedback
- Optimize database queries based on usage patterns
- Review and update security rules

### Updates

- Keep Firebase SDK updated
- Update Node.js runtime as needed
- Review and update dependencies
- Monitor for security vulnerabilities

## Support

For issues with the Goals System:

1. Check system logs in Firebase Console
2. Review error reports in system analytics
3. Test with the health check endpoints
4. Contact the development team with specific error messages

---

*This documentation should be updated as the system evolves. Last updated: [Current Date]*