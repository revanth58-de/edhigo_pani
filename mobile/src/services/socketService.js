import { SOCKET_BASE_URL } from '../config/api.config';

let io = null;
try {
    io = require('socket.io-client').io;
} catch (e) {
    console.warn('⚠️ socket.io-client not available, real-time features disabled');
}

class SocketService {
    socket = null;
    _connectionFailed = false; // Suppress repeated errors after max attempts

    connect() {
        if (this.socket?.connected || !io) return;
        if (this._connectionFailed) return; // Already gave up — don't spam

        // Disconnect any stale socket before reconnecting
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        console.log(`📡 Connecting to Socket.io at: ${SOCKET_BASE_URL}`);

        this.socket = io(SOCKET_BASE_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 3000,
        });

        this.socket.on('connect', () => {
            this._connectionFailed = false;
            console.log('✅ Connected to Socket.io server');
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`❌ Disconnected from Socket.io: ${reason}`);
        });

        this.socket.on('connect_error', (error) => {
            // Only log first error — avoid flooding the console
            if (!this._connectionFailed) {
                console.warn(`⚠️ Socket unavailable (phone may not be on same WiFi as server): ${error.message}`);
            }
        });

        this.socket.on('reconnect_failed', () => {
            this._connectionFailed = true;
            console.warn('ℹ️ Socket.io gave up reconnecting. Real-time features disabled. Restart app when on same WiFi as server.');
            this.socket.disconnect();
            this.socket = null;
        });

        this.socket.on('reconnect', () => {
            this._connectionFailed = false;
            console.log('✅ Socket reconnected successfully');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this._connectionFailed = false;
    }

    joinJobRoom(jobId) {
        if (this.socket?.connected) {
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
        if (this.socket?.connected) {
            this.socket.emit('location:update', data);
        }
    }

    joinUserRoom(userId) {
        if (this.socket?.connected) {
            this.socket.emit('user:join', userId);
            console.log(`📡 Joined room: user:${userId}`);
        }
    }

    onJobCancelled(callback) {
        if (this.socket) {
            this.socket.on('job:cancelled', callback);
            this.socket.on('worker:job_cancelled', callback);
        }
    }

    offJobCancelled() {
        if (this.socket) {
            this.socket.off('job:cancelled');
            this.socket.off('worker:job_cancelled');
        }
    }
}

export const socketService = new SocketService();

