const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'coopbase',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection function
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connection successful');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Initialize database tables
const initializeDatabase = async () => {
    try {
        // Create societies table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS societies (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                registration_number VARCHAR(100) UNIQUE NOT NULL,
                society_type ENUM('credit', 'consumer', 'producer', 'housing', 'worker', 'other') NOT NULL,
                establishment_date DATE NOT NULL,
                address TEXT NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create users table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                role ENUM('developer', 'society_admin', 'member') NOT NULL,
                society_id VARCHAR(36),
                status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
            )
        `);

        // Create society_documents table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS society_documents (
                id VARCHAR(36) PRIMARY KEY,
                society_id VARCHAR(36) NOT NULL,
                document_type ENUM('registration_certificate', 'bylaws', 'additional') NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size INT NOT NULL,
                mime_type VARCHAR(100) NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
            )
        `);

        // Create services table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS services (
                id VARCHAR(36) PRIMARY KEY,
                society_id VARCHAR(36) NOT NULL,
                name VARCHAR(255) NOT NULL,
                type ENUM('savings', 'share_capital', 'monthly_deduction', 'loan', 'other') NOT NULL,
                description TEXT,
                interest_rate DECIMAL(5,2) DEFAULT 0.00,
                minimum_amount DECIMAL(10,2) DEFAULT 0.00,
                maximum_amount DECIMAL(10,2) DEFAULT 0.00,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
            )
        `);

        // Create members table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS members (
                id VARCHAR(36) PRIMARY KEY,
                society_id VARCHAR(36) NOT NULL,
                member_number VARCHAR(50) UNIQUE NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(20),
                address TEXT,
                date_of_birth DATE,
                join_date DATE NOT NULL,
                status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
            )
        `);

        // Create transactions table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS transactions (
                id VARCHAR(36) PRIMARY KEY,
                society_id VARCHAR(36) NOT NULL,
                member_id VARCHAR(36),
                service_id VARCHAR(36),
                transaction_type ENUM('deposit', 'withdrawal', 'transfer', 'fee', 'interest') NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                balance_before DECIMAL(10,2) NOT NULL,
                balance_after DECIMAL(10,2) NOT NULL,
                description TEXT,
                reference_number VARCHAR(100),
                status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE,
                FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
            )
        `);

        // Create audit_logs table
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36),
                society_id VARCHAR(36),
                action VARCHAR(100) NOT NULL,
                table_name VARCHAR(50),
                record_id VARCHAR(36),
                old_values JSON,
                new_values JSON,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Database tables initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
};

// Export pool and utility functions
module.exports = {
    pool,
    query: (sql, params) => pool.execute(sql, params),
    testConnection,
    initializeDatabase
}; 