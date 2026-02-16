const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createGroup,
  getGroupDetails,
  getGroupJobs,
  acceptGroupJob,
  addMember,
} = require('../controllers/group.controller');

// All group routes require authentication
router.post('/', authenticate, createGroup);
router.get('/:groupId', authenticate, getGroupDetails);
router.get('/:groupId/jobs', authenticate, getGroupJobs);
router.post('/accept-job', authenticate, acceptGroupJob);
router.post('/:groupId/members', authenticate, addMember);

module.exports = router;
