import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api.config';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true', // Required for localtunnel to skip interstitial page
    },
    timeout: 30000, // 30s — localtunnel warmup can be slow on first request
});

// Set auth token for authenticated requests
export const setAuthToken = (token) => {
    if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete apiClient.defaults.headers.common['Authorization'];
    }
};

// ── SecureStore shim (mirrors authStore.js) ────────────────────────────────
// expo-secure-store requires a native build. In Expo Go the native module is
// not bridged, so we check availability first and fall back to AsyncStorage.
const getTokenSafe = async (key) => {
    try {
        const SecureStore = await import('expo-secure-store');
        const available = await SecureStore.isAvailableAsync();
        if (available) return await SecureStore.getItemAsync(key);
        return await AsyncStorage.getItem(key);
    } catch {
        return await AsyncStorage.getItem(key);
    }
};

const deleteTokenSafe = async (key) => {
    try {
        const SecureStore = await import('expo-secure-store');
        const available = await SecureStore.isAvailableAsync();
        if (available) {
            await SecureStore.deleteItemAsync(key);
        } else {
            await AsyncStorage.removeItem(key);
        }
    } catch {
        await AsyncStorage.removeItem(key);
    }
};

// ── Single unified response interceptor ────────────────────────────────────
//   1. Auto-retry once on tunnel transient errors (408, 503)
//   2. Auto-refresh access token on 401 and retry the original request
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const originalRequest = error.config;

        // ── Tunnel retry ──────────────────────────────────────────────────
        if ((status === 408 || status === 503) && !originalRequest._tunnelRetried) {
            originalRequest._tunnelRetried = true;
            console.warn(`⚠️ Tunnel returned ${status}, retrying in 2s...`);
            await sleep(2000);
            return apiClient(originalRequest);
        }

        // ── Token refresh on 401 ──────────────────────────────────────────
        // Keys must match what authStore.js writes: separate keys per token.
        if (status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/')
        ) {
            originalRequest._retry = true;
            try {
                const refreshToken = await getTokenSafe('edhigo_refresh_token');

                if (refreshToken) {
                    const resp = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken,
                    });

                    const { accessToken } = resp.data;
                    setAuthToken(accessToken);
                    originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

                    // Persist the new access token under the correct key
                    try {
                        const SecureStore = await import('expo-secure-store');
                        const available = await SecureStore.isAvailableAsync();
                        if (available) {
                            await SecureStore.setItemAsync('edhigo_access_token', accessToken);
                        } else {
                            await AsyncStorage.setItem('edhigo_access_token', accessToken);
                        }
                    } catch {
                        await AsyncStorage.setItem('edhigo_access_token', accessToken);
                    }

                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                console.error('Token refresh failed — user must re-login:', refreshError);
                // Clear stored tokens so the nav guard redirects to login
                await deleteTokenSafe('edhigo_access_token');
                await deleteTokenSafe('edhigo_refresh_token');
            }
        }

        return Promise.reject(error);
    }
);

// ─── Auth API ───
export const authAPI = {
    sendOTP: (phone) => apiClient.post('/auth/send-otp', { phone }),
    verifyOTP: (phone, otp, registrationData = {}) => apiClient.post('/auth/verify-otp', { phone, otp, ...registrationData }),
    setRole: (role) => apiClient.post('/auth/set-role', { role }),
    updateProfile: (data) => apiClient.put('/auth/profile', data),
    getMe: () => apiClient.get('/auth/me'),
    refreshToken: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
};

// ─── Job API ───
export const jobAPI = {
    createJob: (jobData) => apiClient.post('/jobs', jobData),
    getJobs: (filters) => apiClient.get('/jobs', { params: filters }),
    getMyJobs: () => apiClient.get('/jobs/my-jobs'),
    getWorkerHistory: () => apiClient.get('/jobs/worker-history'),
    getWorkerJobs: () => apiClient.get('/jobs/my-work'),    // ← all jobs via JobApplication
    getJob: (jobId) => apiClient.get(`/jobs/${jobId}`),
    updateStatus: (jobId, status) => apiClient.put(`/jobs/${jobId}/status`, { status }),
    acceptJob: (jobId, workerId) => apiClient.post(`/jobs/${jobId}/accept`, { workerId }),
    withdrawJob: (jobId) => apiClient.post(`/jobs/${jobId}/withdraw`),  // Radio System
    cancelJob: (jobId) => apiClient.delete(`/jobs/${jobId}`),
    getNearbyWorkers: (params = {}) => apiClient.get('/jobs/nearby-workers', { params }),
};


// ─── Attendance API ───
export const attendanceAPI = {
    checkIn: (data) => apiClient.post('/attendance/check-in', data),
    checkOut: (data) => apiClient.post('/attendance/check-out', data),
    getRecords: (jobId) => apiClient.get(`/attendance/${jobId}`),
};

// ─── Payment API ───
export const paymentAPI = {
    makePayment: (data) => apiClient.post('/payments', data),
    getHistory: (userId) => apiClient.get(`/payments/history/${userId}`),
    getDetails: (paymentId) => apiClient.get(`/payments/${paymentId}`),
    confirmPayment: (jobId, upiRef) => apiClient.patch(`/payments/${jobId}/confirm`, { upiRef }),
};


// ─── Rating API ───
export const ratingAPI = {
    submitRating: (data) => apiClient.post('/ratings', data),
    rateWorker: (data) => apiClient.post('/ratings/worker', data),
    rateFarmer: (data) => apiClient.post('/ratings/farmer', data),
    getRatings: (userId) => apiClient.get(`/ratings/user/${userId}`),
};

// ─── Group API ───
export const groupAPI = {
    createGroup: (data) => apiClient.post('/groups', data),
    getMyGroups: (config = {}) => apiClient.get('/groups/my-groups', config),
    getGroupDetails: (groupId) => apiClient.get(`/groups/${groupId}`),
    getGroupJobs: (groupId) => apiClient.get(`/groups/${groupId}/jobs`),
    acceptGroupJob: (data) => apiClient.post('/groups/accept-job', data),
    addMember: (groupId, data) => apiClient.post(`/groups/${groupId}/members`, data),
    addMemberByPhone: (groupId, data) => apiClient.post(`/groups/${groupId}/members/by-phone`, data),
    removeMember: (groupId, workerId) => apiClient.delete(`/groups/${groupId}/members/${workerId}`),
    updateMember: (groupId, workerId, data) => apiClient.patch(`/groups/${groupId}/members/${workerId}`, data),
    updateGroupStatus: (groupId, status) => apiClient.patch(`/groups/${groupId}/status`, { status }),
    getNearbyWorkers: () => apiClient.get('/workers/nearby'),
    getGroupMessages: (groupId) => apiClient.get(`/chats/${groupId}/messages`),
    respondToInvite: (groupId, inviteId, action) => apiClient.post(`/groups/${groupId}/respond-invite`, { inviteId, action }),
    deleteGroup: (groupId) => apiClient.delete(`/groups/${groupId}`),
    exitGroup: (groupId) => apiClient.post(`/groups/${groupId}/exit`),
    getPendingInvites: () => apiClient.get('/groups/pending-invites'),
};

// ─── Worker API (F1) ───
export const workerAPI = {
    getEarnings: () => apiClient.get('/workers/earnings'),
    getNearby:   (params = {}) => apiClient.get('/workers/nearby', { params }),
};

// ─── Upload API (M4) ───
export const uploadAPI = {
    uploadProfilePicture: (formData) => apiClient.post('/upload/profile-picture', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
};

// ─── Dispute API (F2) ───
export const disputeAPI = {
    fileDispute: (data) => apiClient.post('/disputes', data),
    getMyDisputes: () => apiClient.get('/disputes/my'),
    getJobDisputes: (jobId) => apiClient.get(`/disputes/job/${jobId}`),
};

export default apiClient;
