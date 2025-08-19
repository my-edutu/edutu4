# RSS Scholarship Scraper - Setup Instructions

## Overview
This RSS scraper automatically collects scholarship data from multiple RSS feeds and saves them to Firebase Firestore. It runs every 6 hours via cron job and includes duplicate detection.

## Prerequisites
- Node.js installed
- Firebase service account JSON file
- Access to Firebase project

## Setup Steps

### 1. Install Dependencies
```bash
cd rss-scraper
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the `rss-scraper` directory with your Firebase service account credentials:

```env
# Firebase Service Account Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[your-private-key-content]\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your-client-cert-url
```

**Important**: 
- Wrap the private key in quotes
- Keep the `\n` characters for line breaks
- Ensure no extra spaces around the `=` signs

### 3. From Service Account JSON to .env
If you have a Firebase service account JSON file, extract these values:

```json
{
  "type": "service_account",
  "project_id": "→ FIREBASE_PROJECT_ID",
  "private_key_id": "→ FIREBASE_PRIVATE_KEY_ID", 
  "private_key": "→ FIREBASE_PRIVATE_KEY",
  "client_email": "→ FIREBASE_CLIENT_EMAIL",
  "client_id": "→ FIREBASE_CLIENT_ID",
  "client_x509_cert_url": "→ FIREBASE_CLIENT_X509_CERT_URL"
}
```

## Running the Scraper

### One-time Run (Immediate)
```bash
npm start
```

### Development Mode
```bash
npm run dev
```

### Verify Setup
```bash
node verify-firestore.js
```

## Features

### Automatic Processing
- **Cron Schedule**: Runs every 6 hours automatically
- **Duplicate Detection**: Skips scholarships already in database
- **Multiple Sources**: Scrapes 8+ RSS feeds simultaneously
- **Detailed Extraction**: Extracts requirements, benefits, deadlines from full articles

### Data Schema
Each scholarship saved to Firestore includes:
- `title`: Scholarship name
- `summary`: Brief description
- `requirements`: Eligibility requirements
- `benefits`: What's offered
- `applicationProcess`: How to apply
- `link`: Original URL
- `publishedDate`: When published
- `deadline`: Application deadline
- `eligibility`: Who can apply
- `provider`: Source website
- `successRate`: Estimated success rate
- `createdAt`: When scraped
- `tags`: Category tags (empty array)

### RSS Sources
1. Scholarship Positions
2. Opportunity Desk
3. Scholars4Dev
4. Scholarship Portal
5. After School Africa
6. Opportunity Desk - Fellowships
7. Youth Opportunities Hub
8. OYAOP

## Troubleshooting

### Common Issues

**Environment Variables Not Found**
```
ERROR: Missing required environment variables
```
- Check your `.env` file exists in the correct directory
- Verify all required variables are set
- Ensure no extra spaces around variable names

**Firebase Connection Failed**
```
ERROR: Firebase connection failed
```
- Verify your Firebase project ID is correct
- Ensure service account has proper permissions
- Check that private key format is correct (with `\n` characters)

**Permission Denied**
```
ERROR: Permission denied
```
- Verify your service account has Firestore write permissions
- Check Firebase security rules allow writes to `scholarships` collection

### Firebase Permissions Required
Your service account needs these permissions:
- `Cloud Datastore User` or `Firebase Admin`
- Write access to `scholarships` collection

## Monitoring

### Logs
The scraper provides detailed logging:
- `INFO`: Successful operations
- `WARN`: Warnings (e.g., failed to extract content)
- `ERROR`: Failed operations

### Verification
After running, check:
1. Firestore console for new records in `scholarships` collection
2. Run `node verify-firestore.js` to see latest records
3. Check logs for any errors during processing

## Customization

### Adding RSS Feeds
Edit the `RSS_FEEDS` array in `index.js`:
```javascript
const RSS_FEEDS = [
  { url: 'https://example.com/feed/', source: 'Example Source' },
  // Add more feeds here
];
```

### Changing Cron Schedule
Edit line 349 in `index.js`:
```javascript
const cronExpression = '0 */6 * * *'; // Currently every 6 hours
// Examples:
// '0 */1 * * *'    // Every hour
// '0 0 */12 * *'   // Every 12 hours  
// '0 0 * * *'      // Daily at midnight
```

## Project Structure
```
rss-scraper/
├── index.js              # Main scraper application
├── verify-firestore.js   # Verification script
├── package.json          # Dependencies
├── .env                  # Environment variables (create this)
└── SETUP_INSTRUCTIONS.md # This file
```

## Security Notes
- Never commit `.env` file to version control
- Keep service account credentials secure
- Monitor Firebase usage for unexpected costs
- Consider rate limiting for large-scale deployments

## Success Confirmation
✅ The scraper is working if you see:
- `Firebase connection successful` in logs
- `Saved scholarship: [title]` messages
- New records in Firestore `scholarships` collection
- Verification script shows recent records

For questions or issues, check the logs first, then verify your Firebase configuration.