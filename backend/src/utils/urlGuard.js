const { URL } = require('url');
const config = require('../config/env');

function isValidPhotoUrl(urlStr) {
  if (!urlStr) return true;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Prevent loopback/private addressing to mitigate SSRF
    const privateHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (privateHosts.includes(hostname) || hostname.endsWith('.local')) {
      const selfHost = new URL(config.apiBaseUrl).hostname.toLowerCase();
      if (selfHost !== hostname) {
        return false;
      }
    }

    // Whitelisted image hosting domains
    const selfHost = new URL(config.apiBaseUrl).hostname.toLowerCase();
    const whitelist = [
      selfHost,
      'images.unsplash.com',
      'res.cloudinary.com',
      'firebasestorage.googleapis.com',
    ];

    const isWhitelisted = whitelist.some(domain => {
      return hostname === domain || hostname.endsWith('.' + domain);
    });

    return isWhitelisted;
  } catch (err) {
    return false;
  }
}

module.exports = {
  isValidPhotoUrl,
};
