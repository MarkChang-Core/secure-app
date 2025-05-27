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

async function updatePasswords() {
    try {
        console.log('🔐 更新資料庫密碼...');
        
        // 生成真正的密碼雜湊
        const adminHash = await bcrypt.hash('SecureAdmin2024!', 12);
        
        const pool = await sql.connect(dbConfig);
        
        // 更新管理員密碼
        await pool.request()
            .input('password_hash', sql.NVarChar, adminHash)
            .query(`
                UPDATE Users 
                SET password_hash = @password_hash 
                WHERE username = 'admin'
            `);
        
        console.log('✅ 管理員密碼已更新');
        
        // 驗證更新
        const result = await pool.request().query(`
            SELECT username, password_hash 
            FROM Users 
            WHERE username = 'admin'
        `);
        
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            const isValid = await bcrypt.compare('SecureAdmin2024!', user.password_hash);
            console.log('✅ 密碼驗證測試:', isValid ? '成功' : '失敗');
        }
        
        await pool.close();
        console.log('🎉 密碼更新完成！');
        
    } catch (error) {
        console.error('❌ 更新失敗:', error);
    }
}

updatePasswords();