const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const config = require('../config/env');
const { logger } = require('../middleware/errorHandler');

// Configure Cloudinary if credentials are provided
const isCloudinaryConfigured = !!(config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret);

if (isCloudinaryConfigured) {
    cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
    });
}

const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let fileUrl;

        if (isCloudinaryConfigured) {
            // Upload to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'profile_pictures',
                resource_type: 'image',
            });
            fileUrl = result.secure_url;

            // Delete local file after successful upload to Cloudinary
            fs.unlink(req.file.path, (err) => {
                if (err) logger.error('Failed to delete local temp file', { error: err.message });
            });
        } else {
            // Local fallback
            fileUrl = `${config.apiBaseUrl}/uploads/${req.file.filename}`;
        }

        res.json({
            message: 'File uploaded successfully',
            url: fileUrl,
        });
    } catch (error) {
        logger.error('Upload error', { message: error.message });
        res.status(500).json({ error: 'Failed to upload file' });
    }
};

module.exports = {
    uploadProfilePicture,
};
