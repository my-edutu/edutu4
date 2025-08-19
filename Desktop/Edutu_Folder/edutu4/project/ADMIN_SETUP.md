# Admin Dashboard Setup Guide

This guide explains how to set up and use the admin dashboard for the Edutu goals system.

## Features

### 🎯 Admin Dashboard Features

1. **Moderation Queue**
   - Review goals submitted to marketplace
   - Approve/reject with reasons
   - Bulk actions for multiple items
   - Preview goal content and roadmaps

2. **Analytics Dashboard** 
   - Goal creation statistics
   - User engagement metrics
   - Popular templates and categories
   - System health monitoring

3. **User Management**
   - View user accounts and activity
   - Manage user roles and permissions
   - Handle user reports and issues

4. **Content Management**
   - Manage goal templates
   - Featured goals selection
   - Category management
   - Content policies

## Setup Instructions

### 1. Initial Admin User Creation

Since this is integrated into the main app, you need to create admin users manually:

#### Method 1: Using Browser Console (Development)

1. First, create a regular user account through the app
2. Note the user's UID (found in browser dev tools → Application → Local Storage or Firebase Console)
3. Open browser console and run:

```javascript
// Import the admin setup utility
import { promoteUserToAdmin } from './src/utils/adminSetup.ts';

// Promote user to admin
await promoteUserToAdmin('USER_UID_HERE', 'admin');

// Or create admin directly if you have user details
import { createAdminUser } from './src/utils/adminSetup.ts';
await createAdminUser('USER_UID_HERE', 'admin@example.com', 'Admin Name', 'admin');
```

#### Method 2: Firebase Console (Production)

1. Go to Firebase Console → Firestore Database
2. Create a new collection called `admins`
3. Add a document with the user's UID as the document ID:

```json
{
  "email": "admin@example.com",
  "name": "Admin Name",
  "role": "admin",
  "permissions": ["moderation", "user_management", "analytics", "system_settings"],
  "createdAt": "2024-01-01T00:00:00Z",
  "isActive": true
}
```

### 2. Accessing Admin Dashboard

1. Log in with your admin user account
2. Go to Profile → Settings
3. You should see "Admin Dashboard" option (only visible to admin users)
4. Click to access the admin panel

### 3. Admin Roles and Permissions

#### Admin Role
- Full access to all features
- Can manage users, moderate content, view analytics
- Can access system settings

#### Moderator Role  
- Limited to moderation features
- Can approve/reject goals and content
- Cannot manage users or system settings

## Firebase Security Rules

Add these security rules to your Firestore to protect admin data:

```javascript
// Add to your firestore.rules file
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin collection - only admins can read/write
    match /admins/{userId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isActive == true;
    }
    
    // Moderation queue - only admins can access
    match /moderation_queue/{moderationId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Regular users can submit for moderation
    match /moderation_queue/{moderationId} {
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.submittedBy;
    }
    
    // Goals can be read by owners or admins
    match /goals/{goalId} {
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         exists(/databases/$(database)/documents/admins/$(request.auth.uid)));
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## API Endpoints

The admin system uses the following Firebase collections:

- `admins` - Admin user records
- `moderation_queue` - Items pending moderation
- `goals` - User goals (extended with moderation fields)
- `users` - Regular user accounts

## Development Notes

### Adding New Admin Features

1. Update `AdminService` class with new methods
2. Add corresponding UI components to `AdminDashboard`
3. Update types in `types/common.ts` if needed
4. Test with proper permissions

### Security Considerations

- Admin access is checked on both client and server side
- All admin operations are logged for audit purposes
- Rate limiting is applied to prevent abuse
- Admin actions require re-authentication for sensitive operations

## Troubleshooting

### "Access Denied" Error
- Verify user has admin record in `admins` collection
- Check `isActive` field is `true`
- Ensure proper role (`admin` or `moderator`)

### Admin Dashboard Not Showing
- Clear browser cache and reload
- Check browser console for JavaScript errors
- Verify Firebase connection is working

### Moderation Queue Empty
- Check if any goals have been submitted for moderation
- Verify Firebase security rules allow admin access
- Look for network errors in browser dev tools

## Production Deployment

For production deployment:

1. Use Firebase Admin SDK for server-side admin creation
2. Implement proper audit logging
3. Set up monitoring and alerts
4. Configure backup and recovery procedures
5. Regular security audits

## Support

For issues or questions about the admin system:

1. Check browser console for errors
2. Verify Firebase configuration
3. Review security rules
4. Check admin user permissions

The admin dashboard provides comprehensive tools for managing the Edutu goals system while maintaining security and user privacy.