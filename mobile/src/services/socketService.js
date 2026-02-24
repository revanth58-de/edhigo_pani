import { API_BASE_URL } from '../config/api.config';

// The socket URL should be the base URL without the /api suffix
const SOCKET_URL = API_BASE_URL.replace('/api', '');

let io = null;
try {
    io = require('socket.io-client').io;
} catch (e) {
    console.warn('⚠️ socket.io-client not available, real-time features disabled');
}

class SocketService {
    socket = null;

    connect() {
        if (this.socket?.connected || !io) return;

        // Disconnect any stale socket before reconnecting
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        console.log(`📡 Connecting to Socket.io at: ${SOCKET_URL}`);

        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });

        this.socket.on('connect', () => {
            console.log('✅ Connected to Socket.io server');
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`❌ Disconnected from Socket.io: ${reason}`);
        });

        this.socket.on('connect_error', (error) => {
            console.error(`⚠️ Socket connection error: ${error.message}`);
        });

        this.socket.on('reconnect_attempt', (attempt) => {
            console.log(`🔄 Socket reconnection attempt #${attempt}`);
        });

        this.socket.on('reconnect', () => {
            console.log('✅ Socket reconnected successfully');
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
