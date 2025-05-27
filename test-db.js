const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: false,
    }
};

async function testConnection() {
    try {
        console.log('🔍 嘗試連接到 Azure SQL Database...');
        console.log('伺服器:', config.server);
        console.log('資料庫:', config.database);
        
        const pool = await sql.connect(config);
        console.log('✅ 成功連接到 Azure SQL Database！');
        
        const result = await pool.request().query('SELECT COUNT(*) as count FROM Users');
        console.log('👥 用戶數量:', result.recordset[0].count);
        
        await pool.close();
        console.log('🔐 連接已關閉');
    } catch (error) {
        console.error('❌ 連接失敗:', error.message);
    }
}

testConnection();