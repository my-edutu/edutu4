import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: '#f8fafc',
        borderRadius: '1rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          backgroundColor: '#1E88E5',
          borderRadius: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          ✓
        </div>
        
        <h1 style={{
          color: '#1E88E5',
          fontSize: '1.8rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem'
        }}>
          Edutu
        </h1>
        
        <h2 style={{
          color: '#374151',
          fontSize: '1.1rem',
          marginBottom: '1rem',
          fontWeight: '600'
        }}>
          React is Working! 🎉
        </h2>
        
        <p style={{
          color: '#6b7280',
          marginBottom: '1.5rem',
          lineHeight: '1.5'
        }}>
          The core React application is functioning correctly. 
          This means the issue was likely with component imports or CSS conflicts.
        </p>
        
        <div style={{
          padding: '1rem',
          backgroundColor: '#e0f2fe',
          borderRadius: '0.5rem',
          marginBottom: '1rem'
        }}>
          <p style={{
            color: '#0277bd',
            fontSize: '0.9rem',
            margin: 0,
            fontWeight: '500'
          }}>
            ✅ Vite Dev Server: Running<br />
            ✅ React: Loaded<br />
            ✅ TypeScript: Compiled<br />
            ✅ CSS: Applied
          </p>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#1E88E5',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.9rem'
          }}
        >
          Refresh to Load Full App
        </button>
        
        <p style={{
          color: '#9ca3af',
          fontSize: '0.8rem',
          marginTop: '1rem'
        }}>
          {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default TestComponent;