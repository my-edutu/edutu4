#!/bin/bash

# Edutu AI Backend Deployment Script
# This script helps deploy the AI backend to various platforms

set -e

echo "🚀 Edutu AI Backend Deployment Helper"
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate environment variables
check_env_vars() {
    print_info "Checking environment variables..."
    
    local missing_vars=()
    
    # Required variables
    required_vars=(
        "FIREBASE_PROJECT_ID"
        "FIREBASE_PRIVATE_KEY"
        "FIREBASE_CLIENT_EMAIL"
        "SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "GOOGLE_AI_API_KEY"
        "OPENAI_API_KEY"
        "COHERE_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo
        print_info "Please set these variables in your .env file or deployment platform"
        return 1
    fi
    
    print_status "All required environment variables are set"
    return 0
}

# Function to test API endpoints
test_endpoints() {
    local base_url="$1"
    print_info "Testing API endpoints at $base_url..."
    
    # Test health endpoint
    if curl -s -f "$base_url/health" > /dev/null; then
        print_status "Health endpoint responding"
    else
        print_error "Health endpoint not responding"
        return 1
    fi
    
    # Test detailed health
    if curl -s -f "$base_url/health/detailed" > /dev/null; then
        print_status "Detailed health endpoint responding"
    else
        print_warning "Detailed health endpoint not responding"
    fi
    
    return 0
}

# Function to deploy to Railway
deploy_railway() {
    print_info "Deploying to Railway..."
    
    if ! command_exists railway; then
        print_error "Railway CLI not installed. Install with: npm install -g @railway/cli"
        return 1
    fi
    
    print_info "Logging into Railway..."
    railway login
    
    print_info "Deploying to Railway..."
    railway up
    
    print_status "Railway deployment initiated"
}

# Function to deploy to Render
deploy_render() {
    print_info "Deploying to Render..."
    
    print_info "For Render deployment:"
    echo "1. Go to https://render.com and create a new Web Service"
    echo "2. Connect your GitHub repository"
    echo "3. Set build command: npm install"
    echo "4. Set start command: npm start"
    echo "5. Add environment variables from your .env file"
    echo "6. Deploy!"
}

# Function to deploy to Heroku
deploy_heroku() {
    print_info "Deploying to Heroku..."
    
    if ! command_exists heroku; then
        print_error "Heroku CLI not installed. Install from: https://devcenter.heroku.com/articles/heroku-cli"
        return 1
    fi
    
    print_info "Logging into Heroku..."
    heroku login
    
    # Create app if it doesn't exist
    if [[ -n "$1" ]]; then
        app_name="$1"
    else
        read -p "Enter Heroku app name: " app_name
    fi
    
    print_info "Creating/using Heroku app: $app_name"
    heroku create "$app_name" 2>/dev/null || print_info "App $app_name already exists"
    
    # Set environment variables
    print_info "Setting environment variables..."
    if [[ -f ".env" ]]; then
        # Read .env file and set variables (excluding comments and empty lines)
        while IFS= read -r line || [[ -n "$line" ]]; do
            if [[ $line =~ ^[^#]*= ]]; then
                heroku config:set "$line" --app "$app_name"
            fi
        done < .env
    else
        print_warning ".env file not found. Please set environment variables manually"
    fi
    
    print_info "Deploying to Heroku..."
    git push heroku main
    
    print_status "Heroku deployment complete"
    heroku open --app "$app_name"
}

# Function for VPS deployment
deploy_vps() {
    print_info "VPS Deployment Instructions:"
    echo
    echo "1. Connect to your VPS:"
    echo "   ssh user@your-server-ip"
    echo
    echo "2. Update system:"
    echo "   sudo apt update && sudo apt upgrade -y"
    echo
    echo "3. Install Node.js 18:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "   sudo apt-get install -y nodejs"
    echo
    echo "4. Install PM2:"
    echo "   sudo npm install -g pm2"
    echo
    echo "5. Clone repository:"
    echo "   git clone <your-repo-url>"
    echo "   cd edutu-ai-backend"
    echo
    echo "6. Install dependencies:"
    echo "   npm install --production"
    echo
    echo "7. Create .env file with your environment variables"
    echo
    echo "8. Start with PM2:"
    echo "   pm2 start ecosystem.config.js"
    echo "   pm2 save"
    echo "   pm2 startup"
    echo
    echo "9. Setup Nginx reverse proxy (optional but recommended)"
}

# Function to setup Docker deployment
deploy_docker() {
    print_info "Setting up Docker deployment..."
    
    if ! command_exists docker; then
        print_error "Docker not installed. Install from: https://docs.docker.com/get-docker/"
        return 1
    fi
    
    # Create Dockerfile if it doesn't exist
    if [[ ! -f "Dockerfile" ]]; then
        print_info "Creating Dockerfile..."
        cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN mkdir -p logs && chown -R nodejs:nodejs logs

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]
EOF
        print_status "Dockerfile created"
    fi
    
    # Create docker-compose.yml if it doesn't exist
    if [[ ! -f "docker-compose.yml" ]]; then
        print_info "Creating docker-compose.yml..."
        cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  edutu-ai-backend:
    build: .
    ports:
      - "3001:3001"
    env_file:
      - .env
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
EOF
        print_status "docker-compose.yml created"
    fi
    
    print_info "Building and starting Docker containers..."
    docker-compose up -d --build
    
    print_status "Docker deployment started"
    print_info "Check logs with: docker-compose logs -f"
}

# Main deployment function
main() {
    echo
    print_info "Choose deployment method:"
    echo "1) Railway (Recommended)"
    echo "2) Render"
    echo "3) Heroku"
    echo "4) VPS (Ubuntu/CentOS)"
    echo "5) Docker"
    echo "6) Test local setup"
    echo
    
    read -p "Enter choice (1-6): " choice
    echo
    
    case $choice in
        1)
            deploy_railway
            ;;
        2)
            deploy_render
            ;;
        3)
            deploy_heroku
            ;;
        4)
            deploy_vps
            ;;
        5)
            deploy_docker
            ;;
        6)
            print_info "Testing local setup..."
            
            # Check dependencies
            if ! command_exists node; then
                print_error "Node.js not installed"
                exit 1
            fi
            
            if ! command_exists npm; then
                print_error "npm not installed"
                exit 1
            fi
            
            print_status "Node.js $(node --version) installed"
            print_status "npm $(npm --version) installed"
            
            # Check environment
            if [[ -f ".env" ]]; then
                source .env
                if ! check_env_vars; then
                    exit 1
                fi
            else
                print_warning ".env file not found. Creating from template..."
                if [[ -f ".env.example" ]]; then
                    cp .env.example .env
                    print_warning "Please edit .env file with your actual values"
                else
                    print_error ".env.example not found"
                    exit 1
                fi
            fi
            
            # Install dependencies
            print_info "Installing dependencies..."
            npm install
            
            # Start server
            print_info "Starting server..."
            npm start &
            SERVER_PID=$!
            
            # Wait for server to start
            sleep 5
            
            # Test endpoints
            if test_endpoints "http://localhost:3001"; then
                print_status "Local setup is working correctly!"
            else
                print_error "Local setup test failed"
                kill $SERVER_PID 2>/dev/null || true
                exit 1
            fi
            
            # Stop server
            kill $SERVER_PID 2>/dev/null || true
            print_info "Test complete. Server stopped."
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo
    print_status "Deployment process completed!"
    print_info "Remember to:"
    echo "  - Set up monitoring and alerts"
    echo "  - Configure SSL/HTTPS for production"
    echo "  - Set up backup strategies"
    echo "  - Monitor logs and metrics"
}

# Run main function
main "$@"