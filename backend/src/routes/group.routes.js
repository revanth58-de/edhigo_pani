const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getMyGroups,
  getMyMemberGroups,
  createGroup,
  getGroupDetails,
  getGroupJobs,
  acceptGroupJob,
  addMember,
  addMemberByPhone,
  updateMember,
  removeMember,
  updateGroupStatus,
  deleteGroup,
  respondToGroupInvite,
} = require('../controllers/group.controller');

// All group routes require authentication
router.post('/', authenticate, createGroup);
router.get('/my-groups', authenticate, getMyGroups);          // leader: groups I lead
router.get('/my-member-groups', authenticate, getMyMemberGroups); // worker: groups I belong to
router.get('/:groupId', authenticate, getGroupDetails);
router.get('/:groupId/jobs', authenticate, getGroupJobs);
router.post('/accept-job', authenticate, acceptGroupJob);
router.post('/:groupId/members', authenticate, addMember);
router.post('/:groupId/members/by-phone', authenticate, addMemberByPhone);
router.post('/:groupId/members/:memberId/respond', authenticate, respondToGroupInvite);
router.patch('/:groupId/members/:workerId', authenticate, updateMember);
router.delete('/:groupId/members/:workerId', authenticate, removeMember);
router.patch('/:groupId/status', authenticate, updateGroupStatus);
router.delete('/:groupId', authenticate, deleteGroup);

module.exports = router;
