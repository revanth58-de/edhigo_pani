const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/admin.middleware');
const {
  getStats, getUsers, updateUser, deleteUser,
  getJobs, updateJob,
  getPayments, updatePayment,
  getAttendance, getRatings, getGroups,
} = require('../controllers/admin.controller');

// All routes protected by admin secret key
router.use(adminAuth);

router.get('/stats', getStats);

router.get('/users', getUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/jobs', getJobs);
router.patch('/jobs/:id', updateJob);

router.get('/payments', getPayments);
router.patch('/payments/:id', updatePayment);

router.get('/attendance', getAttendance);
router.get('/ratings', getRatings);
router.get('/groups', getGroups);

module.exports = router;
