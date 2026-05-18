const config = require('../config/env');
const { logger } = require('../middleware/errorHandler');

const uploadProfilePicture = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // SEC-6 FIX: Never trust req.get('host') — it's attacker-controlled.
        // Use the server-side config value instead.
        const fileUrl = `${config.apiBaseUrl}/uploads/${req.file.filename}`;

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
