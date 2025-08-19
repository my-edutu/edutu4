# 🚀 Development Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Required for AI features
ANTHROPIC_API_KEY=your-anthropic-key-here
# OR
OPENAI_API_KEY=your-openai-key-here

# Optional - will use defaults if not provided
MAX_FILE_SIZE_MB=25
RATE_LIMIT_MAX_REQUESTS=50
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Initialize Firebase (First Time Only)
```bash
# Login to Firebase
firebase login

# Set your project
firebase use your-project-id

# Initialize if needed
firebase init functions
```

### 4. Start Development Server
```bash
npm run dev
```

This will:
- ✅ Compile TypeScript
- ✅ Start Firebase emulators (Functions, Firestore, Storage)
- ✅ Enable hot reloading
- ✅ Open Emulator UI at http://localhost:4000

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start full development environment |
| `npm run build` | Compile TypeScript |
| `npm run serve` | Start only Functions emulator |
| `npm run test` | Run tests |
| `npm run lint` | Check code style |
| `npm run deploy` | Deploy to production |

## Development URLs

- **API Base**: `http://localhost:5001/your-project-id/us-central1/cv`
- **Emulator UI**: `http://localhost:4000`
- **Firestore**: `http://localhost:8080`
- **Storage**: `http://localhost:9199`

## API Endpoints (Local)

### Upload CV
```bash
curl -X POST \
  http://localhost:5001/your-project-id/us-central1/cv/api/upload/cv \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -F "file=@test-cv.pdf"
```

### Health Check
```bash
curl http://localhost:5001/your-project-id/us-central1/cv/health
```

## Testing with Your Frontend

Update your frontend to point to local emulator:

```javascript
// For development
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5001/your-project-id/us-central1/cv'
  : 'https://us-central1-your-project-id.cloudfunctions.net/cv';

// Use in your API calls
fetch(`${API_BASE_URL}/api/upload/cv`, { ... });
```

## Debugging

### View Logs
```bash
# In another terminal
firebase functions:log
```

### Debug Mode
Add to your `.env`:
```env
LOG_LEVEL=debug
DEBUG_MODE=true
```

### Common Issues

1. **Port conflicts**: Stop other services on ports 5001, 8080, 9199
2. **Firebase CLI outdated**: `npm install -g firebase-tools`
3. **Node version**: Ensure you're using Node 18+
4. **Authentication**: Get Firebase token from your frontend app

## File Structure

```
cv-backend/
├── src/
│   ├── index.ts          # Main entry point
│   ├── services/         # Business logic
│   ├── routes/           # API endpoints
│   ├── middleware/       # Auth, validation, etc.
│   └── utils/            # Helpers
├── lib/                  # Compiled JS (auto-generated)
├── .env                  # Your environment variables
└── firebase.json         # Firebase configuration
```

## Development Workflow

1. Make changes to TypeScript files in `src/`
2. Save files - TypeScript will auto-compile
3. Firebase emulator will auto-reload functions
4. Test your changes via the API
5. Check logs in terminal or Emulator UI
6. Commit when ready

## Mock Data for Testing

The system includes mock AI responses when API keys aren't configured, so you can test the full flow without external dependencies.

Happy coding! 🎉