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
    _userId = null;            // Saved so we can re-join after reconnect
    _persistentCallbacks = {}; // event → Set of callbacks that survive socket recreation

    // Attach all stored persistent listeners to the current socket object
    _attachPersistentListeners() {
        if (!this.socket) return;
        Object.entries(this._persistentCallbacks).forEach(([event, callbacks]) => {
            callbacks.forEach(cb => {
                this.socket.off(event, cb); // avoid duplicates
                this.socket.on(event, cb);
            });
        });
    }

    connect() {
        if (this.socket || !io) return;

        console.log(`📡 Connecting to Socket.io at: ${SOCKET_BASE_URL}`);

        this.socket = io(SOCKET_BASE_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 3000,
            reconnectionDelayMax: 10000,
        });

        this.socket.on('connect', () => {
            this._connectionFailed = false;
            console.log('✅ Connected to Socket.io server');

            // Re-join user room (works on first connect and every reconnect)
            if (this._userId) {
                this.socket.emit('user:join', this._userId);
                console.log(`📡 (Re-)joined user:${this._userId}`);
            }

            // Flush rooms queued before connection
            this._pendingRooms.forEach(({ event, id }) => {
                this.socket.emit(event, id);
                console.log(`📡 (deferred) emitted ${event}:${id}`);
            });
            this._pendingRooms = [];

            // Re-attach persistent listeners (important after socket recreation)
            this._attachPersistentListeners();
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`❌ Disconnected: ${reason}`);
        });

        this.socket.on('connect_error', (error) => {
            if (!this._connectionFailed) {
                console.warn(`⚠️ Socket unavailable: ${error.message}`);
                this._connectionFailed = true;
            }
        });

        this.socket.on('reconnect', () => {
            this._connectionFailed = false;
            console.log('✅ Socket reconnected');
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
        this._userId = userId; // persist for auto-rejoin after reconnect
        if (this.socket?.connected) {
            this.socket.emit('user:join', userId);
            console.log(`📡 Joined room: user:${userId}`);
        } else {
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

    // group:job_accepted → fired to all members when the group leader accepts a job
    onGroupJobAccepted(callback) {
        if (this.socket) this.socket.on('group:job_accepted', callback);
    }

    offGroupJobAccepted(callback) {
        if (this.socket) {
            if (callback) this.socket.off('group:job_accepted', callback);
            else this.socket.off('group:job_accepted');
        }
    }

    // group:invite — PERSISTENT: survives socket reconnects
    onGroupInvite(callback) {
        if (!this._persistentCallbacks['group:invite']) {
            this._persistentCallbacks['group:invite'] = new Set();
        }
        this._persistentCallbacks['group:invite'].add(callback);
        // Also attach to current socket immediately if available
        if (this.socket) {
            this.socket.off('group:invite', callback); // avoid duplicates
            this.socket.on('group:invite', callback);
        }
    }

    offGroupInvite(callback) {
        if (this._persistentCallbacks['group:invite']) {
            if (callback) {
                this._persistentCallbacks['group:invite'].delete(callback);
            } else {
                this._persistentCallbacks['group:invite'].clear();
            }
        }
        if (this.socket) {
            if (callback) this.socket.off('group:invite', callback);
            else this.socket.off('group:invite');
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
