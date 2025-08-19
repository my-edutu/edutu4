# Cloudflare Turnstile Integration Setup Guide

This guide explains how to complete the setup and configuration of Cloudflare Turnstile for bot protection in your React + Firebase signup flow.

## 🎯 What's Implemented

Your application now includes:

✅ **Modular Turnstile Widget Component** (`src/components/ui/TurnstileWidget.tsx`)
✅ **Enhanced Signup Form** with CAPTCHA validation (`src/components/AuthScreen.tsx`)
✅ **Turnstile Service** for frontend integration (`src/services/turnstileService.ts`)
✅ **Firebase Cloud Functions** for server-side validation (`functions/src/routes/turnstile.ts`)
✅ **Complete TypeScript Support** with proper error handling

## 🔧 Setup Steps

### 1. Get Cloudflare Turnstile Credentials

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** in the sidebar
3. Click **Add Site**
4. Configure your site:
   - **Site Name**: Your app name (e.g., "Edutu AI Signup")
   - **Domains**: Add your domains:
     - `localhost` (for development)
     - `your-domain.com` (production)
     - `your-app-name.web.app` (Firebase Hosting)
     - `your-app-name.firebaseapp.com` (Firebase default domain)
   - **Widget Mode**: Managed (recommended)
5. Copy your **Site Key** and **Secret Key**

### 2. Configure Environment Variables

#### Frontend Configuration
Create or update your `.env` file in the project root:

```env
# Add this to your existing Firebase configuration
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAABkMYinukE7pMgW
```

#### Firebase Functions Configuration
Set the secret key for your Firebase Functions:

```bash
# Navigate to your functions directory
cd functions

# Set the Turnstile secret key
firebase functions:config:set turnstile.secret_key="YOUR_SECRET_KEY_HERE"
```

### 3. Update Service Configuration

Edit `src/services/turnstileService.ts` and update the functions URL:

```typescript
private static readonly FUNCTIONS_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://us-central1-your-actual-project-id.cloudfunctions.net'
  : 'http://localhost:5001/your-actual-project-id/us-central1';
```

Replace `your-actual-project-id` with your Firebase project ID.

### 4. Deploy Firebase Functions

```bash
# Build and deploy functions
cd functions
npm run build
firebase deploy --only functions
```

This will deploy:
- `verifyTurnstile`: Standalone CAPTCHA verification
- `signupWithTurnstile`: Pre-signup validation with CAPTCHA

### 5. Test the Integration

#### Development Testing
1. Start your development server: `npm run dev`
2. Navigate to the signup page
3. You should see:
   - CAPTCHA widget appears below the form fields
   - "CAPTCHA is disabled in development mode" notice (if no site key configured)
   - Submit button is disabled until CAPTCHA is completed

#### Production Testing
1. Deploy to Firebase Hosting: `npm run build && firebase deploy --only hosting`
2. Test with real Turnstile widget
3. Verify server-side validation works

## 🎨 Customization Options

### Theme Configuration
The Turnstile widget automatically matches your app's dark mode:

```typescript
// In AuthScreen.tsx - already configured
theme={isDarkMode ? 'dark' : 'light'}
```

### Size Options
Change widget size in `AuthScreen.tsx`:

```typescript
size="compact"  // or "normal"
```

### Advanced Configuration
Modify `TurnstileWidget.tsx` for custom behavior:

```typescript
// Custom retry behavior
retry: 'auto'           // 'auto', 'never'
'retry-interval': 8000  // milliseconds

// Custom refresh behavior  
'refresh-expired': 'auto'  // 'auto', 'manual', 'never'
```

## 🔒 Security Features

### Rate Limiting
- Built-in rate limiting in Cloud Functions
- IP-based request limiting
- Automatic retry mechanisms

### Input Validation
- Token format validation
- Request sanitization
- Error code mapping

### Security Logging
- All verification attempts logged
- Security events tracked
- Error monitoring included

## 🧪 Testing Different Scenarios

### Development Mode
- CAPTCHA disabled by default
- Shows warning notice
- Allows signup without verification

### Production Mode
- Full CAPTCHA validation required
- Server-side verification enforced
- Proper error handling

### Test Invalid Scenarios
1. **Expired Token**: Wait for CAPTCHA to expire, then try to submit
2. **Network Error**: Test with offline mode
3. **Invalid Token**: Manually modify token in browser dev tools
4. **Rate Limiting**: Submit multiple requests rapidly

## 📊 Monitoring & Analytics

### Firebase Functions Logs
Monitor CAPTCHA verification in Firebase Console:
1. Go to Firebase Console → Functions
2. View logs for `verifyTurnstile` and `signupWithTurnstile`
3. Check for verification success/failure rates

### Cloudflare Turnstile Analytics
View CAPTCHA statistics in Cloudflare Dashboard:
1. Go to Cloudflare Dashboard → Turnstile
2. Select your site
3. View challenge completion rates, bot detection, etc.

## 🐛 Troubleshooting

### Common Issues

**Issue**: "CAPTCHA verification failed"
- **Solution**: Check that your site key matches your domain
- Verify Firebase Functions are deployed
- Check network connectivity

**Issue**: Widget doesn't appear
- **Solution**: Verify `VITE_TURNSTILE_SITE_KEY` is set
- Check browser console for JavaScript errors
- Ensure Cloudflare script loads properly

**Issue**: "Server configuration error"
- **Solution**: Set Firebase Functions config:
  ```bash
  firebase functions:config:set turnstile.secret_key="YOUR_SECRET_KEY"
  ```

**Issue**: CORS errors in production
- **Solution**: Add your production domain to Turnstile site configuration
- Verify Firebase Functions CORS settings

### Debug Mode
Enable debug logging by setting localStorage:

```javascript
// In browser console
localStorage.setItem('turnstile_debug', 'true');
```

## 🚀 Production Checklist

- [ ] Site key configured in `.env`
- [ ] Secret key set in Firebase Functions config
- [ ] Functions deployed to production
- [ ] Domains added to Turnstile site configuration
- [ ] Production URLs updated in `turnstileService.ts`
- [ ] CAPTCHA working on signup form
- [ ] Server-side validation preventing user creation without CAPTCHA
- [ ] Error messages properly displayed
- [ ] Dark mode theme working correctly

## 📝 Flow Summary

1. **User visits signup page** → Turnstile widget loads
2. **User fills form** → Submit button disabled until CAPTCHA completed
3. **User completes CAPTCHA** → Token generated, submit button enabled
4. **User submits form** → Token sent to `signupWithTurnstile` Cloud Function
5. **Server validates token** → Calls Cloudflare API for verification
6. **If valid** → Returns success, allows Firebase Auth signup to proceed
7. **If invalid** → Returns error, prevents user creation, resets CAPTCHA

This creates a secure signup flow where bots cannot create accounts without completing the CAPTCHA challenge.

## 🎯 Next Steps

1. **Configure your actual Turnstile credentials**
2. **Deploy Firebase Functions**
3. **Test the complete flow**
4. **Monitor analytics and adjust as needed**

Your Turnstile integration is now ready for production use! 🎉