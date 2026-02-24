import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true', // Required for localtunnel to skip interstitial page
    },
    timeout: 15000,
});

// Set auth token for authenticated requests
export const setAuthToken = (token) => {
    if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete apiClient.defaults.headers.common['Authorization'];
    }
};

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
    getJob: (jobId) => apiClient.get(`/jobs/${jobId}`),
    updateStatus: (jobId, status) => apiClient.put(`/jobs/${jobId}/status`, { status }),
    acceptJob: (jobId, workerId) => apiClient.post(`/jobs/${jobId}/accept`, { workerId }),
    cancelJob: (jobId) => apiClient.delete(`/jobs/${jobId}`),
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
    getGroupDetails: (groupId) => apiClient.get(`/groups/${groupId}`),
    getGroupJobs: (groupId) => apiClient.get(`/groups/${groupId}/jobs`),
    acceptGroupJob: (data) => apiClient.post('/groups/accept-job', data),
    addMember: (groupId, workerId) => apiClient.post(`/groups/${groupId}/members`, { workerId }),
};

// Interceptor to handle 401 Unauthorized errors (token expiration)
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and it's not a retry or a login/refresh request
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes('/auth/')
        ) {
            originalRequest._retry = true;

            try {
                // We need to import the store dynamically to avoid circular dependency
                // Alternatively, we can read from AsyncStorage directly
                const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
                const raw = await AsyncStorage.getItem('edhigo_auth');
                const saved = raw ? JSON.parse(raw) : null;

                if (saved?.refreshToken) {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken: saved.refreshToken
                    });

                    const { accessToken } = response.data;

                    // Update header and retry
                    setAuthToken(accessToken);
                    originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

                    // Also need to update the store (this is tricky with circular deps)
                    // We'll let the user re-login if this fails, or find a better way to sync

                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // If refresh fails, clear auth (handled by the app state usually)
                console.error('Token refresh failed:', refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
