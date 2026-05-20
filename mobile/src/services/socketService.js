import { SOCKET_BASE_URL } from '../config/api.config';

let io = null;
try {
    io = require('socket.io-client').io;
} catch (e) {
    console.warn('⚠️ socket.io-client not available, real-time features disabled');
}

class SocketService {
    socket = null;
    _connectionFailed = false;
    _pendingRooms = [];
    _listeners = {};

    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        if (!this._listeners[event].includes(callback)) {
            this._listeners[event].push(callback);
        }
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (!this._listeners[event]) return;
        if (callback) {
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
            if (this.socket) {
                this.socket.off(event, callback);
            }
        } else {
            delete this._listeners[event];
            if (this.socket) {
                this.socket.off(event);
            }
        }
    }

    emit(event, data) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        } else {
            console.warn(`⚠️ Socket not connected. Cannot emit ${event}`);
        }
    }

    connect() {
        if (this.socket?.connected || !io) return;
        // Allow retrying even after previous failure (network may have recovered)
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        // SEC-2 FIX: Read the JWT from the Zustand auth store so the backend
        // can authenticate this socket connection before allowing room joins.
        let token = null;
        try {
            const useAuthStore = require('../store/authStore').default;
            token = useAuthStore.getState().accessToken;
        } catch (e) {
            console.warn('Could not read auth token for socket connection');
        }

        console.log(`📡 Connecting to Socket.io at: ${SOCKET_BASE_URL}`);

        this.socket = io(SOCKET_BASE_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 3000,
            auth: { token }, // ← passed to io.use() middleware on the server
        });

        // Re-register all active listeners on the new socket object
        Object.entries(this._listeners).forEach(([event, callbacks]) => {
            callbacks.forEach(callback => {
                this.socket.on(event, callback);
            });
        });

        this.socket.on('connect', () => {
            this._connectionFailed = false;
            console.log('✅ Connected to Socket.io server');
            // Flush any rooms that were requested before connection was ready
            if (this._pendingRooms.length > 0) {
                this._pendingRooms.forEach(({ event, id }) => {
                    this.socket.emit(event, id);
                    console.log(`📡 (deferred) emitted ${event}:${id}`);
                });
                this._pendingRooms = [];
            }
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
            console.warn('ℹ️ Socket.io gave up reconnecting. Will retry in 10s...');
            // Schedule a recovery attempt — don't kill permanently
            setTimeout(() => {
                this._connectionFailed = false;
                if (this.socket) {
                    this.socket.disconnect();
                    this.socket = null;
                }
                this.connect();
            }, 10000);
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
        this._pendingRooms = [];
    }

    joinJobRoom(jobId) {
        if (this.socket?.connected) {
            this.socket.emit('job:join', jobId);
            console.log(`📡 Joined room: job:${jobId}`);
        } else {
            // Queue for when connection is ready
            this._pendingRooms.push({ event: 'job:join', id: jobId });
        }
    }

    joinUserRoom(userId) {
        if (this.socket?.connected) {
            this.socket.emit('user:join', userId);
            console.log(`📡 Joined room: user:${userId}`);
        } else {
            // Queue for when connection is ready
            this._pendingRooms.push({ event: 'user:join', id: userId });
        }
    }

    // ── Group Chat ───────────────────────────────────────────────────

    joinGroupRoom(groupId) {
        if (this.socket?.connected) {
            this.socket.emit('group:join', groupId);
            console.log(`📡 Joined room: group:${groupId}`);
        } else {
            this._pendingRooms.push({ event: 'group:join', id: groupId });
        }
    }

    onGroupInvite(callback) {
        this.on('group:invite', callback);
    }

    offGroupInvite(callback) {
        this.off('group:invite', callback);
    }

    onGroupMessage(callback) {
        this.on('group:message', callback);
    }

    offGroupMessage(callback) {
        this.off('group:message', callback);
    }

    emitGroupMessage(data) {
        if (this.socket?.connected) {
            let token = null;
            try {
                const useAuthStore = require('../store/authStore').default;
                token = useAuthStore.getState().accessToken;
            } catch (e) {
                console.warn('Could not read auth token for group message');
            }
            this.socket.emit('group:message', { ...data, token });
        }
    }

    // ── Farmer Notifications ─────────────────────────────────────────

    onJobAccepted(callback) {
        this.on('job:accepted', callback);
    }

    offJobAccepted(callback) {
        this.off('job:accepted', callback);
    }

    onJobWithdrawn(callback) {
        this.on('job:withdrawn', callback);
    }

    offJobWithdrawn(callback) {
        this.off('job:withdrawn', callback);
    }

    // ── Worker Notifications ─────────────────────────────────────────

    // job:taken → fired when another worker accepts a job (remove from feed)
    onJobTaken(callback) {
        this.on('job:taken', callback);
    }

    offJobTaken(callback) {
        this.off('job:taken', callback);
    }

    // job:new-offer → new job available (or job re-opened after withdrawal)
    onNewOffer(callback) {
        this.on('job:new-offer', callback);
    }

    offNewOffer(callback) {
        this.off('job:new-offer', callback);
    }

    onJobCancelled(callback) {
        this.on('job:cancelled', callback);
        this.on('worker:job_cancelled', callback);
    }

    offJobCancelled(callback) {
        this.off('job:cancelled', callback);
        this.off('worker:job_cancelled', callback);
    }

    onWorkDone(callback) {
        this.on('work:done', callback);
    }

    offWorkDone(callback) {
        this.off('work:done', callback);
    }

    // ── Attendance ───────────────────────────────────────────────────

    onAttendanceConfirmed(callback) {
        this.on('attendance:confirmed', callback);
    }

    offAttendanceConfirmed(callback) {
        this.off('attendance:confirmed', callback);
    }

    // ── Location ─────────────────────────────────────────────────────

    onLocationUpdate(callback) {
        this.on('location:broadcast', callback);
    }

    offLocationUpdate(callback) {
        this.off('location:broadcast', callback);
    }

    emitLocation(data) {
        this.emit('location:update', data);
    }
}

export const socketService = new SocketService();
