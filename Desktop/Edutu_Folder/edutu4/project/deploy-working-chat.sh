#!/bin/bash

# Quick Deploy Script for Working AI Chat
# This will get your chat working with real AI in under 5 minutes

set -e

echo "🚀 Deploying Working AI Chat for Edutu..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [ ! -d "functions" ]; then
    error "Please run this script from the project root directory (where functions/ folder exists)"
    exit 1
fi

# Check for Firebase CLI
if ! command -v firebase &> /dev/null; then
    error "Firebase CLI not found. Install with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    error "Not logged in to Firebase. Run: firebase login"
    exit 1
fi

log "Setting up AI API keys in Firebase Functions config..."

# Check for required environment variables
if [ -z "$GEMINI_API_KEY" ]; then
    warning "GEMINI_API_KEY not found in environment"
    echo "Please set it with: export GEMINI_API_KEY='your-key-here'"
    echo "Get your key from: https://ai.google.dev/"
    read -p "Enter your Gemini API key: " GEMINI_API_KEY
fi

if [ -z "$OPENAI_API_KEY" ]; then
    warning "OPENAI_API_KEY not found in environment"
    echo "Please set it with: export OPENAI_API_KEY='your-key-here'"
    echo "Get your key from: https://platform.openai.com/api-keys"
    read -p "Enter your OpenAI API key: " OPENAI_API_KEY
fi

# Set Firebase Functions configuration
log "Configuring Firebase Functions with AI API keys..."
firebase functions:config:set \
  ai.gemini_key="$GEMINI_API_KEY" \
  ai.openai_key="$OPENAI_API_KEY" \
  --project=edutu-3

success "Firebase Functions config updated"

# Install dependencies
log "Installing Firebase Functions dependencies..."
cd functions

# Check if package.json exists
if [ ! -f "package.json" ]; then
    error "functions/package.json not found"
    exit 1
fi

# Install required AI packages
log "Installing AI service packages..."
npm install @google/generative-ai openai --save

# Build the functions
log "Building Firebase Functions..."
npm run build

cd ..

# Deploy only the functions
log "Deploying Firebase Functions..."
firebase deploy --only functions --project=edutu-3

success "Firebase Functions deployed successfully!"

# Test the endpoint
log "Testing the deployed chat endpoint..."
BASE_URL="https://us-central1-edutu-3.cloudfunctions.net"

# Test health endpoint first
log "Checking health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" "$BASE_URL/healthCheck" -o /tmp/health_response)
HEALTH_CODE="${HEALTH_RESPONSE: -3}"

if [ "$HEALTH_CODE" = "200" ]; then
    success "Health endpoint working (HTTP 200)"
else
    warning "Health endpoint returned HTTP $HEALTH_CODE"
fi

# Test simple chat endpoint
log "Testing simple chat endpoint..."
CHAT_RESPONSE=$(curl -s -w "%{http_code}" \
  -X POST "$BASE_URL/simpleChat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, this is a test"}' \
  -o /tmp/chat_response)
CHAT_CODE="${CHAT_RESPONSE: -3}"

if [ "$CHAT_CODE" = "200" ]; then
    success "Chat endpoint working (HTTP 200)"
    log "Response preview:"
    head -c 200 /tmp/chat_response
    echo "..."
else
    warning "Chat endpoint returned HTTP $CHAT_CODE"
    log "Response:"
    cat /tmp/chat_response
fi

echo ""
success "🎉 Deployment completed!"

echo ""
log "Next steps:"
echo "1. Open your Edutu frontend application"
echo "2. Go to the chat section"
echo "3. Send a message - you should now get real AI responses!"
echo ""
log "Endpoints deployed:"
echo "• Health: $BASE_URL/healthCheck"
echo "• Chat: $BASE_URL/simpleChat"
echo "• Main API: $BASE_URL/api/chat/message"
echo ""
log "If you have issues:"
echo "• Check Firebase Console for function logs"
echo "• Verify API keys are set correctly"
echo "• Test endpoints manually with curl"
echo ""
log "To view logs: firebase functions:log --project=edutu-3"

# Cleanup temp files
rm -f /tmp/health_response /tmp/chat_response

success "✨ Your AI chat is now live and functional!"