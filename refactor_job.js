const fs = require('fs');
const path = require('path');

const srcCode = fs.readFileSync(path.join(__dirname, 'backend/src/controllers/job.controller.js'), 'utf-8');

// The file is too big to Regex safely without capturing everything, so I'll just write a script that slices the text based on function declarations.

const sliceContent = (startStr, endStr) => {
  const startIdx = srcCode.indexOf(startStr);
  let endIdx = srcCode.indexOf(endStr, startIdx);
  if (endIdx === -1) endIdx = srcCode.length;
  return srcCode.slice(startIdx, endIdx);
};

const createJobCode = sliceContent('// Create a new job', '// Get all jobs (with optional filters + pagination)');
const getJobsCode = sliceContent('// Get all jobs (with optional filters + pagination)', '// Update job status');
const updateJobStatusCode = sliceContent('// Update job status', '// GET /api/jobs/my-jobs');
const getMyJobsCode = sliceContent('// GET /api/jobs/my-jobs', '// Cancel/delete a job');
const cancelJobCode = sliceContent('// Cancel/delete a job', '// Get nearby available workers');
const getNearbyWorkersCode = sliceContent('// Get nearby available workers', 'module.exports = {');

const jobCreateContent = `const prisma = require('../config/database');
const { matchWorkers } = require('../services/matchWorkers');
const { logger } = require('../middleware/errorHandler');
const { JobStatus } = require('../config/enums');
const { notifyWorkersNewJob } = require('../services/pushNotification');

${createJobCode}
module.exports = { createJob };
`;

const jobQueryContent = `const prisma = require('../config/database');
const { logger } = require('../middleware/errorHandler');
const { JobStatus } = require('../config/enums');

${getJobsCode}
${getMyJobsCode}
${getNearbyWorkersCode}
module.exports = { getJobs, getJobById, getMyJobs, getWorkerHistory, getWorkerJobs, getNearbyWorkers };
`;

const jobStatusContent = `const prisma = require('../config/database');
const { matchWorkers } = require('../services/matchWorkers');
const { logger } = require('../middleware/errorHandler');
const { JobStatus, GroupStatus } = require('../config/enums');
const {
  notifyFarmerJobAccepted,
  notifyFarmerJobWithdrawn,
  notifyWorkerJobCancelled
} = require('../services/pushNotification');

${updateJobStatusCode}
${cancelJobCode}
module.exports = { updateJobStatus, acceptJob, withdrawJob, cancelJob };
`;

const jobControllerContent = `const { createJob } = require('./job.create');
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
`;

fs.writeFileSync(path.join(__dirname, 'backend/src/controllers/job.create.js'), jobCreateContent);
fs.writeFileSync(path.join(__dirname, 'backend/src/controllers/job.query.js'), jobQueryContent);
fs.writeFileSync(path.join(__dirname, 'backend/src/controllers/job.status.js'), jobStatusContent);
fs.writeFileSync(path.join(__dirname, 'backend/src/controllers/job.controller.js'), jobControllerContent);

console.log('Successfully refactored job.controller.js!');
