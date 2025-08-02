const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const authController = require('../controllers/authController');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = process.env.UPLOAD_PATH || './uploads';
        const societyPath = path.join(uploadPath, 'societies');
        
        // Create directories if they don't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        if (!fs.existsSync(societyPath)) {
            fs.mkdirSync(societyPath, { recursive: true });
        }
        
        cb(null, societyPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = {
        'registration_certificate': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
        'bylaws': ['application/pdf'],
        'additional_docs': ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    };
    
    const fieldName = file.fieldname;
    const allowedMimeTypes = allowedTypes[fieldName] || allowedTypes['additional_docs'];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type for ${fieldName}. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
        files: 5 // Maximum 5 files per request
    }
});

// Developer login route
router.post('/developer/login', authController.developerLogin);

// Society login route
router.post('/society/login', authController.societyLogin);

// Society registration route with file uploads
router.post('/society/register', 
    upload.fields([
        { name: 'registrationCertificate', maxCount: 1 },
        { name: 'bylaws', maxCount: 1 },
        { name: 'additionalDocs', maxCount: 3 }
    ]),
    authController.societyRegister
);

// Get pending society registrations (developer only)
router.get('/pending-societies', authController.getPendingSocieties);

// Approve/reject society registration (developer only)
router.put('/society/:societyId/approval', authController.updateSocietyApproval);

// Get society registration details
router.get('/society/:societyId', authController.getSocietyDetails);

// Logout route
router.post('/logout', authController.logout);

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                message: 'File size exceeds the maximum allowed limit'
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too many files',
                message: 'Number of files exceeds the maximum allowed limit'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: 'Unexpected file field',
                message: 'Unexpected file field in the request'
            });
        }
    }
    
    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
            error: 'Invalid file type',
            message: error.message
        });
    }
    
    next(error);
});

module.exports = router; 