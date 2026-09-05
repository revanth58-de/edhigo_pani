/**
 * QA Agent Read-Only Enforcement Middleware
 *
 * Ensures any automated QA agents or unprivileged automated testing actors
 * cannot perform state-mutating requests (POST, PUT, PATCH, DELETE) against the backend.
 */
const { logger } = require('./errorHandler');

const qaReadOnlyMiddleware = (req, res, next) => {
  const isAgent = req.headers['x-qa-agent'] === 'true' || req.user?.role === 'qa_agent';
  const writeVerbs = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (isAgent && writeVerbs.includes(req.method)) {
    // Exempt read-only authentication token validations if needed
    const isExempt = req.path === '/api/auth/verify-token';
    if (!isExempt) {
      logger.warn('🚨 [SECURITY AUDIT] QA Agent attempted blocked state mutation', {
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        code: 'AGENT_MUTATION_BLOCKED'
      });

      return res.status(405).json({
        success: false,
        error: 'Method Not Allowed: Overnight QA Agent is restricted to read-only queries and cannot mutate state.',
        code: 'AGENT_MUTATION_BLOCKED',
        attemptedAction: `${req.method} ${req.originalUrl}`,
        loggedAt: new Date().toISOString()
      });
    }
  }

  next();
};

module.exports = qaReadOnlyMiddleware;
