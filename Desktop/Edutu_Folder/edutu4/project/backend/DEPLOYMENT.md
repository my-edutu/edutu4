# 🚀 Deployment Guide - 24/7 RSS Scraper

This guide covers deploying your Edutu RSS scraper for 24/7 operation using various hosting platforms.

## 🌟 Recommended Deployment Options

### Option 1: Railway (Easiest)
**Cost**: ~$5/month | **Setup**: 5 minutes | **Best for**: Beginners

### Option 2: Render (Free tier available)
**Cost**: Free/month | **Setup**: 10 minutes | **Best for**: Budget-conscious

### Option 3: Google Cloud Run (Serverless)
**Cost**: Pay-per-use | **Setup**: 15 minutes | **Best for**: Variable workloads

### Option 4: VPS (Most control)
**Cost**: $5-20/month | **Setup**: 30 minutes | **Best for**: Advanced users

---

## 🚂 Option 1: Railway (Recommended)

Railway is the easiest deployment option with excellent Node.js support.

### Step 1: Prepare Your Code

1. Create a `Procfile` in your backend directory:
```bash
# backend/Procfile
web: node src/index.js
```

2. Update `package.json` to specify Node version:
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Step 2: Deploy to Railway

1. **Sign up**: Go to [railway.app](https://railway.app) and sign up
2. **Connect GitHub**: Link your GitHub account
3. **Deploy**: 
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Choose the `backend` folder as root directory
4. **Add Environment Variables**:
   - Go to your project → Variables tab
   - Add all your `.env` variables:
     ```
     FIREBASE_PROJECT_ID=your-project-id
     FIREBASE_PRIVATE_KEY=your-private-key
     FIREBASE_CLIENT_EMAIL=your-client-email
     ```

### Step 3: Configure Port (Important)

Railway provides a `PORT` environment variable. Update your `src/index.js`:

```javascript
// Add this at the top of main() function
const PORT = process.env.PORT || 3000;

// Add a simple health check server for Railway
if (process.env.RAILWAY_ENVIRONMENT) {
  const express = require('express');
  const app = express();
  
  app.get('/', (req, res) => {
    res.json({ status: 'RSS Scraper running', uptime: process.uptime() });
  });
  
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
  
  app.listen(PORT, () => {
    console.log(`Health check server running on port ${PORT}`);
  });
}
```

### Step 4: Install Express for Health Checks

```bash
cd backend
npm install express
```

**That's it!** Your scraper will start automatically and run 24/7.

---

## 🎨 Option 2: Render (Free Tier)

Render offers a generous free tier perfect for RSS scraping.

### Step 1: Prepare for Render

1. Create `render.yaml` in your backend directory:
```yaml
# backend/render.yaml
services:
  - type: web
    name: edutu-rss-scraper
    env: node
    buildCommand: npm install
    startCommand: node src/index.js
    envVars:
      - key: NODE_ENV
        value: production
```

### Step 2: Deploy to Render

1. **Sign up**: Go to [render.com](https://render.com) and create account
2. **Connect GitHub**: Link your repository
3. **Create Web Service**:
   - Click "New+" → "Web Service"
   - Connect your repository
   - Set Root Directory to `backend`
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `node src/index.js`

### Step 3: Add Environment Variables

In Render dashboard:
- Go to Environment tab
- Add your Firebase credentials
- **Important**: For `FIREBASE_PRIVATE_KEY`, use the "File" option to avoid escaping issues

### Step 4: Configure Health Endpoint

Same as Railway - add Express health check for Render's monitoring.

**Free tier limitations**: 
- Service sleeps after 15 minutes of inactivity
- 750 hours/month (sufficient for 24/7 if you're the only user)

---

## ☁️ Option 3: Google Cloud Run

Perfect for serverless deployment with Firebase integration.

### Step 1: Create Dockerfile

Create `Dockerfile` in backend directory:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8080
CMD ["node", "src/index.js"]
```

### Step 2: Deploy to Cloud Run

```bash
# Install Google Cloud CLI first
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_FIREBASE_PROJECT_ID

# Build and deploy
cd backend
gcloud run deploy edutu-scraper \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1
```

### Step 3: Set Environment Variables

```bash
gcloud run services update edutu-scraper \
  --set-env-vars="FIREBASE_PROJECT_ID=your-project-id,FIREBASE_CLIENT_EMAIL=your-email" \
  --set-env-vars="FIREBASE_PRIVATE_KEY=your-private-key"
```

### Step 4: Keep Service Warm

Cloud Run scales to zero when not used. Use Google Cloud Scheduler to ping it:

```bash
# Create a job that hits your service every 5 minutes
gcloud scheduler jobs create http keep-warm \
  --schedule="*/5 * * * *" \
  --uri="https://your-service-url/health" \
  --http-method=GET
```

---

## 🖥️ Option 4: VPS Deployment

For maximum control, deploy on a VPS (DigitalOcean, Linode, AWS EC2).

### Step 1: Server Setup

```bash
# On Ubuntu 20.04+ server
sudo apt update
sudo apt install nodejs npm nginx git

# Install PM2 for process management
sudo npm install -g pm2
```

### Step 2: Deploy Your Code

```bash
# Clone your repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your credentials
nano .env
```

### Step 3: Configure PM2

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'edutu-scraper',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

### Step 4: Start with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs
```

### Step 5: Setup Nginx (Optional)

Create `/etc/nginx/sites-available/edutu-scraper`:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/edutu-scraper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 📊 Monitoring & Maintenance

### Logging

**Railway/Render**: Built-in logs in dashboard
**Cloud Run**: Google Cloud Logging
**VPS**: Use PM2 logs:
```bash
pm2 logs edutu-scraper
pm2 monit  # Real-time monitoring
```

### Health Checks

Add this route to monitor your scraper:

```javascript
// Add to your main index.js
app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    uptime: process.uptime(),
    lastScrape: new Date().toISOString(),
    memory: process.memoryUsage(),
    feeds: RSS_FEEDS.length
  });
});
```

### Alerts

Set up monitoring alerts:

1. **Uptime monitoring**: Use [Uptime Robot](https://uptimerobot.com) (free)
2. **Firebase monitoring**: Enable Firebase alerts for usage spikes
3. **Email notifications**: Configure your deployment platform's alerts

### Updates

**Automatic deployment** (GitHub Actions):

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy RSS Scraper
on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          # Railway auto-deploys on git push
          echo "Railway handles deployment automatically"
```

---

## 🔒 Security Considerations

### Environment Variables
- Never commit `.env` files
- Use your hosting platform's environment variable system
- Rotate Firebase service account keys regularly

### Network Security
- Use HTTPS in production
- Implement rate limiting if exposing HTTP endpoints
- Whitelist IP addresses for admin endpoints

### Firebase Security
- Use minimal IAM permissions for service account
- Monitor Firebase usage for anomalies
- Set up billing alerts

---

## 💰 Cost Estimation

| Platform | Monthly Cost | Includes |
|----------|--------------|----------|
| **Railway** | $5 | 512MB RAM, Always-on |
| **Render** | Free | 512MB RAM, Sleeps when idle |
| **Cloud Run** | $2-5 | Pay per request, scales to zero |
| **VPS** | $5-20 | Full control, 1-4GB RAM |

### Firebase Costs
- **Firestore**: ~$0.06 per 100K reads/writes
- **Expected**: <$1/month for typical RSS scraping

---

## 🚨 Troubleshooting

### Common Deployment Issues

**1. "Application failed to start"**
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check build logs for errors

**2. "Firebase permission denied"**
- Verify service account permissions
- Check environment variable formatting
- Ensure Firestore is enabled

**3. "Port binding errors"**
- Use `process.env.PORT` for platform-provided ports
- Don't hardcode port numbers

**4. "Memory errors"**
- Increase memory allocation on hosting platform
- Check for memory leaks in logs
- Consider reducing `MAX_OPPORTUNITIES_PER_FEED`

### Getting Help

1. Check deployment platform documentation
2. Review Firebase Console for errors
3. Monitor application logs
4. Test locally first with `npm run scrape`

---

## ✅ Post-Deployment Checklist

- [ ] Application starts successfully
- [ ] Environment variables are set correctly
- [ ] Health check endpoint responds
- [ ] RSS scraping runs without errors
- [ ] New opportunities appear in Firestore
- [ ] Frontend receives new opportunities
- [ ] Monitoring/alerts are configured
- [ ] Logs are accessible
- [ ] Backup/recovery plan is in place

**Congratulations!** Your RSS scraper is now running 24/7 and will automatically keep your Edutu app updated with the latest opportunities.