const express = require('express');
const router = express.Router();
const { adminAuth, adminRateLimiter, adminLogin } = require('../middleware/admin.middleware');
const {
  getStats, invalidateStats, getActivity,
  getUsers, updateUser, deleteUser, suspendUser,
  getJobs, updateJob,
  getPayments, updatePayment,
  getAttendance, getRatings, getGroups,
} = require('../controllers/admin.controller');

// FIX #1: Public login endpoint — rate-limited but no auth guard.
// Returns a 2-hour JWT. All subsequent routes require that JWT.
router.post('/auth/login', adminRateLimiter, adminLogin);

// Rate-limit BEFORE auth check — stops brute-force before any comparison runs
router.use(adminRateLimiter);
// All routes protected by JWT (or legacy x-admin-secret header during transition)
router.use(adminAuth);


router.get('/stats', getStats);
router.post('/stats/invalidate', invalidateStats);
router.get('/stats/activity', getActivity);


router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.patch('/users/:id/suspend', suspendUser);  // A3: toggle suspend/reinstate
router.delete('/users/:id', deleteUser);           // S4: now soft-deletes

router.get('/jobs', getJobs);
router.patch('/jobs/:id', updateJob);

router.get('/payments', getPayments);
router.patch('/payments/:id', updatePayment);

router.get('/attendance', getAttendance);
router.get('/ratings', getRatings);
router.get('/groups', getGroups);

module.exports = router;
