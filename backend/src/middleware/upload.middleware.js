const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Strict whitelist: both MIME prefix AND extension must match
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        // Force safe extension from MIME type — never trust file.originalname extension
        const mimeToExt = {
            'image/jpeg': '.jpg',
            'image/png':  '.png',
            'image/webp': '.webp',
        };
        const safeExt = mimeToExt[file.mimetype] || '.jpg';
        cb(null, 'profile-' + uniqueSuffix + safeExt);
    },
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    // Double-check: both MIME type AND extension must be in whitelist
    const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const extOk  = ALLOWED_EXTENSIONS.includes(ext);

    if (mimeOk && extOk) {
        cb(null, true);
    } else {
        cb(new Error('Only JPG, PNG, or WEBP image files are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
        files: 1,                   // Only one file per request
    },
});

module.exports = upload;
