/**
 * Firebase Functions Configuration Setup Script
 * Run this before deploying functions to set environment variables
 */

const { execSync } = require('child_process');

const configs = [
  // AI Service Configuration
  { key: 'ai.gemini_key', value: 'YOUR_GEMINI_API_KEY' },
  { key: 'ai.openai_key', value: 'YOUR_OPENAI_API_KEY' },
  { key: 'ai.cohere_key', value: 'YOUR_COHERE_API_KEY' },
  
  // Supabase Configuration
  { key: 'supabase.url', value: 'https://YOUR_PROJECT.supabase.co' },
  { key: 'supabase.service_key', value: 'YOUR_SUPABASE_SERVICE_ROLE_KEY' },
  
  // CORS Configuration
  { key: 'app.cors_origins', value: 'https://edutu-ai.web.app,https://edutu-ai.firebaseapp.com' },
  
  // Rate Limiting
  { key: 'app.rate_limit_window_ms', value: '900000' },
  { key: 'app.rate_limit_max_requests', value: '100' },
  
  // Environment
  { key: 'app.node_env', value: 'production' }
];

console.log('🚀 Setting up Firebase Functions configuration...\n');

console.log('IMPORTANT: Replace the placeholder values with your actual API keys and configuration:');
console.log('='.repeat(80));

configs.forEach((config, index) => {
  console.log(`${index + 1}. ${config.key}:`);
  console.log(`   Current: ${config.value}`);
  
  if (config.value.startsWith('YOUR_') || config.value.startsWith('https://YOUR_')) {
    console.log('   ⚠️  PLACEHOLDER - Replace with actual value');
  } else {
    console.log('   ✅ Configured');
  }
  
  console.log('');
});

console.log('To set these configurations, run:');
console.log('firebase functions:config:set ai.gemini_key="your_key" ai.openai_key="your_key" ...\n');

console.log('Or use the individual commands:');
configs.forEach(config => {
  console.log(`firebase functions:config:set ${config.key}="${config.value}"`);
});

console.log('\nAfter setting the configuration, deploy with:');
console.log('firebase deploy --only functions');

module.exports = configs;