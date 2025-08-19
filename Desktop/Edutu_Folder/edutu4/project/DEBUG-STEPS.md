# Edutu White Screen Debug Guide

## What I Fixed

### 1. **Vite Configuration**
- ✅ Fixed server port from 5180 to 5182 (matching your access URL)
- ✅ Enabled HMR overlay for better error visibility
- ✅ Added host: true for network access

### 2. **Enhanced Error Handling**
- ✅ Added global error handlers in main.tsx
- ✅ Improved console logging throughout the application
- ✅ Created fallback error screens with detailed error messages

### 3. **CSS and Styling Fixes**
- ✅ Added missing CSS rules for proper body/root element sizing
- ✅ Enhanced CSS variables with fallbacks
- ✅ Added important flags to critical background utilities

### 4. **Component Debugging**
- ✅ Created TestComponent for basic React verification
- ✅ Created DebugScreen for user-friendly error reporting  
- ✅ Created AppMinimal for testing without complex dependencies

## Test Steps (In Order)

### Step 1: Test Basic React (Currently Active)
- **File**: index.html now points to `/src/main-test.tsx`
- **What it does**: Loads minimal TestComponent to verify React works
- **Expected result**: Green success screen with checkmarks
- **If it works**: React/Vite/CSS are working - issue is in app components
- **If it fails**: Core setup problem (check browser console)

### Step 2: Test Minimal App
1. Edit `index.html` line 14 to use `/src/main-minimal.tsx`
2. This loads a simplified app without Firebase/complex hooks
3. Should show the landing page with basic functionality

### Step 3: Test Full App with Better Error Handling  
1. Edit `index.html` line 14 back to `/src/main.tsx`
2. Check browser console for detailed error logs
3. The enhanced error handling will show exactly what's failing

## Common Issues and Solutions

### Issue 1: Firebase Configuration
**Symptoms**: White screen, console errors about Firebase
**Solution**: Check if `.env` file exists with proper Firebase config

### Issue 2: Import/Export Errors
**Symptoms**: Module not found errors in console
**Solution**: Check file paths and component exports

### Issue 3: CSS/Tailwind Not Loading
**Symptoms**: Unstyled content or completely blank
**Solution**: Verify Tailwind CSS is compiling properly

### Issue 4: TypeScript Compilation Errors
**Symptoms**: Build fails, white screen
**Solution**: Check terminal for TypeScript errors

## Browser Console Commands for Debugging

```javascript
// Check if React is loaded
console.log('React:', typeof React);

// Check if root element exists  
console.log('Root element:', document.getElementById('root'));

// Check current errors
console.log('Errors:', window.errors);

// Force reload without cache
location.reload(true);
```

## File Reference

- **main.tsx**: Original entry point (enhanced with error handling)
- **main-test.tsx**: Basic React test (currently active)
- **main-minimal.tsx**: Simplified app without complex dependencies
- **App.tsx**: Original full app (enhanced with debugging)
- **App-minimal.tsx**: Simplified version for testing
- **TestComponent.tsx**: Basic React verification
- **DebugScreen.tsx**: User-friendly error display

## Next Steps

1. **If TestComponent works**: Switch to minimal app to test components
2. **If minimal app works**: Issue is in Firebase/auth/complex hooks
3. **If nothing works**: Check Vite dev server logs and browser network tab

## Reverting Changes

To restore original functionality:
1. Edit `index.html` line 14 back to `/src/main.tsx`
2. All original files are preserved and enhanced, not replaced

---

**Status**: Test mode active - check if you see the green TestComponent screen!