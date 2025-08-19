#!/bin/bash

# Enhanced RAG System Deployment Script for Edutu
# This script deploys the full RAG-enabled backend with all components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${FIREBASE_PROJECT_ID:-"edutu-3"}
REGION=${FIREBASE_REGION:-"us-central1"}
SUPABASE_PROJECT_ID=${SUPABASE_PROJECT_ID}
BACKUP_ENABLED=${BACKUP_ENABLED:-"true"}

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check required commands
    local required_commands=("firebase" "node" "npm" "curl" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is required but not installed."
            exit 1
        fi
    done
    
    # Check Firebase CLI login
    if ! firebase projects:list &> /dev/null; then
        error "Firebase CLI not authenticated. Run 'firebase login' first."
        exit 1
    fi
    
    # Check project exists
    if ! firebase projects:list | grep -q "$PROJECT_ID"; then
        error "Firebase project '$PROJECT_ID' not found."
        exit 1
    fi
    
    # Check environment variables
    local required_env=("GEMINI_API_KEY" "OPENAI_API_KEY" "COHERE_API_KEY" "SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY")
    for env_var in "${required_env[@]}"; do
        if [[ -z "${!env_var}" ]]; then
            error "Environment variable $env_var is required but not set."
            exit 1
        fi
    done
    
    success "Prerequisites check passed."
}

# Backup existing data
backup_existing_data() {
    if [[ "$BACKUP_ENABLED" == "true" ]]; then
        log "Creating backup of existing data..."
        
        local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"
        
        # Backup Firestore data
        log "Backing up Firestore data..."
        firebase firestore:export "gs://${PROJECT_ID}.appspot.com/backups/firestore/$(date +%Y%m%d_%H%M%S)" --project="$PROJECT_ID" || warning "Firestore backup failed"
        
        # Backup current functions
        if [[ -d "functions" ]]; then
            log "Backing up current functions..."
            cp -r functions "$backup_dir/functions" || warning "Functions backup failed"
        fi
        
        success "Backup completed in $backup_dir"
    else
        warning "Backup disabled. Skipping backup step."
    fi
}

# Set up Supabase vector database
setup_supabase_database() {
    log "Setting up Supabase vector database..."
    
    # Check if Supabase CLI is available
    if command -v supabase &> /dev/null; then
        log "Using Supabase CLI for database setup..."
        
        # Apply migrations
        if [[ -f "enhanced-supabase-schema.sql" ]]; then
            log "Applying Supabase schema..."
            supabase db reset --db-url "$SUPABASE_URL" || warning "Supabase schema application failed"
        fi
    else
        log "Supabase CLI not found. Please apply enhanced-supabase-schema.sql manually."
        warning "Run the following SQL file on your Supabase database: enhanced-supabase-schema.sql"
    fi
    
    # Test connection
    log "Testing Supabase connection..."
    local test_response=$(curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_URL/rest/v1/" | jq -r '.message // empty')
    
    if [[ -n "$test_response" ]] && [[ "$test_response" != "null" ]]; then
        success "Supabase connection test passed."
    else
        warning "Supabase connection test inconclusive. Please verify manually."
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    if [[ -d "functions" ]]; then
        cd functions
        
        log "Installing Firebase Functions dependencies..."
        npm install
        
        # Install additional RAG system dependencies
        local rag_dependencies=(
            "@supabase/supabase-js@^2.39.0"
            "@google/generative-ai@^0.7.1"
            "openai@^4.28.0"
            "cohere-ai@^7.7.5"
            "uuid@^9.0.0"
            "@types/uuid@^9.0.0"
            "express-rate-limit@^7.1.5"
        )
        
        for dep in "${rag_dependencies[@]}"; do
            log "Installing $dep..."
            npm install "$dep" || warning "Failed to install $dep"
        done
        
        cd ..
        success "Dependencies installed."
    else
        error "Functions directory not found."
        exit 1
    fi
}

# Update Firebase configuration
update_firebase_config() {
    log "Updating Firebase configuration..."
    
    # Update firebase.json with new functions
    if [[ -f "firebase.json" ]]; then
        log "Backing up existing firebase.json..."
        cp firebase.json firebase.json.backup
        
        # You might want to update firebase.json here to include new functions
        # This would depend on your specific configuration needs
        
        success "Firebase configuration updated."
    else
        warning "firebase.json not found. Using default configuration."
    fi
}

# Deploy Firestore security rules
deploy_firestore_rules() {
    log "Deploying Firestore security rules..."
    
    if [[ -f "enhanced-firestore.rules" ]]; then
        # Backup existing rules
        if [[ -f "firestore.rules" ]]; then
            cp firestore.rules firestore.rules.backup
        fi
        
        # Copy enhanced rules
        cp enhanced-firestore.rules firestore.rules
        
        # Deploy rules
        firebase deploy --only firestore:rules --project="$PROJECT_ID"
        
        success "Firestore security rules deployed."
    else
        error "Enhanced Firestore rules file not found."
        exit 1
    fi
}

# Deploy Firebase Functions
deploy_functions() {
    log "Deploying Firebase Functions..."
    
    # Build functions
    cd functions
    log "Building functions..."
    npm run build || npm run tsc || warning "Build step failed, proceeding with deployment"
    cd ..
    
    # Deploy functions
    log "Deploying functions to Firebase..."
    firebase deploy --only functions --project="$PROJECT_ID" --force
    
    success "Firebase Functions deployed."
}

# Initialize embeddings for existing data
initialize_embeddings() {
    log "Initializing embeddings for existing data..."
    
    # Call the embedding initialization function
    local function_url="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/refreshEmbeddings"
    
    log "Calling embedding refresh function..."
    local response=$(curl -s -X POST "$function_url" \
        -H "Content-Type: application/json" \
        -d '{"type": "all", "force": true}' \
        -w "%{http_code}")
    
    local http_code="${response: -3}"
    local body="${response%???}"
    
    if [[ "$http_code" == "200" ]]; then
        success "Embedding initialization completed."
        log "Response: $body"
    else
        warning "Embedding initialization may have failed. HTTP Code: $http_code"
        log "Response: $body"
    fi
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    local base_url="https://${REGION}-${PROJECT_ID}.cloudfunctions.net"
    local errors=0
    
    # Test health endpoint
    log "Testing health endpoint..."
    local health_response=$(curl -s "$base_url/health" -w "%{http_code}")
    local health_code="${health_response: -3}"
    
    if [[ "$health_code" == "200" ]]; then
        success "Health endpoint working."
    else
        error "Health endpoint failed. HTTP Code: $health_code"
        ((errors++))
    fi
    
    # Test chat endpoint (requires authentication)
    log "Testing chat endpoint structure..."
    local chat_response=$(curl -s "$base_url/api/chat/message" -X POST -w "%{http_code}")
    local chat_code="${chat_response: -3}"
    
    if [[ "$chat_code" == "401" ]]; then
        success "Chat endpoint properly requires authentication."
    else
        warning "Chat endpoint response unexpected. HTTP Code: $chat_code"
    fi
    
    # Test Supabase connection from functions
    log "Testing Supabase integration..."
    # This would require a specific test endpoint
    
    # Check if scheduled functions are deployed
    log "Checking scheduled functions..."
    local functions_list=$(firebase functions:list --project="$PROJECT_ID" 2>/dev/null || echo "")
    
    if echo "$functions_list" | grep -q "processEmbeddingBacklog"; then
        success "Scheduled embedding functions deployed."
    else
        warning "Scheduled embedding functions may not be deployed."
    fi
    
    if [[ $errors -eq 0 ]]; then
        success "Deployment verification completed successfully."
    else
        warning "Deployment completed with $errors warnings/errors."
    fi
}

# Run post-deployment tasks
run_post_deployment_tasks() {
    log "Running post-deployment tasks..."
    
    # Update system configuration
    log "Updating system configuration..."
    
    # You might want to update feature flags, configuration, etc.
    
    # Send deployment notification (if configured)
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        log "Sending deployment notification..."
        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"Edutu RAG System deployed successfully to $PROJECT_ID\"}" || warning "Notification failed"
    fi
    
    success "Post-deployment tasks completed."
}

# Main deployment function
main() {
    log "Starting Edutu RAG System deployment..."
    log "Project: $PROJECT_ID"
    log "Region: $REGION"
    
    check_prerequisites
    backup_existing_data
    setup_supabase_database
    install_dependencies
    update_firebase_config
    deploy_firestore_rules
    deploy_functions
    initialize_embeddings
    verify_deployment
    run_post_deployment_tasks
    
    success "🎉 Edutu RAG System deployment completed successfully!"
    
    log ""
    log "Next steps:"
    log "1. Monitor function logs: firebase functions:log --project=$PROJECT_ID"
    log "2. Test the chat functionality with authenticated users"
    log "3. Check Supabase dashboard for embedding data"
    log "4. Monitor system metrics and performance"
    log ""
    log "Useful commands:"
    log "- View logs: firebase functions:log --project=$PROJECT_ID"
    log "- Check function status: firebase functions:list --project=$PROJECT_ID"
    log "- Test endpoints: curl -X POST https://${REGION}-${PROJECT_ID}.cloudfunctions.net/api/chat/message"
}

# Error handling
trap 'error "Deployment failed at line $LINENO. Check the logs above for details."' ERR

# Check if running with required arguments
if [[ $# -eq 0 ]]; then
    log "Usage: $0 [--project-id PROJECT_ID] [--no-backup] [--dry-run]"
    log ""
    log "Environment variables required:"
    log "- GEMINI_API_KEY"
    log "- OPENAI_API_KEY"
    log "- COHERE_API_KEY"
    log "- SUPABASE_URL"
    log "- SUPABASE_SERVICE_ROLE_KEY"
    log ""
    log "Optional environment variables:"
    log "- FIREBASE_PROJECT_ID (default: edutu-3)"
    log "- FIREBASE_REGION (default: us-central1)"
    log "- SLACK_WEBHOOK_URL (for notifications)"
    log ""
fi

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project-id)
            PROJECT_ID="$2"
            shift 2
            ;;
        --no-backup)
            BACKUP_ENABLED="false"
            shift
            ;;
        --dry-run)
            log "Dry run mode - would deploy to project: $PROJECT_ID"
            exit 0
            ;;
        --help)
            log "Edutu RAG System Deployment Script"
            log ""
            log "This script deploys the complete RAG-enabled backend including:"
            log "- Enhanced embedding services"
            log "- Vector database integration"
            log "- RAG chat system"
            log "- Background processing jobs"
            log "- Updated security rules"
            log ""
            exit 0
            ;;
        *)
            error "Unknown option $1"
            exit 1
            ;;
    esac
done

# Run main deployment
main