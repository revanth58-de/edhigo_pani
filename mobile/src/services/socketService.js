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
    _pendingRooms = []; // Queue rooms to join once socket connects

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
        if (this.socket) this.socket.on('group:invite', callback);
    }

    offGroupInvite(callback) {
        if (this.socket) {
            if (callback) this.socket.off('group:invite', callback);
            else this.socket.off('group:invite');
        }
    }

    onGroupMessage(callback) {
        if (this.socket) this.socket.on('group:message', callback);
    }

    offGroupMessage(callback) {
        if (this.socket) {
            if (callback) this.socket.off('group:message', callback);
            else this.socket.off('group:message');
        }
    }

    emitGroupMessage(data) {
        if (this.socket?.connected) {
            import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
                AsyncStorage.getItem('edhigo_auth').then(raw => {
                     let token = null;
                     if (raw) {
                         try { token = JSON.parse(raw).accessToken; } catch(e) {}
                     }
                     this.socket.emit('group:message', { ...data, token });
                });
            });
        }
    }

    // ── Farmer Notifications ─────────────────────────────────────────

    onJobAccepted(callback) {
        if (this.socket) this.socket.on('job:accepted', callback);
    }

    offJobAccepted(callback) {
        if (this.socket) {
            if (callback) this.socket.off('job:accepted', callback);
            else this.socket.off('job:accepted');
        }
    }

    onJobWithdrawn(callback) {
        if (this.socket) this.socket.on('job:withdrawn', callback);
    }

    offJobWithdrawn(callback) {
        if (this.socket) {
            if (callback) this.socket.off('job:withdrawn', callback);
            else this.socket.off('job:withdrawn');
        }
    }

    // ── Worker Notifications ─────────────────────────────────────────

    // job:taken → fired when another worker accepts a job (remove from feed)
    onJobTaken(callback) {
        if (this.socket) this.socket.on('job:taken', callback);
    }

    offJobTaken(callback) {
        if (this.socket) {
            // Pass the specific callback so only this screen's listener is removed
            if (callback) this.socket.off('job:taken', callback);
            else this.socket.off('job:taken');
        }
    }

    // job:new-offer → new job available (or job re-opened after withdrawal)
    onNewOffer(callback) {
        if (this.socket) this.socket.on('job:new-offer', callback);
    }

    offNewOffer(callback) {
        if (this.socket) {
            if (callback) this.socket.off('job:new-offer', callback);
            else this.socket.off('job:new-offer');
        }
    }

    onJobCancelled(callback) {
        if (this.socket) {
            this.socket.on('job:cancelled', callback);
            this.socket.on('worker:job_cancelled', callback);
        }
    }

    offJobCancelled(callback) {
        if (this.socket) {
            if (callback) {
                this.socket.off('job:cancelled', callback);
                this.socket.off('worker:job_cancelled', callback);
            } else {
                this.socket.off('job:cancelled');
                this.socket.off('worker:job_cancelled');
            }
        }
    }

    onWorkDone(callback) {
        if (this.socket) this.socket.on('work:done', callback);
    }

    offWorkDone(callback) {
        if (this.socket) {
            if (callback) this.socket.off('work:done', callback);
            else this.socket.off('work:done');
        }
    }

    // ── Attendance ───────────────────────────────────────────────────

    onAttendanceConfirmed(callback) {
        if (this.socket) this.socket.on('attendance:confirmed', callback);
    }

    offAttendanceConfirmed(callback) {
        if (this.socket) {
            if (callback) this.socket.off('attendance:confirmed', callback);
            else this.socket.off('attendance:confirmed');
        }
    }

    // ── Location ─────────────────────────────────────────────────────

    onLocationUpdate(callback) {
        if (this.socket) this.socket.on('location:broadcast', callback);
    }

    offLocationUpdate(callback) {
        if (this.socket) {
            if (callback) this.socket.off('location:broadcast', callback);
            else this.socket.off('location:broadcast');
        }
    }

    emitLocation(data) {
        if (this.socket?.connected) {
            this.socket.emit('location:update', data);
        }
    }
}

export const socketService = new SocketService();
