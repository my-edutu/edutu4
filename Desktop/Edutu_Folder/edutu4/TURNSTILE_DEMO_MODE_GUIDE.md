# 🔧 Turnstile Demo Mode Guide

## 🎯 Overview

The Turnstile integration now supports **Demo Mode** - a development-friendly simulation that allows you to test the complete CAPTCHA verification flow without requiring:
- Live Cloudflare Turnstile service
- Firebase Functions deployment
- Production server setup

Perfect for development, testing, and demonstrations!

## 🚀 Quick Start

### Enable Demo Mode

Add to your `.env` file:
```bash
VITE_TURNSTILE_DEMO_MODE=true
```

### Use in Your Component

```tsx
import TurnstileWidget from './ui/TurnstileWidget';
import { useTurnstile } from '../services/turnstileService';

function MyForm() {
  const { siteKey, isDemoMode } = useTurnstile();

  const handleVerification = (token: string) => {
    console.log('Token received:', token);
    // Process the demo token
  };

  return (
    <TurnstileWidget
      siteKey={siteKey}
      onVerify={handleVerification}
      demoMode={isDemoMode} // Automatically detected from env
    />
  );
}
```

## 🎨 Demo Mode Features

### 1. **Interactive Demo Widget**
- Beautiful, branded UI that simulates CAPTCHA experience
- Click-to-verify button with loading states
- Realistic verification delays (1-2 seconds)
- Demo mode indicator for clarity

### 2. **Realistic Token Generation**
- Generates demo tokens with format: `demo_token_{timestamp}_{random}`
- Tokens pass validation checks
- Unique tokens for each verification

### 3. **Simulated Backend Responses**
- Mock verification responses with realistic data
- Success rates and confidence scores
- Simulated network delays
- Occasional failures for testing error handling

### 4. **Complete Service Layer**
- All TurnstileService methods work in demo mode
- `verifyToken()` and `preValidateSignup()` fully functional
- Comprehensive logging for debugging

## 📋 Demo Mode Behavior

### Widget Appearance
```
┌─────────────────────────────────────┐
│  🔒  Demo Security Verification     │
│                                     │
│    [ Complete Demo Verification ]   │
│                                     │
│  Demo mode active - Click to verify │
└─────────────────────────────────────┘
```

### Token Format
```typescript
// Example demo token
"demo_token_1704067200000_abc123def456"
//          ↑               ↑
//       timestamp      random string
```

### Service Responses
```json
{
  "success": true,
  "message": "Demo verification successful",
  "verified": true,
  "score": 0.9,
  "action": "demo-verification"
}
```

## 🔧 Integration Examples

### Basic Integration
```tsx
import React, { useState } from 'react';
import TurnstileWidget from './ui/TurnstileWidget';
import { useTurnstile } from '../services/turnstileService';

const SignupForm = () => {
  const [token, setToken] = useState<string | null>(null);
  const { siteKey, isDemoMode, verifyToken } = useTurnstile();

  const handleTurnstileVerify = (turnstileToken: string) => {
    setToken(turnstileToken);
  };

  const handleSubmit = async () => {
    if (!token) return;
    
    // This works in both demo and production mode
    const result = await verifyToken(token, 'user@example.com');
    
    if (result.success) {
      console.log('✅ Verification successful!');
      // Proceed with signup
    } else {
      console.log('❌ Verification failed:', result.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
      
      <TurnstileWidget
        siteKey={siteKey}
        onVerify={handleTurnstileVerify}
        demoMode={isDemoMode}
      />
      
      <button type="submit" disabled={!token}>
        {isDemoMode ? 'Demo Signup' : 'Sign Up'}
      </button>
    </form>
  );
};
```

### Advanced Integration with Signup Validation
```tsx
const AdvancedSignup = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    age: 0
  });
  const [token, setToken] = useState<string | null>(null);
  const { preValidateSignup } = useTurnstile();

  const handleSubmit = async () => {
    if (!token) return;

    // Pre-validate with Turnstile before Firebase Auth
    const validation = await preValidateSignup({
      turnstileToken: token,
      email: formData.email,
      name: formData.name,
      age: formData.age
    });

    if (validation.success) {
      // Proceed with actual Firebase signup
      console.log('✅ Pre-validation successful');
    } else {
      console.log('❌ Pre-validation failed:', validation.message);
    }
  };

  return (
    <div>
      {/* Form implementation */}
      <TurnstileWidget
        siteKey="your-site-key"
        onVerify={setToken}
        demoMode={true}
      />
    </div>
  );
};
```

## 🧪 Testing Scenarios

### 1. **Success Flow Testing**
- Demo mode provides 90% success rate
- Realistic confidence scores (0.8-0.9)
- Proper token format validation

### 2. **Error Handling Testing**
- 10% simulated failure rate
- Various error scenarios
- Network delay simulation

### 3. **UI State Testing**
- Loading states during verification
- Success/error visual feedback
- Reset functionality

## 📊 Demo Mode vs Production

| Feature | Demo Mode | Production Mode |
|---------|-----------|-----------------|
| **CAPTCHA Widget** | Custom demo UI | Real Cloudflare widget |
| **Token Format** | `demo_token_*` | Cloudflare format |
| **Verification** | Simulated locally | Real server validation |
| **Network Calls** | None required | Firebase Functions |
| **Delays** | Simulated (1-2s) | Real network latency |
| **Failure Rate** | 10% (configurable) | Based on actual challenges |

## 🔄 Switching Between Modes

### Development (Demo Mode)
```bash
# .env
VITE_TURNSTILE_DEMO_MODE=true
VITE_TURNSTILE_SITE_KEY=0x4AAAAAABo5rHoCzvGsSPvI
```

### Production (Live Mode)
```bash
# .env
VITE_TURNSTILE_DEMO_MODE=false
VITE_TURNSTILE_SITE_KEY=your-real-site-key
```

### Automatic Detection
The system automatically detects demo mode from environment variables:
```typescript
const isDemoMode = import.meta.env.VITE_TURNSTILE_DEMO_MODE === 'true';
```

## 🎭 Testing with the Demo Component

A complete testing component is available at:
```
src/examples/TurnstileDemoExample.tsx
```

This provides:
- ✅ Full demo mode showcase
- ✅ Interactive testing interface  
- ✅ Integration examples
- ✅ Real-time result display
- ✅ Code snippets and documentation

## 🔍 Debug Information

### Console Logging
Demo mode provides comprehensive logging:
```javascript
🔧 Demo mode: Simulating Turnstile verification
🔧 Demo mode: Simulating signup validation
✅ Token verification result: {...}
🔍 Signup validation result: {...}
```

### Visual Indicators
- Demo mode badge in widget
- Blue color scheme for demo elements
- Clear "Demo Mode Active" labels
- Distinctive styling from production widgets

## ⚙️ Configuration Options

### Environment Variables
```bash
# Enable/disable demo mode
VITE_TURNSTILE_DEMO_MODE=true

# Site key (works in both modes)
VITE_TURNSTILE_SITE_KEY=0x4AAAAAABo5rHoCzvGsSPvI
```

### Component Props
```tsx
<TurnstileWidget
  demoMode={true}           // Force demo mode
  siteKey="site-key"        // Required in both modes
  onVerify={handleVerify}   // Token callback
  onError={handleError}     // Error callback
  theme="auto"              // Light/dark/auto
  size="normal"             // Normal/compact
/>
```

### Service Configuration
```typescript
// Check demo mode status
const isDemoMode = TurnstileService.isDemoMode();

// Service methods work identically in both modes
const result = await TurnstileService.verifyToken(token);
```

## 🚀 Production Readiness

### When to Use Demo Mode
- ✅ Local development
- ✅ Testing and QA
- ✅ Demonstrations
- ✅ CI/CD pipelines
- ✅ Before Firebase upgrade

### When to Switch to Production
- ✅ Firebase project upgraded to Blaze plan
- ✅ Secret key configured in Firebase Functions
- ✅ Real domain verification needed
- ✅ Actual bot protection required

### Migration Checklist
1. Set `VITE_TURNSTILE_DEMO_MODE=false`
2. Configure real Turnstile site key
3. Deploy Firebase Functions
4. Test production verification flow
5. Monitor security events

## 🎯 Benefits

### For Developers
- **Faster Development**: No external dependencies
- **Easier Testing**: Predictable behavior
- **Better Debugging**: Comprehensive logging
- **Seamless Integration**: Same API in both modes

### For Teams
- **Demo-Ready**: Perfect for presentations
- **QA Testing**: Consistent test scenarios  
- **Development Velocity**: No setup blockers
- **Cost Effective**: No Firebase costs during development

### For Users
- **Smooth Experience**: Identical user flow
- **Visual Consistency**: Professional appearance
- **Clear Expectations**: Demo mode indicators
- **Reliable Testing**: Predictable outcomes

## 🔚 Summary

Demo mode provides a complete, production-ready Turnstile integration that works immediately without any external setup. Perfect for development, testing, and demonstrations while maintaining full compatibility with production deployment.

**Ready to integrate!** 🎉