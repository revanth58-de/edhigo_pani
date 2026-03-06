// Admin middleware — validates ADMIN_SECRET header
// This is completely separate from the regular JWT auth system.
// Usage: curl -H "x-admin-secret: your-secret" http://localhost:5000/api/admin/...

const adminAuth = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return res.status(500).json({ error: 'ADMIN_SECRET not configured on server' });
  }

  if (!secret || secret !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing admin secret' });
  }

  next();
};

module.exports = { adminAuth };
