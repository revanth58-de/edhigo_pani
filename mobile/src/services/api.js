import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
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
    verifyOTP: (phone, otp) => apiClient.post('/auth/verify-otp', { phone, otp }),
    setRole: (role) => apiClient.post('/auth/set-role', { role }),
    updateProfile: (data) => apiClient.put('/auth/profile', data),
    getMe: () => apiClient.get('/auth/me'),
    refreshToken: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
};

// ─── Job API ───
export const jobAPI = {
    createJob: (jobData) => apiClient.post('/jobs', jobData),
    getJobs: (filters) => apiClient.get('/jobs', { params: filters }),
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

export default apiClient;
