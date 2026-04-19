import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      this.socket.on('connection_established', (data) => {
        console.log('Connection established:', data);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string) {
    this.socket?.off(event);
  }

  getSocket() {
    return this.socket;
  }
}

export default new SocketService();
