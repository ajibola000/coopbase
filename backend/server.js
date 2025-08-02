const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');

// Import database connection
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/society-register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/society-register.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        message: `The requested endpoint ${req.originalUrl} does not exist`
    });
});

// 404 handler for frontend routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    // Default error
    let error = {
        message: 'Internal Server Error',
        status: 500
    };

    // Handle specific error types
    if (err.name === 'ValidationError') {
        error.message = 'Validation Error';
        error.status = 400;
        error.details = err.details;
    } else if (err.name === 'UnauthorizedError') {
        error.message = 'Unauthorized';
        error.status = 401;
    } else if (err.name === 'ForbiddenError') {
        error.message = 'Forbidden';
        error.status = 403;
    } else if (err.name === 'NotFoundError') {
        error.message = 'Not Found';
        error.status = 404;
    } else if (err.code === 'ER_DUP_ENTRY') {
        error.message = 'Duplicate entry';
        error.status = 409;
    }

    res.status(error.status).json({
        error: error.message,
        ...(error.details && { details: error.details }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await db.query('SELECT 1');
        console.log('✅ Database connected successfully');

        // Initialize database tables
        await db.initializeDatabase();
        console.log('✅ Database tables initialized');

        app.listen(PORT, () => {
            console.log(`🚀 CoopBase server running on port ${PORT}`);
            console.log(`📱 Frontend available at http://localhost:${PORT}`);
            console.log(`🔧 API available at http://localhost:${PORT}/api`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

startServer(); 