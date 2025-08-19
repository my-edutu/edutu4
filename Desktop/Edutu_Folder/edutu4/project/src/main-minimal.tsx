import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppMinimal from './App-minimal';
import './index.css';

// Minimal entry point with better error handling
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

console.log('🚀 Starting Edutu (Minimal Mode)...');

try {
  createRoot(rootElement).render(
    <StrictMode>
      <AppMinimal />
    </StrictMode>
  );
  console.log('✅ App successfully rendered in minimal mode');
} catch (error) {
  console.error('❌ Failed to render app:', error);
  
  // Enhanced fallback with better styling
  rootElement.innerHTML = `
    <div style="
      min-height: 100vh; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Inter', -apple-system, sans-serif;
      padding: 2rem;
    ">
      <div style="
        background: white;
        border-radius: 1rem;
        padding: 2rem;
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        text-align: center;
        max-width: 400px;
        width: 100%;
      ">
        <div style="
          width: 60px;
          height: 60px;
          background: #dc2626;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem auto;
          color: white;
          font-size: 24px;
          font-weight: bold;
        ">!</div>
        <h1 style="color: #dc2626; font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;">
          Edutu Failed to Load
        </h1>
        <p style="color: #6b7280; margin-bottom: 1rem; line-height: 1.5;">
          There was a critical error initializing the application.
        </p>
        <div style="
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
          text-align: left;
        ">
          <p style="color: #dc2626; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">
            Error Details:
          </p>
          <code style="color: #991b1b; font-size: 0.75rem; word-break: break-all;">
            ${error instanceof Error ? error.message : String(error)}
          </code>
        </div>
        <button 
          onclick="window.location.reload()" 
          style="
            background: #1f2937;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.9rem;
            transition: background-color 0.2s;
          "
          onmouseover="this.style.backgroundColor='#111827'"
          onmouseout="this.style.backgroundColor='#1f2937'"
        >
          Refresh Page
        </button>
        <p style="color: #9ca3af; font-size: 0.75rem; margin-top: 1rem;">
          If this error persists, please check the browser console for more details.
        </p>
      </div>
    </div>
  `;
}