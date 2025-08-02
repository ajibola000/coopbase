const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import database connection
const db = require('./backend/config/db');

async function setupDatabase() {
    try {
        console.log('🔧 Setting up CoopBase database...');

        // Test database connection
        await db.query('SELECT 1');
        console.log('✅ Database connection successful');

        // Initialize database tables
        await db.initializeDatabase();
        console.log('✅ Database tables created');

        // Check if developer user already exists
        const [existingDevelopers] = await db.query(
            'SELECT id FROM users WHERE role = "developer"'
        );

        if (existingDevelopers.length > 0) {
            console.log('ℹ️  Developer user already exists');
            return;
        }

        // Create default developer user
        const developerId = uuidv4();
        const hashedPassword = await bcrypt.hash('admin123', 12);

        await db.query(
            `INSERT INTO users (id, email, password, name, phone, role, status) 
             VALUES (?, ?, ?, ?, ?, 'developer', 'active')`,
            [developerId, 'admin@coopbase.com', hashedPassword, 'System Administrator', '+1234567890']
        );

        console.log('✅ Default developer user created');
        console.log('📧 Email: admin@coopbase.com');
        console.log('🔑 Password: admin123');
        console.log('⚠️  Please change the password after first login!');

    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

// Run setup
setupDatabase().then(() => {
    console.log('🎉 CoopBase setup completed successfully!');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
}); 