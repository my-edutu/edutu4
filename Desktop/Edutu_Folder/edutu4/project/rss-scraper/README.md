# RSS Scholarship Scraper

A comprehensive Node.js application that automatically scrapes scholarship and opportunity data from multiple RSS feeds and stores them in Firebase Firestore.

## Features

- 🔄 **Automated Scraping**: Runs every 6 hours using cron jobs
- 🛡️ **Duplicate Prevention**: Checks for existing scholarships by title and link
- 🔍 **Deep Content Extraction**: Extracts detailed information from article pages
- 🗃️ **Firebase Integration**: Stores data in Firestore with timestamps
- 📊 **Success Rate Estimation**: Calculates estimated application success rates
- 🚨 **Error Handling**: Comprehensive error handling and logging
- 📝 **Detailed Logging**: Timestamped logs for monitoring
- 🛡️ **Safe Mode**: Test-friendly mode with limited logging and single run

## Safe Mode

The `--safe` flag enables a testing mode with the following characteristics:

- **Run Once & Exit**: Scrapes all feeds once, then automatically exits
- **Limited Logging**: Only shows the 10 most recent log lines (no terminal flooding)
- **Error Resilience**: If a feed fails, logs a short error and continues to next feed
- **No Cron Jobs**: Disables the 6-hour automatic scheduling
- **Summary Report**: Shows final statistics: `Safe run complete — New: X, Duplicates: Y, Errors: Z`
- **Faster Processing**: Reduced delays between requests for quicker testing

## RSS Feeds Monitored

- **Scholarship Positions**: scholarshippositions.com
- **Opportunity Desk**: opportunitydesk.org  
- **Scholars4Dev**: scholars4dev.com
- **Scholarship Portal**: scholarshipportal.com
- **After School Africa**: afterschoolafrica.com
- **Opportunity Desk - Fellowships**: opportunitydesk.org/fellowships
- **Youth Opportunities Hub**: youthopportunitieshub.com
- **OYAOP**: oyaop.com

## Extracted Data

For each scholarship/opportunity, the scraper extracts:

- **Basic Info**: Title, description, link, published date, provider
- **Requirements**: Eligibility requirements and criteria
- **Benefits**: What applicants will receive
- **Application Process**: How to apply
- **Deadlines**: Application deadlines (when available)
- **Eligibility**: Who can apply
- **Success Rate**: Estimated application success percentage
- **Tags**: Empty array (for future categorization)
- **Created At**: Firestore server timestamp

## Setup Instructions

### 1. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Go to Project Settings > Service Accounts
4. Generate a new private key (JSON)
5. Fill in the Firebase environment variables in `.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
```

### 3. Firestore Database

1. In Firebase Console, go to Firestore Database
2. Create database in production mode
3. The scraper will automatically create the `scholarships` collection

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Scraper

**Safe Mode** (runs once with limited logging and exits):
```bash
npm run safe
# or
node index.js --safe
```

**Development Mode** (runs once for testing):
```bash
npm run dev
```

**Production Mode** (runs continuously with cron):
```bash
npm start
```

## Database Schema

Documents are stored in the `scholarships` collection with this structure:

```javascript
{
  title: "Scholarship Title",
  summary: "Brief description of the opportunity",
  requirements: "Eligibility requirements and criteria", 
  benefits: "What you will receive",
  applicationProcess: "How to apply",
  link: "https://example.com/scholarship",
  publishedDate: Timestamp,
  deadline: "Application deadline info",
  eligibility: "Who can apply",
  provider: "Website Name",
  successRate: "25%",
  tags: [], // Empty for now
  createdAt: Firestore.Timestamp
}
```

## Monitoring & Logs

The application provides detailed logging:

```
[2024-01-20T10:30:00.000Z] INFO: Starting scholarship scraping process...
[2024-01-20T10:30:15.000Z] INFO: Processing feed: Scholarship Positions
[2024-01-20T10:30:20.000Z] INFO: Processing new item: AI Research Fellowship
[2024-01-20T10:30:25.000Z] INFO: Saved scholarship: AI Research Fellowship
[2024-01-20T10:35:00.000Z] INFO: Feed processed: Scholarship Positions - New: 5, Duplicates: 12
```

## Cron Schedule

- **Frequency**: Every 6 hours
- **Cron Expression**: `0 */6 * * *`
- **Timezone**: UTC
- **First Run**: Immediately on startup
- **Subsequent Runs**: Every 6 hours thereafter

## Error Handling

- **Network Failures**: Retries with timeout handling
- **Parsing Errors**: Skips malformed items, continues processing
- **Firebase Errors**: Logs errors, continues with next item
- **Rate Limiting**: 2-3 second delays between requests
- **Graceful Shutdown**: Handles SIGINT and SIGTERM signals

## Performance Considerations

- **Duplicate Checking**: Fast Firestore queries with compound indexes
- **Rate Limiting**: Delays between requests to avoid overwhelming servers
- **Memory Management**: Processes items one at a time
- **Timeout Handling**: 10-second timeouts for external requests

## Production Deployment

1. **Environment Variables**: Set all required Firebase credentials
2. **Process Manager**: Use PM2 or systemd for process management
3. **Monitoring**: Set up log aggregation and alerting
4. **Firestore Indexes**: Create indexes for title and link fields
5. **Resource Limits**: Monitor memory and CPU usage

## Troubleshooting

### Common Issues

**"Missing environment variables" error:**
- Ensure all Firebase credentials are set in `.env`
- Check that private key includes proper line breaks

**"Firebase connection failed" error:**
- Verify project ID is correct
- Ensure Firestore is enabled in Firebase Console
- Check service account has proper permissions

**"No new scholarships found" error:**
- RSS feeds may be temporarily unavailable
- Check network connectivity
- Review feed URLs for changes

### Testing Individual Components

Test a single feed:
```javascript
const { processFeed } = require('./index.js');
processFeed({ url: 'https://www.scholarshippositions.com/feed/', source: 'Test' });
```

Test content extraction:
```javascript  
const { extractDetailedContent } = require('./index.js');
extractDetailedContent('https://example.com/scholarship', 'Test Source');
```

## Contributing

1. Test changes with a single feed first
2. Monitor logs for errors
3. Ensure duplicate checking works correctly
4. Test Firebase connection and data storage

## License

MIT License - See LICENSE file for details