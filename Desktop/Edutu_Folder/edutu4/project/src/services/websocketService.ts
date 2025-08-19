import { auth } from '../config/firebase';

interface WebSocketMessage {
  type: 'chat' | 'typing' | 'error' | 'system' | 'stream_chunk';
  payload: any;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

interface StreamingResponse {
  id: string;
  content: string;
  isComplete: boolean;
  buttons?: any[];
  ragContext?: any;
}

type MessageHandler = (message: WebSocketMessage) => void;
type StreamHandler = (chunk: StreamingResponse) => void;
type ConnectionHandler = (connected: boolean) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private streamHandlers: Set<StreamHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionallyClosed = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionUrl: string;

  constructor() {
    // Use environment variable or fallback to Firebase Functions URL
    this.connectionUrl = import.meta.env.VITE_WEBSOCKET_URL || 
                        import.meta.env.VITE_API_BASE_URL?.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws' ||
                        'wss://us-central1-edutu-3.cloudfunctions.net/ws';
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyClosed = false;

    try {
      // Get auth token for authentication
      const token = await auth.currentUser?.getIdToken();
      const wsUrl = token ? `${this.connectionUrl}?token=${token}` : this.connectionUrl;

      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyConnectionHandlers(true);
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.notifyConnectionHandlers(false);
        this.stopHeartbeat();

        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.notifyConnectionHandlers(false);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'stream_chunk':
        this.notifyStreamHandlers(message.payload as StreamingResponse);
        break;
      case 'chat':
      case 'typing':
      case 'error':
      case 'system':
        this.notifyMessageHandlers(message);
        break;
      default:
        console.warn('🔔 Unknown message type:', message.type);
    }
  }

  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) return;

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        this.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'system',
          payload: { action: 'ping' },
          timestamp: Date.now()
        });
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(message: Omit<WebSocketMessage, 'userId' | 'sessionId'>): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, cannot send message');
      return false;
    }

    try {
      const fullMessage: WebSocketMessage = {
        ...message,
        userId: auth.currentUser?.uid,
        sessionId: `session_${Date.now()}`
      };

      this.ws.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      console.error('❌ Error sending WebSocket message:', error);
      return false;
    }
  }

  // Send chat message with streaming support
  sendChatMessage(content: string, userContext?: any): boolean {
    return this.send({
      type: 'chat',
      payload: {
        message: content,
        userContext,
        streaming: true // Request streaming response
      },
      timestamp: Date.now()
    });
  }

  // Send typing indicator
  sendTypingIndicator(isTyping: boolean): boolean {
    return this.send({
      type: 'typing',
      payload: { isTyping },
      timestamp: Date.now()
    });
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    console.log('🔌 WebSocket disconnected intentionally');
  }

  // Event handlers
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStream(handler: StreamHandler): () => void {
    this.streamHandlers.add(handler);
    return () => this.streamHandlers.delete(handler);
  }

  onConnection(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  private notifyMessageHandlers(message: WebSocketMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('❌ Error in message handler:', error);
      }
    });
  }

  private notifyStreamHandlers(response: StreamingResponse): void {
    this.streamHandlers.forEach(handler => {
      try {
        handler(response);
      } catch (error) {
        console.error('❌ Error in stream handler:', error);
      }
    });
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('❌ Error in connection handler:', error);
      }
    });
  }

  // Status getters
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState(): string {
    if (!this.ws) return 'CLOSED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  get reconnectCount(): number {
    return this.reconnectAttempts;
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();

// Auto-connect when service is imported (if user is authenticated)
auth.onAuthStateChanged((user) => {
  if (user) {
    // Small delay to ensure token is available
    setTimeout(() => {
      if (!webSocketService.isConnected) {
        webSocketService.connect().catch(console.error);
      }
    }, 1000);
  } else {
    webSocketService.disconnect();
  }
});

export type { WebSocketMessage, StreamingResponse, MessageHandler, StreamHandler, ConnectionHandler };