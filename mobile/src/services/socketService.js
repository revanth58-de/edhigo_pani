import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/api.config';

// The socket URL should be the base URL without the /api suffix
const SOCKET_URL = API_BASE_URL.replace('/api', '');

class SocketService {
    socket = null;

    connect() {
        if (this.socket) return;

        this.socket = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true,
        });

        this.socket.on('connect', () => {
            console.log('✅ Connected to Socket.io server');
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from Socket.io server');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinJobRoom(jobId) {
        if (this.socket) {
            this.socket.emit('job:join', jobId);
            console.log(`📡 Joined room: job:${jobId}`);
        }
    }

    onJobAccepted(callback) {
        if (this.socket) {
            this.socket.on('job:accepted', callback);
        }
    }

    offJobAccepted() {
        if (this.socket) {
            this.socket.off('job:accepted');
        }
    }

    onLocationUpdate(callback) {
        if (this.socket) {
            this.socket.on('location:broadcast', callback);
        }
    }

    emitLocation(data) {
        if (this.socket) {
            this.socket.emit('location:update', data);
        }
    }
}

export const socketService = new SocketService();
