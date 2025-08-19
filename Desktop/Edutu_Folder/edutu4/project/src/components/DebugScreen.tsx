import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

interface DebugScreenProps {
  title: string;
  status: 'success' | 'error' | 'info';
  message: string;
  details?: string;
  onAction?: () => void;
  actionText?: string;
}

const DebugScreen: React.FC<DebugScreenProps> = ({ 
  title, 
  status, 
  message, 
  details,
  onAction,
  actionText = 'Continue'
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle size={48} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={48} className="text-red-500" />;
      case 'info':
      default:
        return <Info size={48} className="text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'info':
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f9fafb' }}>
      <div className={`max-w-md w-full rounded-2xl shadow-lg p-8 text-center border-2 ${getStatusColor()}`}>
        <div className="mb-6">
          {getStatusIcon()}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          {title}
        </h1>
        
        <p className="text-gray-600 mb-4 leading-relaxed">
          {message}
        </p>
        
        {details && (
          <div className="bg-white p-4 rounded-lg mb-6 text-left">
            <p className="text-sm text-gray-500 mb-2">Technical Details:</p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {details}
            </pre>
          </div>
        )}
        
        {onAction && (
          <button
            onClick={onAction}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {actionText}
          </button>
        )}
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-400">
            Edutu Debug Screen • {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DebugScreen;