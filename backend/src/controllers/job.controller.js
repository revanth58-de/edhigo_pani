const { createJob } = require('./job.create');
const { getJobs, getJobById, getMyJobs, getWorkerHistory, getWorkerJobs, getNearbyWorkers } = require('./job.query');
const { updateJobStatus, acceptJob, withdrawJob, cancelJob } = require('./job.status');

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJobStatus,
  acceptJob,
  withdrawJob,
  cancelJob,
  getMyJobs,
  getWorkerHistory,
  getWorkerJobs,
  getNearbyWorkers,
};
