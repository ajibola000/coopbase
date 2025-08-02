const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class User {
    constructor(data) {
        this.id = data.id || uuidv4();
        this.email = data.email;
        this.password = data.password;
        this.name = data.name;
        this.phone = data.phone;
        this.role = data.role;
        this.societyId = data.society_id;
        this.status = data.status || 'active';
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    // Create a new user
    static async create(userData) {
        try {
            const userId = uuidv4();
            
            // Hash password if provided
            let hashedPassword = null;
            if (userData.password) {
                hashedPassword = await bcrypt.hash(userData.password, 12);
            }

            const result = await query(
                `INSERT INTO users (id, email, password, name, phone, role, society_id, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    userData.email,
                    hashedPassword,
                    userData.name,
                    userData.phone,
                    userData.role,
                    userData.societyId || null,
                    userData.status || 'active'
                ]
            );

            return { id: userId, ...userData, password: undefined };
        } catch (error) {
            throw error;
        }
    }

    // Find user by ID
    static async findById(id) {
        try {
            const [users] = await query(
                'SELECT * FROM users WHERE id = ?',
                [id]
            );

            if (users.length === 0) {
                return null;
            }

            return new User(users[0]);
        } catch (error) {
            throw error;
        }
    }

    // Find user by email
    static async findByEmail(email) {
        try {
            const [users] = await query(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                return null;
            }

            return new User(users[0]);
        } catch (error) {
            throw error;
        }
    }

    // Find user by email and role
    static async findByEmailAndRole(email, role) {
        try {
            const [users] = await query(
                'SELECT * FROM users WHERE email = ? AND role = ?',
                [email, role]
            );

            if (users.length === 0) {
                return null;
            }

            return new User(users[0]);
        } catch (error) {
            throw error;
        }
    }

    // Find society admin by society ID
    static async findSocietyAdmin(societyId) {
        try {
            const [users] = await query(
                'SELECT * FROM users WHERE society_id = ? AND role = "society_admin"',
                [societyId]
            );

            if (users.length === 0) {
                return null;
            }

            return new User(users[0]);
        } catch (error) {
            throw error;
        }
    }

    // Get all users with optional filters
    static async findAll(filters = {}) {
        try {
            let sql = 'SELECT * FROM users WHERE 1=1';
            const params = [];

            if (filters.role) {
                sql += ' AND role = ?';
                params.push(filters.role);
            }

            if (filters.societyId) {
                sql += ' AND society_id = ?';
                params.push(filters.societyId);
            }

            if (filters.status) {
                sql += ' AND status = ?';
                params.push(filters.status);
            }

            sql += ' ORDER BY created_at DESC';

            const [users] = await query(sql, params);
            return users.map(user => new User(user));
        } catch (error) {
            throw error;
        }
    }

    // Update user information
    async update(updateData) {
        try {
            const allowedFields = ['name', 'phone', 'status'];
            const updates = [];
            const values = [];

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    updates.push(`${key} = ?`);
                    values.push(value);
                }
            }

            if (updates.length === 0) {
                return false;
            }

            values.push(this.id);
            const sql = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            
            const result = await query(sql, values);
            
            if (result.affectedRows > 0) {
                // Update local instance
                Object.assign(this, updateData);
                return true;
            }

            return false;
        } catch (error) {
            throw error;
        }
    }

    // Update user password
    static async updatePassword(userId, newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            const result = await query(
                'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [hashedPassword, userId]
            );

            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    // Verify password
    async verifyPassword(password) {
        try {
            return await bcrypt.compare(password, this.password);
        } catch (error) {
            throw error;
        }
    }

    // Delete user
    static async delete(id) {
        try {
            const result = await query('DELETE FROM users WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    // Get user statistics
    static async getStatistics() {
        try {
            const [stats] = await query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN role = 'developer' THEN 1 END) as developer_users,
                    COUNT(CASE WHEN role = 'society_admin' THEN 1 END) as society_admin_users,
                    COUNT(CASE WHEN role = 'member' THEN 1 END) as member_users,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
                    COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_users
                FROM users
            `);

            return stats[0];
        } catch (error) {
            throw error;
        }
    }

    // Get users by society
    static async getBySociety(societyId) {
        try {
            const [users] = await query(
                'SELECT * FROM users WHERE society_id = ? ORDER BY created_at DESC',
                [societyId]
            );

            return users.map(user => new User(user));
        } catch (error) {
            throw error;
        }
    }

    // Check if email exists
    static async emailExists(email) {
        try {
            const [users] = await query(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            return users.length > 0;
        } catch (error) {
            throw error;
        }
    }

    // Get user with society details
    static async findByIdWithSociety(id) {
        try {
            const [users] = await query(
                `SELECT u.*, s.name as society_name, s.status as society_status 
                 FROM users u
                 LEFT JOIN societies s ON u.society_id = s.id
                 WHERE u.id = ?`,
                [id]
            );

            if (users.length === 0) {
                return null;
            }

            return users[0];
        } catch (error) {
            throw error;
        }
    }

    // Create developer user (for initial setup)
    static async createDeveloper(developerData) {
        try {
            // Check if developer already exists
            const existingDeveloper = await this.findByEmailAndRole(developerData.email, 'developer');
            if (existingDeveloper) {
                throw new Error('Developer user already exists');
            }

            return await this.create({
                ...developerData,
                role: 'developer',
                status: 'active'
            });
        } catch (error) {
            throw error;
        }
    }

    // Create society admin user
    static async createSocietyAdmin(adminData, societyId) {
        try {
            // Check if email already exists
            const existingUser = await this.findByEmail(adminData.email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            return await this.create({
                ...adminData,
                role: 'society_admin',
                societyId,
                status: 'active'
            });
        } catch (error) {
            throw error;
        }
    }

    // Get user permissions (for future use)
    getPermissions() {
        const permissions = {
            developer: ['manage_societies', 'approve_registrations', 'view_all_data', 'system_admin'],
            society_admin: ['manage_society', 'manage_members', 'manage_services', 'view_society_data'],
            member: ['view_own_data', 'make_transactions']
        };

        return permissions[this.role] || [];
    }

    // Check if user has specific permission
    hasPermission(permission) {
        return this.getPermissions().includes(permission);
    }
}

module.exports = User; 