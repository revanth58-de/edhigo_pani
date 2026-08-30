const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { app } = require('../src/server');
const { createTestUsers, cleanupTestUsers } = require('./helpers');

describe('Profile Picture Upload & Serving API', () => {
  let tokens;
  const testImagePath = path.join(__dirname, 'test-image.png');

  beforeAll(async () => {
    tokens = await createTestUsers();
    // Create dummy image file for testing upload
    fs.writeFileSync(testImagePath, 'fake-image-data-content-123');
  });

  afterAll(async () => {
    await cleanupTestUsers();
    // Delete dummy image file
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    // Clean up uploaded test files
    const uploadDir = path.join(__dirname, '../src/public/uploads');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        if (file.includes('profile-')) {
          fs.unlinkSync(path.join(uploadDir, file));
        }
      }
    }
  });

  it('should upload a profile picture successfully and serve it via static route', async () => {
    const res = await request(app)
      .post('/api/upload/profile-picture')
      .set('Authorization', `Bearer ${tokens.workerToken}`)
      .attach('image', testImagePath);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File uploaded successfully');
    expect(res.body.url).toBeDefined();

    // Verify static serving of uploaded image (fallback to local server url)
    // Extract filename from URL: e.g. http://localhost:5000/uploads/profile-123.png -> /uploads/profile-123.png
    const urlPath = new URL(res.body.url).pathname;
    
    const serveRes = await request(app).get(urlPath);
    expect(serveRes.status).toBe(200);
    const content = serveRes.text || serveRes.body.toString();
    expect(content).toBe('fake-image-data-content-123');
  });

  it('should reject unauthorized uploads', async () => {
    const res = await request(app)
      .post('/api/upload/profile-picture');

    expect(res.status).toBe(401);
  });
});
