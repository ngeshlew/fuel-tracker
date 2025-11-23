import { io, Socket } from 'socket.io-client';
import type { FuelTopup } from './api';

// Use the same smart URL detection as API service
const getSocketUrl = (): string => {
  // Explicit environment variable takes precedence
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  
  // Auto-detect local development
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  
  // Production fallback
  return 'https://fuel-tracker.up.railway.app';
};

const SOCKET_URL = getSocketUrl();

// Log Socket URL in development for debugging
if (import.meta.env.DEV) {
  console.log('🔧 Socket URL:', SOCKET_URL);
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(): Socket {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server');
      this.isConnected = true;
      this.joinFuelTopupsRoom();
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  private joinFuelTopupsRoom(): void {
    if (this.socket) {
      this.socket.emit('join-fuel-topups');
    }
  }

  // Fuel topup event listeners
  onFuelTopupAdded(callback: (topup: FuelTopup) => void): void {
    if (this.socket) {
      this.socket.on('fuel-topup-added', callback);
    }
  }

  onFuelTopupUpdated(callback: (topup: FuelTopup) => void): void {
    if (this.socket) {
      this.socket.on('fuel-topup-updated', callback);
    }
  }

  onFuelTopupDeleted(callback: (data: { id: string }) => void): void {
    if (this.socket) {
      this.socket.on('fuel-topup-deleted', callback);
    }
  }

  // Remove event listeners
  offFuelTopupAdded(callback: (topup: FuelTopup) => void): void {
    if (this.socket) {
      this.socket.off('fuel-topup-added', callback);
    }
  }

  offFuelTopupUpdated(callback: (topup: FuelTopup) => void): void {
    if (this.socket) {
      this.socket.off('fuel-topup-updated', callback);
    }
  }

  offFuelTopupDeleted(callback: (data: { id: string }) => void): void {
    if (this.socket) {
      this.socket.off('fuel-topup-deleted', callback);
    }
  }

  // Emit events
  emitFuelTopupAdded(topup: FuelTopup): void {
    if (this.socket) {
      this.socket.emit('fuel-topup-added', topup);
    }
  }

  emitFuelTopupUpdated(topup: FuelTopup): void {
    if (this.socket) {
      this.socket.emit('fuel-topup-updated', topup);
    }
  }

  emitFuelTopupDeleted(id: string): void {
    if (this.socket) {
      this.socket.emit('fuel-topup-deleted', { id });
    }
  }

  // Connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Reconnect if disconnected
  reconnect(): void {
    if (!this.isConnected && this.socket) {
      this.socket.connect();
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
