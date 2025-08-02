const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Society {
    constructor(data) {
        this.id = data.id || uuidv4();
        this.name = data.name;
        this.registrationNumber = data.registration_number;
        this.societyType = data.society_type;
        this.establishmentDate = data.establishment_date;
        this.address = data.address;
        this.status = data.status || 'pending';
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    // Create a new society
    static async create(societyData) {
        try {
            const societyId = uuidv4();
            const result = await query(
                `INSERT INTO societies (id, name, registration_number, society_type, establishment_date, address, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    societyId,
                    societyData.name,
                    societyData.registrationNumber,
                    societyData.societyType,
                    societyData.establishmentDate,
                    societyData.address,
                    societyData.status || 'pending'
                ]
            );

            return { id: societyId, ...societyData };
        } catch (error) {
            throw error;
        }
    }

    // Find society by ID
    static async findById(id) {
        try {
            const [societies] = await query(
                'SELECT * FROM societies WHERE id = ?',
                [id]
            );

            if (societies.length === 0) {
                return null;
            }

            return new Society(societies[0]);
        } catch (error) {
            throw error;
        }
    }

    // Find society by registration number
    static async findByRegistrationNumber(registrationNumber) {
        try {
            const [societies] = await query(
                'SELECT * FROM societies WHERE registration_number = ?',
                [registrationNumber]
            );

            if (societies.length === 0) {
                return null;
            }

            return new Society(societies[0]);
        } catch (error) {
            throw error;
        }
    }

    // Get all societies with optional filters
    static async findAll(filters = {}) {
        try {
            let sql = 'SELECT * FROM societies WHERE 1=1';
            const params = [];

            if (filters.status) {
                sql += ' AND status = ?';
                params.push(filters.status);
            }

            if (filters.societyType) {
                sql += ' AND society_type = ?';
                params.push(filters.societyType);
            }

            sql += ' ORDER BY created_at DESC';

            const [societies] = await query(sql, params);
            return societies.map(society => new Society(society));
        } catch (error) {
            throw error;
        }
    }

    // Get pending societies
    static async getPending() {
        try {
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

            return societies;
        } catch (error) {
            throw error;
        }
    }

    // Update society status
    static async updateStatus(id, status) {
        try {
            const result = await query(
                'UPDATE societies SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, id]
            );

            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    // Update society information
    async update(updateData) {
        try {
            const allowedFields = ['name', 'society_type', 'address'];
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
            const sql = `UPDATE societies SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            
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

    // Delete society
    static async delete(id) {
        try {
            const result = await query('DELETE FROM societies WHERE id = ?', [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw error;
        }
    }

    // Get society statistics
    static async getStatistics() {
        try {
            const [stats] = await query(`
                SELECT 
                    COUNT(*) as total_societies,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_societies,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_societies,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_societies,
                    COUNT(CASE WHEN society_type = 'credit' THEN 1 END) as credit_societies,
                    COUNT(CASE WHEN society_type = 'consumer' THEN 1 END) as consumer_societies,
                    COUNT(CASE WHEN society_type = 'producer' THEN 1 END) as producer_societies,
                    COUNT(CASE WHEN society_type = 'housing' THEN 1 END) as housing_societies,
                    COUNT(CASE WHEN society_type = 'worker' THEN 1 END) as worker_societies,
                    COUNT(CASE WHEN society_type = 'other' THEN 1 END) as other_societies
                FROM societies
            `);

            return stats[0];
        } catch (error) {
            throw error;
        }
    }

    // Get society with admin details
    static async findByIdWithAdmin(id) {
        try {
            const [societies] = await query(
                `SELECT s.*, u.name as admin_name, u.email as admin_email, u.phone as admin_phone
                 FROM societies s
                 LEFT JOIN users u ON s.id = u.society_id AND u.role = 'society_admin'
                 WHERE s.id = ?`,
                [id]
            );

            if (societies.length === 0) {
                return null;
            }

            return societies[0];
        } catch (error) {
            throw error;
        }
    }

    // Get society documents
    static async getDocuments(societyId) {
        try {
            const [documents] = await query(
                'SELECT * FROM society_documents WHERE society_id = ? ORDER BY uploaded_at DESC',
                [societyId]
            );

            return documents;
        } catch (error) {
            throw error;
        }
    }

    // Add document to society
    static async addDocument(societyId, documentData) {
        try {
            const documentId = uuidv4();
            const result = await query(
                `INSERT INTO society_documents (id, society_id, document_type, file_name, file_path, file_size, mime_type) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    documentId,
                    societyId,
                    documentData.documentType,
                    documentData.fileName,
                    documentData.filePath,
                    documentData.fileSize,
                    documentData.mimeType
                ]
            );

            return { id: documentId, ...documentData };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Society; 