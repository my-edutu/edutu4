import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TestComponent from './components/TestComponent';
import './index.css';

// Simple test entry point
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

console.log('🧪 Loading Test Component...');

try {
  createRoot(rootElement).render(
    <StrictMode>
      <TestComponent />
    </StrictMode>
  );
  console.log('✅ Test Component rendered successfully');
} catch (error) {
  console.error('❌ Failed to render test component:', error);
  rootElement.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fee; color: #900; font-family: monospace; padding: 2rem;">
      <div style="text-align: center;">
        <h1>Critical Error</h1>
        <p>React failed to initialize</p>
        <p>Error: ${error}</p>
        <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem;">Reload</button>
      </div>
    </div>
  `;
}