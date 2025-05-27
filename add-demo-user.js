const sql = require('mssql');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: false,
    }
};

async function addDemoUser() {
    try {
        console.log('👤 添加演示用戶...');
        
        const demoHash = await bcrypt.hash('Demo123!', 12);
        const pool = await sql.connect(dbConfig);
        
        // 檢查是否已存在
        const existing = await pool.request()
            .input('username', sql.NVarChar, 'demo')
            .query('SELECT COUNT(*) as count FROM Users WHERE username = @username');
        
        if (existing.recordset[0].count === 0) {
            // 插入演示用戶
            await pool.request()
                .input('username', sql.NVarChar, 'demo')
                .input('email', sql.NVarChar, 'demo@example.com')
                .input('password_hash', sql.NVarChar, demoHash)
                .input('role', sql.NVarChar, 'user')
                .query(`
                    INSERT INTO Users (username, email, password_hash, role)
                    VALUES (@username, @email, @password_hash, @role)
                `);
            
            console.log('✅ 演示用戶已添加');
        } else {
            console.log('ℹ️ 演示用戶已存在');
        }
        
        await pool.close();
        console.log('🎉 完成！');
        
    } catch (error) {
        console.error('❌ 添加失敗:', error);
    }
}

addDemoUser();