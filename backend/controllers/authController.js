const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');
const Society = require('../models/societyModel');
const User = require('../models/userModel');

// Developer login
const developerLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Email and password are required'
            });
        }

        // Find developer user
        const [users] = await query(
            'SELECT * FROM users WHERE email = ? AND role = "developer" AND status = "active"',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Log the login
        await logAuditTrail(user.id, null, 'LOGIN', 'users', user.id, null, {
            email: user.email,
            role: user.role
        }, req.ip, req.get('User-Agent'));

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Developer login error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'An error occurred during login'
        });
    }
};

// Society login
const societyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Email and password are required'
            });
        }

        // Find society admin user
        const [users] = await query(
            `SELECT u.*, s.id as society_id, s.name as society_name, s.status as society_status 
             FROM users u 
             JOIN societies s ON u.society_id = s.id 
             WHERE u.email = ? AND u.role = "society_admin" AND u.status = "active"`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }

        const user = users[0];

        // Check if society is approved
        if (user.society_status !== 'approved') {
            return res.status(403).json({
                error: 'Society not approved',
                message: 'Your society registration is still pending approval'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role,
                societyId: user.society_id
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Log the login
        await logAuditTrail(user.id, user.society_id, 'LOGIN', 'users', user.id, null, {
            email: user.email,
            role: user.role,
            society_id: user.society_id
        }, req.ip, req.get('User-Agent'));

        res.json({
            message: 'Login successful',
            token,
            societyId: user.society_id,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                societyName: user.society_name
            }
        });

    } catch (error) {
        console.error('Society login error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'An error occurred during login'
        });
    }
};

// Society registration
const societyRegister = async (req, res) => {
    try {
        const {
            societyName,
            registrationNumber,
            societyType,
            establishmentDate,
            societyAddress,
            adminName,
            adminEmail,
            adminPhone,
            password
        } = req.body;

        // Validate required fields
        if (!societyName || !registrationNumber || !societyType || !establishmentDate || 
            !societyAddress || !adminName || !adminEmail || !adminPhone || !password) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'All required fields must be provided'
            });
        }

        // Check if registration number already exists
        const [existingSocieties] = await query(
            'SELECT id FROM societies WHERE registration_number = ?',
            [registrationNumber]
        );

        if (existingSocieties.length > 0) {
            return res.status(409).json({
                error: 'Registration number already exists',
                message: 'A society with this registration number is already registered'
            });
        }

        // Check if admin email already exists
        const [existingUsers] = await query(
            'SELECT id FROM users WHERE email = ?',
            [adminEmail]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                error: 'Email already exists',
                message: 'A user with this email is already registered'
            });
        }

        // Validate required files
        if (!req.files || !req.files.registrationCertificate || !req.files.bylaws) {
            return res.status(400).json({
                error: 'Missing required documents',
                message: 'Registration certificate and bylaws are required'
            });
        }

        // Start transaction
        const connection = await query('START TRANSACTION');

        try {
            // Create society
            const societyId = uuidv4();
            await query(
                `INSERT INTO societies (id, name, registration_number, society_type, establishment_date, address, status) 
                 VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
                [societyId, societyName, registrationNumber, societyType, establishmentDate, societyAddress]
            );

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // Create society admin user
            const userId = uuidv4();
            await query(
                `INSERT INTO users (id, email, password, name, phone, role, society_id, status) 
                 VALUES (?, ?, ?, ?, ?, 'society_admin', ?, 'active')`,
                [userId, adminEmail, hashedPassword, adminName, adminPhone, societyId]
            );

            // Save uploaded documents
            const documents = [];

            // Registration certificate
            if (req.files.registrationCertificate) {
                const file = req.files.registrationCertificate[0];
                const documentId = uuidv4();
                await query(
                    `INSERT INTO society_documents (id, society_id, document_type, file_name, file_path, file_size, mime_type) 
                     VALUES (?, ?, 'registration_certificate', ?, ?, ?, ?)`,
                    [documentId, societyId, file.originalname, file.path, file.size, file.mimetype]
                );
                documents.push({ type: 'registration_certificate', fileName: file.originalname });
            }

            // Bylaws
            if (req.files.bylaws) {
                const file = req.files.bylaws[0];
                const documentId = uuidv4();
                await query(
                    `INSERT INTO society_documents (id, society_id, document_type, file_name, file_path, file_size, mime_type) 
                     VALUES (?, ?, 'bylaws', ?, ?, ?, ?)`,
                    [documentId, societyId, file.originalname, file.path, file.size, file.mimetype]
                );
                documents.push({ type: 'bylaws', fileName: file.originalname });
            }

            // Additional documents
            if (req.files.additionalDocs) {
                for (const file of req.files.additionalDocs) {
                    const documentId = uuidv4();
                    await query(
                        `INSERT INTO society_documents (id, society_id, document_type, file_name, file_path, file_size, mime_type) 
                         VALUES (?, ?, 'additional', ?, ?, ?, ?)`,
                        [documentId, societyId, file.originalname, file.path, file.size, file.mimetype]
                    );
                    documents.push({ type: 'additional', fileName: file.originalname });
                }
            }

            // Commit transaction
            await query('COMMIT');

            // Log the registration
            await logAuditTrail(userId, societyId, 'SOCIETY_REGISTRATION', 'societies', societyId, null, {
                society_name: societyName,
                registration_number: registrationNumber,
                admin_email: adminEmail,
                documents_count: documents.length
            }, req.ip, req.get('User-Agent'));

            res.status(201).json({
                message: 'Society registration submitted successfully',
                societyId,
                status: 'pending',
                documents: documents
            });

        } catch (error) {
            // Rollback transaction
            await query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Society registration error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'An error occurred during registration'
        });
    }
};

// Get pending society registrations (developer only)
const getPendingSocieties = async (req, res) => {
    try {
        // Verify developer role (this should be done via middleware in production)
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'developer') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied'
            });
        }

        const [societies] = await query(
            `SELECT s.*, u.name as admin_name, u.email as admin_email, u.phone as admin_phone,
                    COUNT(sd.id) as document_count
             FROM societies s
             LEFT JOIN users u ON s.id = u.society_id AND u.role = 'society_admin'
             LEFT JOIN society_documents sd ON s.id = sd.society_id
             WHERE s.status = 'pending'
             GROUP BY s.id
             ORDER BY s.created_at DESC`
        );

        res.json({
            message: 'Pending societies retrieved successfully',
            societies
        });

    } catch (error) {
        console.error('Get pending societies error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'An error occurred while retrieving pending societies'
        });
    }
};

// Update society approval status (developer only)
const updateSocietyApproval = async (req, res) => {
    try {
        const { societyId } = req.params;
        const { status, reason } = req.body;

        // Validate status
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                message: 'Status must be either "approved" or "rejected"'
            });
        }

        // Verify developer role
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'developer') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied'
            });
        }

        // Update society status
        await query(
            'UPDATE societies SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, societyId]
        );

        // Log the approval/rejection
        await logAuditTrail(decoded.userId, societyId, 'SOCIETY_APPROVAL_UPDATE', 'societies', societyId, null, {
            status,
            reason: reason || null
        }, req.ip, req.get('User-Agent'));

        res.json({
            message: `Society ${status} successfully`,
            societyId,
            status
        });

    } catch (error) {
        console.error('Update society approval error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'An error occurred while updating society approval'
        });
    }
};

// Get society details
const getSocietyDetails = async (req, res) => {
    try {
        const { societyId } = req.params;

        const [societies] = await query(
            `SELECT s.*, u.name as admin_name, u.email as admin_email, u.phone as admin_phone
             FROM societies s
             LEFT JOIN users u ON s.id = u.society_id AND u.role = 'society_admin'
             WHERE s.id = ?`,
            [societyId]
        );

        if (societies.length === 0) {
            return res.status(404).json({
                error: 'Society not found',
                message: 'The requested society does not exist'
            });
        }

        const society = societies[0];

        // Get documents
        const [documents] = await query(
            'SELECT * FROM society_documents WHERE society_id = ? ORDER BY uploaded_at DESC',
            [societyId]
        );

        res.json({
            message: 'Society details retrieved successfully',
            society: {
                ...society,
                documents
            }
        });

    } catch (error) {
        console.error('Get society details error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'An error occurred while retrieving society details'
        });
    }
};

// Logout
const logout = async (req, res) => {
    try {
        // In a real application, you might want to blacklist the token
        // For now, we'll just return a success message
        res.json({
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'An error occurred during logout'
        });
    }
};

// Helper function to log audit trail
const logAuditTrail = async (userId, societyId, action, tableName, recordId, oldValues, newValues, ipAddress, userAgent) => {
    try {
        await query(
            `INSERT INTO audit_logs (id, user_id, society_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), userId, societyId, action, tableName, recordId, 
             oldValues ? JSON.stringify(oldValues) : null, 
             newValues ? JSON.stringify(newValues) : null, 
             ipAddress, userAgent]
        );
    } catch (error) {
        console.error('Audit trail logging error:', error);
        // Don't throw error as this is not critical for the main functionality
    }
};

module.exports = {
    developerLogin,
    societyLogin,
    societyRegister,
    getPendingSocieties,
    updateSocietyApproval,
    getSocietyDetails,
    logout
}; 