import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Enhanced error handling for main entry
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

// Add global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

console.log('🚀 Initializing Edutu Application...');

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('✅ App successfully rendered');
} catch (error) {
  console.error('❌ Failed to render app:', error);
  // Fallback rendering
  rootElement.innerHTML = `
    <div style="min-height: 100vh; display: flex; items-center: justify-center; background: #f3f4f6; font-family: Inter, sans-serif;">
      <div style="text-align: center; padding: 2rem; background: white; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-width: 400px;">
        <h1 style="color: #1E88E5; margin-bottom: 1rem; font-size: 1.5rem; font-weight: bold;">Edutu</h1>
        <p style="color: #666; margin-bottom: 1rem;">Application failed to load. Please refresh the page.</p>
        <button onclick="window.location.reload()" style="background: #1E88E5; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">Refresh Page</button>
      </div>
    </div>
  `;
}
