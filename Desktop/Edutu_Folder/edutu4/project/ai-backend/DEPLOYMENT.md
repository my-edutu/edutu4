# Edutu AI Backend - Deployment Guide

This guide provides detailed instructions for deploying the Edutu AI Backend to various platforms, from local development to production environments.

## 🎯 Deployment Options

### 1. Railway (Recommended - $5/month)

**Why Railway?**
- Automatic deployments from GitHub
- Built-in PostgreSQL database
- Easy environment variable management
- Generous free tier, affordable pro tier

**Steps:**

1. **Create Railway Account**
   ```bash
   # Visit https://railway.app and sign up with GitHub
   ```

2. **Deploy from GitHub**
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Node.js

3. **Add Environment Variables**
   ```bash
   # In Railway dashboard, go to Variables tab
   NODE_ENV=production
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   GOOGLE_AI_API_KEY=your-google-ai-key
   OPENAI_API_KEY=your-openai-key
   COHERE_API_KEY=your-cohere-key
   CORS_ORIGINS=https://your-frontend-domain.com
   ```

4. **Deploy**
   - Railway automatically deploys on git push
   - Get your deployment URL from Railway dashboard

### 2. Render (Free tier available)

**Steps:**

1. **Create Render Account**
   ```bash
   # Visit https://render.com and sign up
   ```

2. **Create Web Service**
   - Click "New +" > "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: Free tier or Starter ($7/month)

3. **Environment Variables**
   ```bash
   # In Render dashboard, add these in Environment section
   NODE_ENV=production
   # ... (same as Railway above)
   ```

4. **Health Check**
   - Set health check path to `/health`

### 3. Heroku (Platform-as-a-Service)

**Steps:**

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   heroku --version
   ```

2. **Login and Create App**
   ```bash
   heroku login
   heroku create edutu-ai-backend-prod
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set FIREBASE_PROJECT_ID=your-project-id
   # ... set all other environment variables
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Scale**
   ```bash
   heroku ps:scale web=1
   ```

### 4. DigitalOcean App Platform

**Steps:**

1. **Create DigitalOcean Account**
   - Visit https://cloud.digitalocean.com

2. **Create App**
   - Go to Apps section
   - Click "Create App"
   - Connect GitHub repository

3. **Configure**
   - **Name**: `edutu-ai-backend`
   - **Instance Size**: Basic ($5/month)
   - **Environment Variables**: Add all required vars

4. **Deploy**
   - DigitalOcean automatically deploys

### 5. AWS (Advanced - Using Elastic Beanstalk)

**Prerequisites:**
- AWS account
- AWS CLI installed

**Steps:**

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB Application**
   ```bash
   eb init edutu-ai-backend
   # Select region, platform (Node.js)
   ```

3. **Create Environment**
   ```bash
   eb create production
   ```

4. **Set Environment Variables**
   ```bash
   eb setenv NODE_ENV=production FIREBASE_PROJECT_ID=your-project-id
   # ... set all environment variables
   ```

5. **Deploy**
   ```bash
   eb deploy
   ```

### 6. VPS (Ubuntu/CentOS) - Manual Deployment

**For when you have your own server or VPS.**

#### Ubuntu 20.04/22.04 Setup

1. **Update System**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js 18**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node --version  # Should show v18.x
   ```

3. **Install PM2 (Process Manager)**
   ```bash
   sudo npm install -g pm2
   ```

4. **Create Application User**
   ```bash
   sudo adduser edutu
   sudo usermod -aG sudo edutu
   sudo su - edutu
   ```

5. **Clone Repository**
   ```bash
   git clone https://github.com/your-org/edutu-ai-backend.git
   cd edutu-ai-backend
   npm install --production
   ```

6. **Create Environment File**
   ```bash
   cp .env.example .env
   nano .env  # Add your environment variables
   ```

7. **Create PM2 Ecosystem File**
   ```bash
   cat > ecosystem.config.js << 'EOF'
   module.exports = {
     apps: [{
       name: 'edutu-ai-backend',
       script: 'server.js',
       instances: 2, // Or 'max' for CPU count
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3001
       },
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_file: './logs/combined.log',
       time: true
     }]
   }
   EOF
   ```

8. **Start Application**
   ```bash
   mkdir -p logs
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup  # Follow the instructions
   ```

9. **Setup Nginx Reverse Proxy**
   ```bash
   sudo apt install nginx
   
   cat > /tmp/edutu-backend << 'EOF'
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   EOF
   
   sudo mv /tmp/edutu-backend /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/edutu-backend /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

10. **SSL with Let's Encrypt**
    ```bash
    sudo apt install certbot python3-certbot-nginx
    sudo certbot --nginx -d your-domain.com
    ```

### 7. Docker Deployment

**Create Dockerfile:**

```dockerfile
# Create this as Dockerfile in ai-backend directory
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
CMD ["npm", "start"]
```

**Create docker-compose.yml:**

```yaml
version: '3.8'

services:
  edutu-ai-backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      # Add all your environment variables here
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
      # ... etc
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    volumes:
      - ./logs:/app/logs
    networks:
      - edutu-network

networks:
  edutu-network:
    driver: bridge
```

**Deploy with Docker:**

```bash
# Build and run
docker-compose up -d

# Check logs
docker-compose logs -f

# Scale
docker-compose up -d --scale edutu-ai-backend=3
```

## 🔧 Environment Configuration by Platform

### Railway Environment Variables

```bash
# Railway auto-injects some variables, you need to add:
NODE_ENV=production
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_AI_API_KEY=your-google-ai-key
OPENAI_API_KEY=your-openai-key
COHERE_API_KEY=your-cohere-key
CORS_ORIGINS=https://your-frontend-domain.com,https://your-app.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Heroku Environment Variables

```bash
# Heroku automatically sets PORT, you set the rest:
heroku config:set NODE_ENV=production
heroku config:set FIREBASE_PROJECT_ID=your-project-id
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
heroku config:set FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
heroku config:set SUPABASE_URL=https://your-project.supabase.co
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
heroku config:set GOOGLE_AI_API_KEY=your-google-ai-key
heroku config:set OPENAI_API_KEY=your-openai-key
heroku config:set COHERE_API_KEY=your-cohere-key
heroku config:set CORS_ORIGINS=https://your-frontend-domain.com
```

## 📊 Production Monitoring

### 1. Health Checks Setup

**Railway:**
- Set health check path to `/health`
- Railway will automatically monitor

**Render:**
- Set health check path to `/health`
- Configure in Service settings

**Heroku:**
```bash
# No built-in health checks, use external monitoring
```

**VPS with Nginx:**
```nginx
# Add to your nginx config
location /health {
    proxy_pass http://localhost:3001/health;
    access_log off;
}
```

### 2. Log Management

**Structured Logging:**
```bash
# The app uses Winston for logging
# Logs are written to logs/combined.log and logs/error.log

# For production, consider external log management:
# - Logtail (formerly Timber.io)
# - Papertrail
# - LogDNA (IBM)
```

**Log Rotation:**
```bash
# On VPS, setup logrotate
sudo cat > /etc/logrotate.d/edutu-backend << 'EOF'
/home/edutu/edutu-ai-backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0640 edutu edutu
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 3. Performance Monitoring

**Application Metrics:**
```bash
# The app exposes metrics at /health/metrics
# Monitor these endpoints:
curl https://your-domain.com/health/metrics
curl https://your-domain.com/health/detailed
```

**External Monitoring Services:**
- **UptimeRobot** (free) - Basic uptime monitoring
- **Pingdom** - Advanced monitoring
- **New Relic** - APM (Application Performance Monitoring)
- **DataDog** - Full observability stack

## 🔐 Production Security

### 1. Environment Security

```bash
# Always set these in production:
NODE_ENV=production
LOG_LEVEL=info  # Don't use 'debug' in production

# Use strong CORS settings:
CORS_ORIGINS=https://your-exact-frontend-domain.com

# Rate limiting:
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Firewall Configuration (VPS)

```bash
# Ubuntu/CentOS firewall
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw deny 3001   # Don't expose app port directly

# For AWS/DigitalOcean, use their security groups/firewalls
```

### 3. SSL/TLS

**Automatic (Platform-managed):**
- Railway, Render, Heroku provide automatic HTTPS

**Manual (VPS):**
```bash
# Use Let's Encrypt with Certbot
sudo certbot --nginx -d your-domain.com
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🚀 CI/CD Setup

### GitHub Actions Deployment

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      # Railway deployment (automatic)
      - name: Deploy to Railway
        run: echo "Railway will auto-deploy on push to main"
      
      # Or for Heroku
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "edutu-ai-backend-prod"
          heroku_email: "your-email@example.com"
```

## 📈 Scaling Considerations

### Horizontal Scaling

**Railway/Render/Heroku:**
- Scale through platform dashboard
- Add more instances/dynos

**VPS with PM2:**
```bash
# Scale to use all CPU cores
pm2 scale edutu-ai-backend max

# Or specific number
pm2 scale edutu-ai-backend 4
```

**Docker:**
```bash
# Scale with docker-compose
docker-compose up -d --scale edutu-ai-backend=3
```

### Database Scaling

**Supabase:**
- Upgrade to Pro plan for more connections
- Connection pooling is built-in

**Firebase Firestore:**
- Scales automatically
- Monitor quota usage

### Load Balancing

**VPS with Multiple Instances:**
```nginx
# nginx.conf upstream configuration
upstream edutu_backend {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    location / {
        proxy_pass http://edutu_backend;
        # ... other proxy settings
    }
}
```

## 🐛 Troubleshooting Deployment

### Common Issues

**1. Port Issues**
```bash
# Different platforms use different PORT env vars
# Railway: Automatic
# Heroku: PORT env var set automatically
# VPS: You set it manually

# Fix: Always use process.env.PORT || 3001
```

**2. Build Failures**
```bash
# Check Node.js version compatibility
node --version  # Should be 18+

# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**3. Environment Variable Issues**
```bash
# Firebase private key issues - ensure proper escaping:
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# Check if all required vars are set:
curl https://your-domain.com/health/detailed
```

**4. Database Connection Issues**
```bash
# Check Supabase connection
curl -X POST https://your-supabase-url.com/rest/v1/rpc/get_embedding_statistics \
  -H "apikey: YOUR_SERVICE_ROLE_KEY"

# Check Firebase
# Verify service account permissions in Firebase Console
```

**5. Memory Issues**
```bash
# For platforms with limited memory:
NODE_OPTIONS="--max-old-space-size=512" npm start

# Or in package.json:
"scripts": {
  "start": "NODE_OPTIONS='--max-old-space-size=512' node server.js"
}
```

### Health Check Debugging

```bash
# Test all health endpoints:
curl https://your-domain.com/health
curl https://your-domain.com/health/detailed
curl https://your-domain.com/health/ai
curl https://your-domain.com/health/database
```

## 📝 Deployment Checklist

Before deploying to production:

### Pre-deployment
- [ ] All environment variables configured
- [ ] Firebase service account has proper permissions
- [ ] Supabase database setup script executed
- [ ] AI API keys tested and working
- [ ] CORS origins set correctly
- [ ] Rate limiting configured appropriately

### Post-deployment
- [ ] Health checks passing
- [ ] All AI services responding
- [ ] Database connections working
- [ ] Scheduled tasks running
- [ ] Logs being generated properly
- [ ] Frontend can communicate with backend
- [ ] SSL certificate installed (if applicable)
- [ ] Monitoring setup
- [ ] Backup strategy in place

### Performance Testing
- [ ] Load test the API endpoints
- [ ] Test embedding generation performance
- [ ] Verify chat response times
- [ ] Check memory usage under load
- [ ] Validate auto-scaling behavior

## 💰 Cost Optimization

### Free Tier Strategies

**Railway:**
- Use hobby plan ($5/month) for production
- Monitor usage to stay within limits

**Render:**
- Use free tier for development
- Upgrade to starter ($7/month) for production

**Supabase:**
- Free tier: 500MB DB, 2GB bandwidth
- Optimize queries to reduce bandwidth

**AI Services:**
- Google AI: Stay within rate limits
- OpenAI: Monitor token usage
- Cohere: Use as fallback only

### Cost Monitoring

```bash
# Check your usage regularly:
curl https://your-domain.com/health/metrics
curl https://your-domain.com/api/admin/embeddings/stats
```

---

This deployment guide covers all major platforms and scenarios. Choose the one that best fits your needs and budget. Railway is recommended for its simplicity and reasonable cost, while VPS gives you the most control but requires more maintenance.