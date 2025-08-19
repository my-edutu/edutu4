# Edutu RSS Scraper Backend

This Node.js application automatically scrapes RSS feeds for educational opportunities and populates your Firestore `opportunities` collection every 6 hours.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Firebase Setup

#### Enable Firestore Database
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your Edutu project
3. Navigate to **Firestore Database**
4. Click **Create database**
5. Choose **Start in production mode** (we'll add security rules)
6. Select your preferred location

#### Create Service Account
1. In Firebase Console, go to **Project Settings** ⚙️
2. Navigate to **Service accounts** tab
3. Click **Generate new private key**
4. Save the JSON file securely (don't commit to git!)

### 3. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your Firebase credentials:
```env
# Get these from your service account JSON file
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
Your private key here (keep the quotes and newlines)
-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# Optional settings
CRON_SCHEDULE=0 */6 * * *  # Every 6 hours
MAX_OPPORTUNITIES_PER_FEED=50
RUN_ON_STARTUP=true
```

### 4. Firestore Security Rules

In Firebase Console, go to **Firestore Database** → **Rules** and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read access to opportunities for authenticated users
    match /opportunities/{opportunityId} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend can write
    }
    
    // Your existing user rules
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🛠️ Usage

### Run Once (Testing)
```bash
npm run scrape
```

### Start Scheduler (Production)
```bash
npm start
```

### Development Mode (Auto-restart)
```bash
npm run dev
```

### View Help
```bash
npm start help
```

## 📊 What Gets Scraped

The scraper processes these RSS feeds every 6 hours:

- **Scholarship Positions** - scholarshippositions.com
- **Opportunity Desk** - opportunitydesk.org  
- **Scholars4Dev** - scholars4dev.com
- **Scholarship Portal** - scholarshipportal.com
- **AfterSchool Africa** - afterschoolafrica.com
- **OD Fellowships** - opportunitydesk.org/fellowships
- **Youth Opportunities Hub** - youthopportunitieshub.com
- **OYAOP** - oyaop.com

## 📋 Data Structure

Each opportunity is saved to Firestore with these fields matching your frontend:

```javascript
{
  id: string,
  title: string,
  organization: string,
  matchScore: null,                    // For future AI personalization
  difficultyLevel: string,             // 'Beginner' | 'Medium' | 'Advanced'
  applicantCount: null,                // RSS feeds don't provide this
  category: string,                    // Based on feed source
  applicationDeadline: string,
  location: string,
  successRate: null,                   // RSS feeds don't provide this
  description: string,                 // Extracted from RSS content
  requirements: string[],              // Parsed from content
  benefits: string[],                  // Parsed from content
  applicationProcess: string[],        // Generic instructions
  link: string,                        // Original RSS link
  provider: string,                    // Source website
  createdAt: Date,
  tags: string[]                       // Empty for now
}
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CRON_SCHEDULE` | `0 */6 * * *` | Cron pattern for scheduling |
| `MAX_OPPORTUNITIES_PER_FEED` | `50` | Max items to process per feed |
| `RUN_ON_STARTUP` | `true` | Run scraping immediately on startup |
| `LOG_LEVEL` | `info` | Logging level |

### Scheduling Examples

```bash
# Every 3 hours
CRON_SCHEDULE="0 */3 * * *"

# Daily at 6 AM
CRON_SCHEDULE="0 6 * * *"

# Every 5 minutes (testing)
CRON_SCHEDULE="*/5 * * * *"
```

## 🐛 Troubleshooting

### Common Issues

**1. "Missing environment variables" error**
- Check your `.env` file exists and has all required variables
- Ensure `FIREBASE_PRIVATE_KEY` includes the full key with `-----BEGIN/END-----` markers

**2. "Permission denied" on Firestore**
- Verify your service account has Firestore permissions
- Check your Firestore security rules allow the operations

**3. "Feed timeout" errors**
- Some RSS feeds may be slow or unavailable temporarily
- The scraper will skip failed feeds and continue with others

**4. No new opportunities appearing**
- Check if opportunities already exist (duplicate detection prevents re-adding)
- Verify your frontend is reading from the `opportunities` collection

### Logs

The scraper provides detailed logging:
- ✅ Successfully saved opportunities
- ⚠️ Skipped duplicates  
- ❌ Errors with specific feeds
- 📊 Summary statistics after each run

## 🎯 Frontend Integration

Your existing frontend should automatically see new opportunities if it's reading from the `opportunities` Firestore collection. No code changes needed!

### Connecting Frontend to Opportunities

If your frontend isn't connected yet, add this to your opportunities service:

```javascript
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function fetchOpportunities(limitCount = 50) {
  try {
    const q = query(
      collection(db, 'opportunities'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return [];
  }
}
```

## ⚡ Performance Notes

- **Duplicate Prevention**: Uses title + link matching to avoid duplicates
- **Rate Limiting**: 2-second delay between feed requests
- **Batch Processing**: Processes up to 50 items per feed
- **Automatic Cleanup**: Weekly cleanup of opportunities older than 90 days
- **Error Recovery**: Failed feeds don't stop processing other feeds

## 📈 Monitoring

Monitor your scraper:
1. **Logs**: Check console output for errors and statistics
2. **Firestore**: Monitor document count in opportunities collection  
3. **Firebase Usage**: Check Firebase console for usage metrics

## 🚨 Important Notes

- **Never commit** your `.env` file or service account JSON
- **Test first** with `npm run scrape` before running the scheduler
- **Monitor costs** - Firestore charges per read/write operation
- **Set up alerts** for any Firebase quota limits

## 💻 Development

### Project Structure
```
backend/
├── src/
│   ├── config/
│   │   ├── firebase.js      # Firebase admin setup
│   │   └── feeds.js         # RSS feed configurations
│   ├── services/
│   │   └── scraperService.js # Core scraping logic
│   ├── utils/
│   │   └── parser.js        # Content parsing utilities
│   ├── index.js             # Main application
│   ├── scheduler.js         # Cron job management
│   └── scraper.js           # One-time scraper script
├── package.json
├── .env.example
└── README.md
```

### Adding New RSS Feeds

Edit `src/config/feeds.js` and add your feed:

```javascript
{
  name: 'New Feed Name',
  url: 'https://example.com/feed/',
  category: 'Your Category',
  provider: 'example.com'
}
```

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your Firebase setup and permissions
3. Review the logs for specific error messages
4. Test with a single feed first: modify the RSS_FEEDS array temporarily