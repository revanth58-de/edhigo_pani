/**
 * urlGuard.test.js
 * Unit tests for urlGuard utility.
 */
const { isValidPhotoUrl } = require('../src/utils/urlGuard');

describe('isValidPhotoUrl', () => {
  test('✅ Should allow null or empty values (behaves as optional field)', () => {
    expect(isValidPhotoUrl(null)).toBe(true);
    expect(isValidPhotoUrl(undefined)).toBe(true);
    expect(isValidPhotoUrl('')).toBe(true);
  });

  test('✅ Should allow whitelisted external image hosts', () => {
    expect(isValidPhotoUrl('https://images.unsplash.com/photo-12345')).toBe(true);
    expect(isValidPhotoUrl('https://res.cloudinary.com/demo/image/upload/sample.jpg')).toBe(true);
    expect(isValidPhotoUrl('https://firebasestorage.googleapis.com/v0/b/bucket/o/image.png')).toBe(true);
  });

  test('❌ Should reject non-HTTP(S) protocol schemes to prevent directory traversals/local read exploits', () => {
    expect(isValidPhotoUrl('file:///etc/passwd')).toBe(false);
    expect(isValidPhotoUrl('gopher://127.0.0.1:70')).toBe(false);
    expect(isValidPhotoUrl('ftp://example.com/image.png')).toBe(false);
  });

  test('❌ Should reject loopback addresses and private networks', () => {
    const config = require('../src/config/env');
    const originalApiBaseUrl = config.apiBaseUrl;
    config.apiBaseUrl = 'https://example.com/api';
    try {
      expect(isValidPhotoUrl('http://127.0.0.1/image.png')).toBe(false);
      expect(isValidPhotoUrl('http://localhost/image.png')).toBe(false);
      expect(isValidPhotoUrl('http://[::1]/image.png')).toBe(false);
      expect(isValidPhotoUrl('http://0.0.0.0/image.png')).toBe(false);
      expect(isValidPhotoUrl('http://127.0.0.1.nip.io/image.png')).toBe(false);
    } finally {
      config.apiBaseUrl = originalApiBaseUrl;
    }
  });

  test('❌ Should reject other non-whitelisted domains (potential SSRF targets)', () => {
    expect(isValidPhotoUrl('https://example.com/malicious-image.png')).toBe(false);
    expect(isValidPhotoUrl('https://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(isValidPhotoUrl('https://google.com/logo.png')).toBe(false);
  });
});
