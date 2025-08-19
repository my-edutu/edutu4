# 🎓 Edutu CV Management Backend

Enterprise-grade serverless CV management system built with Firebase Cloud Functions, featuring AI-powered optimization, ATS compatibility analysis, OCR processing, and professional CV building capabilities.

## 🏗️ Architecture Overview

This system implements a microservices architecture using Firebase Cloud Functions with the following core services:

- **Smart Upload & Scan**: PDF/DOCX/Image processing with OCR
- **AI-Powered Optimization**: CV analysis and improvement suggestions
- **ATS Compatibility Check**: Automated screening system analysis
- **Professional CV Builder**: Template-based CV creation
- **File Management**: Storage, conversion, and download services

## ✨ Features

### 🚀 Smart Upload & Scan
- Support for PDF, DOC, DOCX, JPG, JPEG, PNG, WebP
- Advanced OCR with Tesseract.js for scanned documents
- Automatic text extraction and confidence scoring
- Duplicate detection and file validation
- Thumbnail generation for images
- Instant format conversion (PDF ↔ DOCX)

### 🤖 AI-Powered Optimization
- Content improvement suggestions
- Keyword optimization analysis
- Structure and formatting recommendations  
- Industry-specific tips and guidance
- Downloadable optimized CV versions
- Historical optimization tracking

### 📊 ATS Compatibility Check
- Comprehensive ATS scoring (format, keywords, structure, readability)
- Compatibility reports with actionable fixes
- ATS simulation for major systems
- Best practices guidance
- Score trending and analytics

### 🔧 Professional CV Builder
- AI-guided step-by-step creation
- Multiple professional templates
- Live preview capabilities
- Export to PDF/DOCX formats
- Section-by-section building

## 🛠️ Technology Stack

### Core Technologies
- **Runtime**: Node.js 18 with TypeScript
- **Platform**: Firebase Cloud Functions (Serverless)
- **Database**: Cloud Firestore (NoSQL)
- **Storage**: Firebase Cloud Storage
- **Authentication**: Firebase Auth integration

### AI & Processing
- **AI Services**: Anthropic Claude / OpenAI GPT-4
- **OCR Engine**: Tesseract.js with image optimization
- **Image Processing**: Sharp for optimization and thumbnails
- **PDF Processing**: pdf-parse for text extraction
- **Document Processing**: Mammoth for DOCX files

### Infrastructure
- **Security**: Rate limiting, input validation, CORS
- **Monitoring**: Structured logging with performance metrics
- **Error Handling**: Comprehensive error tracking and reporting
- **Validation**: Joi for request validation

## 📋 Prerequisites

- Node.js 18+
- Firebase CLI
- Firebase Project with:
  - Cloud Functions enabled
  - Cloud Firestore enabled
  - Cloud Storage enabled
  - Authentication configured
- API Keys:
  - Anthropic AI API key (recommended)
  - OR OpenAI API key

## 🚀 Quick Start

### 1. Clone & Install

```bash
cd cv-backend
npm install
```

### 2. Environment Setup

Copy environment variables:
```bash
cp .env.example .env
```

Configure your `.env` file:
```env
# AI Service Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
AI_SERVICE_PROVIDER=anthropic

# File Processing
MAX_FILE_SIZE_MB=25
SUPPORTED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png,webp

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=50
RATE_LIMIT_MAX_UPLOADS=10
RATE_LIMIT_WINDOW_MS=900000

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
```

### 3. Firebase Setup

Login to Firebase:
```bash
firebase login
```

Set your project:
```bash
firebase use your-project-id
```

### 4. Development

Start local emulators:
```bash
npm run serve
```

Your functions will be available at:
- Main CV API: `http://localhost:5001/your-project/us-central1/cv`
- Firestore UI: `http://localhost:4000`

### 5. Deployment

Deploy to production:
```bash
npm run deploy
```

Deploy only CV functions:
```bash
npm run deploy:cv
```

## 📡 API Endpoints

### Smart Upload & Scan
```
POST /api/upload/cv          # Upload and process CV file
POST /api/upload/scan        # Scan CV from camera/image  
POST /api/upload/convert     # Convert CV format (PDF ↔ DOCX)
DELETE /api/upload/cv/:cvId  # Delete uploaded CV
```

### AI-Powered Optimization
```
POST /api/optimize/cv                    # Optimize CV with AI suggestions
GET /api/optimize/cv/:cvId/history       # Get optimization history
GET /api/optimize/:optimizationId        # Get specific optimization result
POST /api/optimize/industry-tips         # Generate industry-specific tips
POST /api/optimize/apply                 # Apply optimization suggestions
POST /api/optimize/generate-download     # Generate optimized download
GET /api/optimize/compare/:cvId/:optId   # Compare CV versions
GET /api/optimize/analytics              # Get optimization analytics
```

### ATS Compatibility Check
```
POST /api/ats/check                # Run ATS compatibility check
GET /api/ats/cv/:cvId/history      # Get ATS analysis history
GET /api/ats/:analysisId           # Get specific ATS analysis
POST /api/ats/optimize             # Generate ATS-optimized version
GET /api/ats/best-practices        # Get ATS best practices guide
POST /api/ats/simulate             # Run ATS simulation test
GET /api/ats/analytics             # Get ATS analytics
```

### CV Management
```
GET /api/cv                    # Get all user CVs
GET /api/cv/:cvId             # Get specific CV details
PUT /api/cv/:cvId             # Update CV metadata
DELETE /api/cv/:cvId          # Delete CV
GET /api/cv/analytics/summary # Get CV analytics summary
```

## 🔐 Authentication

All API endpoints require Firebase Auth token:

```javascript
// Request headers
{
  "Authorization": "Bearer <firebase-id-token>",
  "Content-Type": "application/json"
}
```

## 📊 Request/Response Examples

### Upload CV
```bash
curl -X POST \
  https://your-region-your-project.cloudfunctions.net/cv/api/upload/cv \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@resume.pdf"
```

```json
{
  "success": true,
  "data": {
    "cv": {
      "id": "cv_123456",
      "originalName": "resume.pdf",
      "extractedText": "John Doe\nSoftware Engineer...",
      "confidence": 98.5,
      "isProcessed": true
    },
    "extractionSummary": {
      "wordCount": 425,
      "characterCount": 2834,
      "confidence": 98.5,
      "method": "pdf-extract",
      "processingTime": 1250
    }
  }
}
```

### Optimize CV
```bash
curl -X POST \
  https://your-region-your-project.cloudfunctions.net/cv/api/optimize/cv \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "cvId": "cv_123456",
    "jobDescription": "Senior Software Engineer position...",
    "industry": "technology",
    "targetRole": "Software Engineer"
  }'
```

```json
{
  "success": true,
  "data": {
    "optimization": {
      "optimizationId": "opt_789012",
      "overallScore": 82,
      "suggestions": [
        {
          "category": "content",
          "severity": "high", 
          "title": "Add quantified achievements",
          "description": "Your CV lacks specific metrics...",
          "suggestion": "Replace generic descriptions with numbers"
        }
      ],
      "keywordAnalysis": {
        "currentKeywords": ["javascript", "react", "node.js"],
        "missingKeywords": ["typescript", "aws", "docker"]
      }
    }
  }
}
```

### ATS Compatibility Check
```bash
curl -X POST \
  https://your-region-your-project.cloudfunctions.net/cv/api/ats/check \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "cvId": "cv_123456",
    "jobDescription": "We are looking for a Senior Developer..."
  }'
```

```json
{
  "success": true,
  "data": {
    "analysis": {
      "atsScore": 78,
      "readinessLevel": "good",
      "scoreBreakdown": {
        "format": 85,
        "keywords": 72,
        "structure": 80,
        "readability": 75
      },
      "issues": [
        {
          "type": "keyword",
          "severity": "medium",
          "issue": "Low keyword density for target role",
          "fix": "Include more role-specific keywords"
        }
      ]
    }
  }
}
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | - | Anthropic Claude API key |
| `OPENAI_API_KEY` | - | OpenAI GPT API key |
| `AI_SERVICE_PROVIDER` | `anthropic` | AI service to use |
| `MAX_FILE_SIZE_MB` | `25` | Maximum file size in MB |
| `RATE_LIMIT_MAX_REQUESTS` | `50` | Max requests per window |
| `RATE_LIMIT_MAX_UPLOADS` | `10` | Max file uploads per window |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window (15 min) |
| `OCR_CONFIDENCE_THRESHOLD` | `60` | Minimum OCR confidence |
| `PDF_MAX_PAGES` | `20` | Maximum PDF pages to process |
| `CORS_ALLOWED_ORIGINS` | localhost | Allowed CORS origins |

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // CVs - users can only access their own
    match /cvs/{cvId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null 
        && request.auth.uid == resource.data.userId;
    }
    
    // Optimizations - users can only access their own
    match /optimizations/{optimizationId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null 
        && request.auth.uid == resource.data.userId;
    }
    
    // ATS Analyses - users can only access their own
    match /ats_analyses/{analysisId} {
      allow read, write: if request.auth != null 
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null 
        && request.auth.uid == resource.data.userId;
    }
    
    // Users collection (if used)
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
  }
}
```

### Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // CV documents - users can only access their own files
    match /cv-documents/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
    
    // Temporary processing files
    match /temp-processing/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
  }
}
```

## 🔧 Development

### Project Structure
```
cv-backend/
├── src/
│   ├── middleware/         # Auth, rate limiting, error handling
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic services
│   ├── utils/             # Utilities and helpers
│   ├── validators/        # Request validation schemas
│   └── index.ts           # Main application entry
├── functions/             # Individual Cloud Functions
├── tests/                # Test suites
└── docs/                 # Additional documentation
```

### Local Development

1. **Start Emulators**:
```bash
npm run serve
```

2. **Run Tests**:
```bash
npm test
```

3. **Lint Code**:
```bash
npm run lint
npm run lint:fix
```

4. **Build TypeScript**:
```bash
npm run build
```

### Adding New Features

1. Create service in `src/services/`
2. Add routes in `src/routes/`
3. Implement validation in `src/validators/`
4. Add tests in `tests/`
5. Update documentation

### Performance Monitoring

The system includes comprehensive logging and performance monitoring:

- Request/response logging
- AI service call tracking
- File processing metrics
- Error reporting with stack traces
- Rate limiting events

View logs:
```bash
npm run logs
```

## 🚨 Security Features

### Authentication & Authorization
- Firebase Auth token validation
- User-specific data access controls
- Admin-only endpoints with custom claims
- Request rate limiting per user

### Input Validation
- Comprehensive request validation with Joi
- File type and size validation
- Malicious content detection
- SQL injection prevention

### Data Protection
- Firestore security rules
- Storage bucket access controls
- Sensitive data sanitization in logs
- CORS configuration
- Request size limits

### Rate Limiting
- General API requests: 50 per 15 minutes
- File uploads: 10 per 15 minutes  
- AI operations: 20 per 15 minutes
- IP-based and user-based limiting

## 📈 Monitoring & Analytics

### Built-in Analytics
- CV upload/processing metrics
- AI optimization usage patterns
- ATS analysis trends
- Error rates and types
- Performance benchmarks

### Logging
- Structured JSON logging
- Request/response correlation IDs
- Performance timing
- Security event tracking
- Error stack traces

### Health Monitoring
Health check endpoint: `GET /health`

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "service": "edutu-cv-backend"
}
```

## 🔄 Integration with Frontend

### Client SDK Setup

```javascript
// Firebase config
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// API client
class CVAPIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
  
  async uploadCV(file, token) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${this.baseURL}/api/upload/cv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    return response.json();
  }
  
  async optimizeCV(cvId, options, token) {
    const response = await fetch(`${this.baseURL}/api/optimize/cv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cvId, ...options })
    });
    
    return response.json();
  }
}
```

### React Integration Example

```jsx
import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';

function CVUpload() {
  const [user] = useAuthState(auth);
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async (file) => {
    if (!user) return;
    
    setUploading(true);
    try {
      const token = await user.getIdToken();
      const client = new CVAPIClient(process.env.REACT_APP_API_URL);
      const result = await client.uploadCV(file, token);
      
      console.log('CV uploaded:', result);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <input
        type="file"
        accept=".pdf,.doc,.docx,image/*"
        onChange={(e) => handleUpload(e.target.files[0])}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

## 🔗 API Base URLs

### Development
```
Local: http://localhost:5001/your-project/us-central1/cv
```

### Production
```
Firebase: https://us-central1-your-project.cloudfunctions.net/cv
```

## 📞 Support & Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify Firebase Auth token is valid
   - Check token expiration
   - Ensure correct Authorization header format

2. **File Upload Failures**
   - Check file size limits (25MB max)
   - Verify supported file types
   - Ensure proper multipart/form-data encoding

3. **AI Service Errors**
   - Verify API keys are configured
   - Check rate limits and quotas
   - Monitor AI service status pages

4. **Rate Limit Exceeded**
   - Wait for rate limit window to reset
   - Implement exponential backoff
   - Consider upgrading limits for production

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
DEBUG_MODE=true
```

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Verify authentication token |
| 403 | Forbidden | Check user permissions |
| 413 | Payload Too Large | Reduce file size |
| 429 | Too Many Requests | Implement rate limiting |
| 500 | Internal Server Error | Check logs and retry |

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 🙏 Acknowledgments

- Firebase team for the serverless platform
- Anthropic for AI capabilities
- Tesseract.js for OCR functionality
- Sharp for image processing
- All open-source contributors

---

**Built with ❤️ by the Edutu Team**

For additional support, please refer to the troubleshooting guide or contact the development team.