# Edutu API Server

A secure Node.js + Express API server for managing opportunities (scholarships, internships, jobs, etc.) with Firebase Firestore integration.

## Features

- 🔐 **Secure API Key Authentication**
- 🛡️ **Rate Limiting & Security Headers**
- 🔥 **Firebase Firestore Integration**
- ✅ **Input Validation & Sanitization**
- 📝 **CRUD Operations for Opportunities**
- 🚀 **Production Ready**

## API Endpoints

### Authentication
All endpoints require an API key in the `X-API-Key` header or `apiKey` query parameter.

### Opportunities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/opportunities` | Get all opportunities |
| GET | `/api/opportunities/:id` | Get opportunity by ID |
| POST | `/api/opportunities` | Create new opportunity |
| PUT | `/api/opportunities/:id` | Update opportunity |
| DELETE | `/api/opportunities/:id` | Delete opportunity |

### Health Check
- GET `/health` - Server health status (no auth required)

## Setup Instructions

### 1. Environment Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Go to Project Settings > Service Accounts
4. Generate a new private key
5. Fill in the Firebase environment variables in `.env`

### 3. API Key Generation

Generate a secure API key (32+ characters recommended):

```bash
# Using Node.js crypto (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using openssl
openssl rand -hex 32
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Start Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Opportunity Data Schema

```json
{
  "title": "Software Engineering Internship",
  "description": "Work with our engineering team...",
  "type": "internship",
  "organization": "Tech Company Inc.",
  "location": "San Francisco, CA",
  "deadline": "2024-12-31T23:59:59.000Z",
  "amount": 5000,
  "eligibility": "Computer Science students",
  "applicationUrl": "https://example.com/apply",
  "tags": ["engineering", "internship", "tech"],
  "isActive": true
}
```

## Valid Opportunity Types

- `scholarship`
- `internship` 
- `job`
- `course`
- `workshop`
- `bootcamp`
- `certification`

## Example API Calls

### Get All Opportunities
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3001/api/opportunities
```

### Create New Opportunity
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "title": "Web Development Bootcamp",
    "description": "Intensive 12-week program",
    "type": "bootcamp",
    "organization": "Code Academy",
    "deadline": "2024-12-31",
    "amount": 10000,
    "tags": ["web-development", "bootcamp"]
  }' \
  http://localhost:3001/api/opportunities
```

### Update Opportunity
```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "title": "Updated Title",
    "isActive": false
  }' \
  http://localhost:3001/api/opportunities/DOCUMENT_ID
```

## Security Features

- **API Key Authentication**: All endpoints protected
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive validation and sanitization
- **CORS Protection**: Configurable allowed origins
- **Security Headers**: Helmet.js for security headers
- **Error Handling**: No sensitive information leaked

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Update CORS origins to your production domain
3. Use a proper process manager (PM2, systemd)
4. Set up HTTPS reverse proxy (nginx)
5. Configure firewall rules

## Error Responses

All errors return JSON with the following format:

```json
{
  "success": false,
  "error": "Error message",
  "details": ["validation error 1", "validation error 2"]
}
```

## Success Responses

Success responses follow this format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message"
}
```